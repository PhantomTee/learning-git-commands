#!/usr/bin/env python3
"""
Deploy the ChainTales contract to Genlayer.

Requirements:
  pip install genlayer

Usage:
  python deploy.py [--network localnet|testnet]
"""

import argparse
import json
import time
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--network", default="localnet", choices=["localnet", "testnet"])
    args = parser.parse_args()

    contract_path = Path(__file__).parent.parent / "contracts" / "game.py"
    if not contract_path.exists():
        raise FileNotFoundError(f"Contract not found: {contract_path}")

    print(f"Deploying ChainTales to {args.network}…")
    print(f"Contract: {contract_path}")
    print()

    # ──────────────────────────────────────────────────────────────────────────
    # The genlayer Python SDK is still maturing; this script shows the intent.
    # Actual deployment uses the CLI or JS SDK until the Python deploy SDK ships.
    #
    # CLI equivalent:
    #   genlayer deploy contracts/game.py --network localnet
    #
    # JS SDK equivalent (from the boilerplate):
    #   const hash = await client.deployContract({
    #     code: fs.readFileSync("contracts/game.py", "utf8"),
    #     args: [],
    #   });
    #   const receipt = await client.waitForTransactionReceipt({ hash, status: "FINALIZED" });
    #   console.log("Contract address:", receipt.contractAddress);
    # ──────────────────────────────────────────────────────────────────────────

    print("To deploy via the Genlayer JS SDK, run:")
    print()
    print("  cd frontend")
    print("  node -e \"")
    print("    const { createClient, createAccount } = require('genlayer-js');")
    print("    const { localnet } = require('genlayer-js/chains');")
    print("    const fs = require('fs');")
    print("    const client = createClient({ chain: localnet });")
    print("    const account = createAccount();")
    print("    const code = fs.readFileSync('../contracts/game.py', 'utf8');")
    print("    client.deployContract({ code, args: [], account })")
    print("      .then(hash => client.waitForTransactionReceipt({ hash, status: 'FINALIZED' }))")
    print("      .then(r => console.log('Contract address:', r.contractAddress));")
    print("  \"")
    print()
    print("Then set NEXT_PUBLIC_CONTRACT_ADDRESS=<address> in frontend/.env.local")


if __name__ == "__main__":
    main()
