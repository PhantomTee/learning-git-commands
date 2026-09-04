#!/usr/bin/env node
/**
 * Deploy contracts/game.py to Genlayer studionet.
 * Generates a fresh key, funds it via sim_fundAccount, deploys, patches address.
 *
 * Usage (from repo root):
 *   node deploy/deploy-studionet.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dir  = dirname(fileURLToPath(import.meta.url));
const root   = resolve(__dir, "..");
const req    = createRequire(join(root, "frontend", "package.json"));

const { createClient } = req("genlayer-js");
const { studionet }        = req("genlayer-js/chains");
const { TransactionStatus } = req("genlayer-js/types");

const { loadOrCreateDeployer, KEY_PATH } = await import("./keystore.mjs");

const RPC = "https://studio.genlayer.com/api";

async function rpc(method, params, rawBody) {
  const body = rawBody ?? JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  const res  = await fetch(RPC, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message}`);
  return json.result;
}

// ── 1. Persistent deployer key ────────────────────────────────────────────────────
// Persistent key: a throwaway one made the deployed contract's owner
// unreachable, since __init__ records the deployer as owner.
const { account, created } = loadOrCreateDeployer();
if (created) {
  console.log(`Created a new deployer key at ${KEY_PATH} (gitignored — back it up).`);
}
console.log(`Deployer: ${account.address}`);

// ── 2. Fund via studionet sim_fundAccount (1000 GEN) ─────────────────────────
console.log("Funding account via sim_fundAccount…");
// Amount must be a plain JSON integer (not hex, not quoted) — build raw JSON to avoid JS float precision loss
const fundBody = `{"jsonrpc":"2.0","id":1,"method":"sim_fundAccount","params":["${account.address}",1000000000000000000000]}`;
await rpc("sim_fundAccount", null, fundBody);
const balance = await rpc("eth_getBalance", [account.address, "latest"]);
console.log(`Balance:  ${(parseInt(balance, 16) / 1e18).toFixed(0)} GEN ✓`);

// ── 3. Deploy ─────────────────────────────────────────────────────────────────
const code   = readFileSync(resolve(root, "contracts/game.py"), "utf8");
const client = createClient({ chain: studionet, account });

console.log("\nDeploying contract…");
const txHash = await client.deployContract({ code, args: [] });
console.log(`TX:       ${txHash}`);
console.log("Waiting for FINALIZED (1–4 min)…");

const receipt = await client.waitForTransactionReceipt({
  hash:     txHash,
  status:   TransactionStatus.FINALIZED,
  retries:  120,
  interval: 3000,
});

const address = receipt?.data?.contract_address ?? receipt?.contractAddress;
if (!address) {
  console.error("Could not read contract address from receipt:");
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
}
console.log(`\nContract: ${address}`);

// ── 4. Patch CONTRACT_ADDRESS in genlayer-server.ts ───────────────────────────
const serverTs = resolve(root, "frontend/src/lib/genlayer-server.ts");
const src      = readFileSync(serverTs, "utf8");
const patched  = src.replace(
  /export const CONTRACT_ADDRESS = "0x[0-9a-fA-F]+" as `0x\$\{string\}`;/,
  `export const CONTRACT_ADDRESS = "${address}" as \`0x\${string}\`;`,
);
if (patched === src) {
  console.warn("Warning: could not auto-patch. Set manually:");
  console.warn(`  CONTRACT_ADDRESS = "${address}"`);
} else {
  writeFileSync(serverTs, patched, "utf8");
  console.log("Patched  frontend/src/lib/genlayer-server.ts ✓");
}

console.log("\nNext: cd frontend && npx vercel deploy --prod --scope remotehealthapps-projects");
