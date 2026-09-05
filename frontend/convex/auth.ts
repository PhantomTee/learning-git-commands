import { verifyMessage } from 'viem'

/**
 * Wallet-signature authentication for Convex mutations.
 *
 * Every write here used to take `address` as a plain argument and trust it, so
 * anyone holding the public deployment URL could post chat, presence and
 * activity as any wallet in the game. Nothing on-chain was at risk — the
 * contract is the authority for gameplay — but the social layer was entirely
 * forgeable.
 *
 * Callers now sign a short statement with the wallet they claim to be, and the
 * mutation recovers the signer. The statement includes the action and a
 * timestamp so a captured signature cannot be replayed indefinitely or reused
 * for a different action.
 */

/** How long a signature stays usable. Long enough for a slow wallet prompt. */
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000

export function statementFor(action: string, address: string, timestamp: number): string {
  return [
    'ChainTales',
    `action: ${action}`,
    `address: ${address.toLowerCase()}`,
    `timestamp: ${timestamp}`,
  ].join('\n')
}

export interface SignedArgs {
  address: string
  timestamp: number
  signature: string
}

/**
 * Throws unless `signature` proves the holder of `address` authorised `action`.
 * Returns the verified, lowercased address to use as the record key.
 */
export async function requireSigner(action: string, args: SignedArgs): Promise<string> {
  const age = Date.now() - args.timestamp
  if (!Number.isFinite(args.timestamp) || age > MAX_SIGNATURE_AGE_MS || age < -60_000) {
    throw new Error('Signature expired — try again.')
  }

  let valid = false
  try {
    valid = await verifyMessage({
      address: args.address as `0x${string}`,
      message: statementFor(action, args.address, args.timestamp),
      signature: args.signature as `0x${string}`,
    })
  } catch {
    valid = false
  }

  if (!valid) throw new Error('Signature does not match the claimed address.')
  return args.address.toLowerCase()
}
