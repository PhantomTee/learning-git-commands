"use client";

/**
 * Client half of the Convex mutation authentication.
 *
 * Convex mutations used to accept an address as a plain argument, so anyone
 * with the public deployment URL could write chat and activity as any wallet.
 * They now require proof, and this produces it: a `personal_sign` over a
 * statement naming the action, the address and a timestamp.
 *
 * The statement must match convex/auth.ts exactly — any drift and every write
 * is rejected.
 */

export interface SignedProof {
  timestamp: number;
  signature: string;
}

function statementFor(action: string, address: string, timestamp: number): string {
  return [
    "ChainTales",
    `action: ${action}`,
    `address: ${address.toLowerCase()}`,
    `timestamp: ${timestamp}`,
  ].join("\n");
}

/**
 * Asks the wallet to authorise one action.
 *
 * The activity feed is cosmetic, so callers should treat a rejection as
 * "skip the feed entry", never as "the on-chain action failed" — the
 * transaction has already happened by the time this runs.
 */
export async function signActivity(action: string, address: string): Promise<SignedProof> {
  const provider = (window as unknown as { ethereum?: {
    request: (a: { method: string; params?: unknown[] }) => Promise<unknown>
  } }).ethereum;
  if (!provider) throw new Error("No wallet available to sign with.");

  const timestamp = Date.now();
  const signature = (await provider.request({
    method: "personal_sign",
    params: [statementFor(action, address, timestamp), address],
  })) as string;

  return { timestamp, signature };
}
