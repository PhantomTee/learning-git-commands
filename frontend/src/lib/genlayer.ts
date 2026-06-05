"use client";

export * from "./genlayer-server";

import { createClient, abi } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus, ExecutionResult } from "genlayer-js/types";
import { CONTRACT_ADDRESS, readClient, GeneratedScenario } from "./genlayer-server";

export function createWriteClient(address: `0x${string}`) {
  return createClient({
    chain: studionet,
    account: address,
    provider: typeof window !== "undefined" ? (window as any).ethereum : undefined,
  });
}

export function normaliseError(err: any): Error {
  const msg: string = err?.message ?? err?.toString() ?? "Unknown error";
  if (msg.includes("message channel closed") || msg.includes("asynchronous response")) {
    return new Error("Wallet connection dropped — please try the action again.");
  }
  if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("4001")) {
    return new Error("Transaction rejected in wallet.");
  }
  return err instanceof Error ? err : new Error(msg);
}

export async function createCharacter(
  writeClient: any,
  name: string,
  gender: "male" | "female" | "other",
  age: number
) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_character",
    args: [name, gender, age],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function createChapter(
  writeClient: any,
  title: string,
  scenario: string,
  winCondition: string,
  difficulty: number,
  pricePerAttemptWei: bigint
) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_chapter",
    args: [title, scenario, winCondition, difficulty, pricePerAttemptWei],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function submitAction(
  writeClient: any,
  chapterId: number,
  action: string,
  priceWei: bigint
) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "submit_action",
    args: [chapterId, action],
    value: priceWei,
  }) as unknown as Promise<`0x${string}`>;
}

export async function closeChapter(writeClient: any, chapterId: number) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "close_chapter",
    args: [chapterId],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function claimPrize(writeClient: any, chapterId: number) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "claim_prize",
    args: [chapterId],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function withdrawCreator(writeClient: any) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "withdraw_creator",
    args: [],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function readLeaderResult(txHash: string): Promise<unknown> {
  try {
    const tx = await (readClient as any).request({
      method: "eth_getTransactionByHash",
      params: [txHash],
    });
    const encoded: string | undefined = tx?.consensus_data?.leader_receipt?.[0]?.result;
    if (!encoded) return null;
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    const decoded = abi.calldata.decode(bytes.slice(1));
    if (typeof decoded === "bigint") return Number(decoded);
    if (decoded instanceof Map) {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of decoded as Map<string, unknown>)
        obj[String(k)] = typeof v === "bigint" ? Number(v) : v;
      return obj;
    }
    return decoded;
  } catch { return null; }
}

export async function generateScenario(writeClient: any, onHash?: (hash: string) => void): Promise<GeneratedScenario> {
  const txHash = await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "generate_scenario",
    args: [],
    value: BigInt("10000000000000000000"), // 10 GEN in wei
  }) as `0x${string}`;

  onHash?.(txHash);
  return pollForScenarioResult(txHash);
}

async function pollForScenarioResult(txHash: string, retries = 80): Promise<GeneratedScenario> {
  for (let i = 0; i < retries; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    try {
      const tx = await (readClient as any).request({
        method: "eth_getTransactionByHash",
        params: [txHash],
      });

      const encoded: string | undefined = tx?.consensus_data?.leader_receipt?.[0]?.result;
      if (!encoded) continue;

      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const decoded = abi.calldata.decode(bytes.slice(1));
      if (!(decoded instanceof Map)) throw new Error("Unexpected calldata shape");

      const obj: Record<string, unknown> = {};
      for (const [k, v] of decoded as Map<string, unknown>) {
        obj[String(k)] = typeof v === "bigint" ? Number(v) : v;
      }
      return obj as unknown as GeneratedScenario;
    } catch (err: any) {
      if (err?.message?.startsWith("Unexpected calldata")) throw err;
    }
  }
  throw new Error("Still processing — check the explorer for updates.");
}

// ── Creator NFT ───────────────────────────────────────────────────────────────

export const NFT_MINT_PRICE = BigInt("5000000000000000000"); // 5 GEN in wei

export async function mintCreatorNft(writeClient: any) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "mint_creator_nft",
    args: [],
    value: NFT_MINT_PRICE,
  }) as unknown as Promise<`0x${string}`>;
}

export async function adminMintNft(writeClient: any, to: string) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "admin_mint_nft",
    args: [to],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function listNft(writeClient: any, tokenId: number, priceWei: bigint) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "list_nft",
    args: [tokenId, priceWei],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function delistNft(writeClient: any, tokenId: number) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "delist_nft",
    args: [tokenId],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function buyNft(writeClient: any, tokenId: number, priceWei: bigint) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "buy_nft",
    args: [tokenId],
    value: priceWei,
  }) as unknown as Promise<`0x${string}`>;
}

export async function transferNft(writeClient: any, tokenId: number, to: string) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "transfer_nft",
    args: [tokenId, to],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function waitForResult(
  txHash: string,
  status: TransactionStatus = TransactionStatus.ACCEPTED,
  retries = 80,
) {
  let receipt;
  try {
    receipt = await readClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}` & { length: 66 },
      status,
      retries,
      interval: 3000,
    });
  } catch (err: any) {
    const msg = err?.message ?? "";
    if (msg.includes("Timed out") || msg.includes("timeout")) {
      throw new Error("Still processing — check the explorer for updates.");
    }
    throw err;
  }
  if (receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
    const leaderErr = (receipt as any).consensus_data?.leader_receipt?.[0]?.error;
    throw new Error(leaderErr ?? "Contract execution failed");
  }
  return receipt;
}
