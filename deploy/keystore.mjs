/**
 * Persistent deployer key.
 *
 * deploy-studionet.mjs used to call generatePrivateKey() inline and never store
 * the result. Since ChainTales.__init__ sets `self.owner = gl.message.sender_address`,
 * that handed ownership of every deployed contract to a key that stopped
 * existing when the process exited — permanently disabling withdraw_protocol,
 * admin_mint_nft and transfer_ownership.
 *
 * The key lives in deploy/.deployer.key, which is gitignored. It is a real
 * credential: anything the contract grants its owner is available to whoever
 * holds it. Do not commit it, paste it, or send it to anyone.
 */

import { existsSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const req = createRequire(join(root, "frontend", "package.json"));

const { createAccount, generatePrivateKey } = req("genlayer-js");

export const KEY_PATH = resolve(__dir, ".deployer.key");

/**
 * Load the deployer key, creating one on first use.
 * Returns { account, created } — never the key itself.
 */
export function loadOrCreateDeployer() {
  if (existsSync(KEY_PATH)) {
    const pk = readFileSync(KEY_PATH, "utf8").trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
      throw new Error(
        `${KEY_PATH} does not contain a 0x-prefixed 32-byte hex key. ` +
          `Delete it to generate a fresh one, or restore the correct key.`,
      );
    }
    return { account: createAccount(pk), created: false };
  }

  const pk = generatePrivateKey();
  writeFileSync(KEY_PATH, pk + "\n", { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(KEY_PATH, 0o600);
  } catch {
    /* best-effort on Windows */
  }
  return { account: createAccount(pk), created: true };
}
