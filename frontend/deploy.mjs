/**
 * Deploy ChainTales to Genlayer studionet.
 *
 * Usage:
 *   cd frontend
 *   node deploy.mjs
 *
 * Optional — supply a funded private key to skip auto-generated account:
 *   GENLAYER_PRIVATE_KEY=0x... node ../deploy/deploy.mjs
 */

import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function deploy() {
  const privateKey =
    process.env.GENLAYER_PRIVATE_KEY ?? generatePrivateKey();

  const account = createAccount(privateKey);
  console.log("Deployer address:", account.address);
  if (!process.env.GENLAYER_PRIVATE_KEY) {
    console.log("Generated private key (save this to reuse the account):");
    console.log(" ", privateKey);
  }

  const client = createClient({ chain: studionet, account });

  // studionet is a simulator — sim_fundAccount is an open RPC method
  console.log("Funding account via sim_fundAccount…");
  await client.request({
    method: "sim_fundAccount",
    params: [account.address, "0x3635c9adc5dea00000"], // 1000 GEN in hex wei
  }).catch(() => {});
  const balance = await client.getBalance({ address: account.address });
  console.log("Account balance:", balance.toString(), "wei");

  const code = readFileSync(
    join(__dirname, "../contracts/game.py"),
    "utf8"
  );

  console.log("\nDeploying ChainTales to studionet…");
  const hash = await client.deployContract({ code, args: [], account });
  console.log("Transaction hash:", hash);

  console.log("Waiting for consensus (up to 5 minutes)…");
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: "ACCEPTED",
    retries: 100,
    interval: 3000,
  });

  const address = receipt.data?.contract_address ?? receipt.to_address ?? receipt.contractAddress;
  console.log("\n✓ Contract deployed:", address);
  console.log("\nSet in frontend/.env.local:");
  console.log("  NEXT_PUBLIC_CONTRACT_ADDRESS=" + address);
}

deploy().catch((err) => {
  console.error("Deployment failed:", err.message ?? err);
  process.exit(1);
});
