"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus, ExecutionResult } from "genlayer-js/types";

const chain = studionet; // chain ID 61999, https://studio.genlayer.com/api

// Read client — no wallet needed
export const readClient = createClient({ chain });

// Write client — requires connected wallet (MetaMask)
export function createWriteClient(address: `0x${string}`) {
  return createClient({
    chain,
    account: address,
    provider:
      typeof window !== "undefined" ? (window as any).ethereum : undefined,
  });
}

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ?? "0x";

// ── Typed read helpers ───────────────────────────────────────────────────────

/** Paginated chapter list. Pass offset=0, limit=50 for the first page. */
export async function getChapters(offset: number, limit: number) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_chapters",
    args: [offset, limit],
  }) as unknown as Promise<Chapter[]>;
}

export async function getChapter(id: number) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_chapter",
    args: [id],
  }) as unknown as Promise<Chapter>;
}

/** Paginated attempt list. Pass offset=0, limit=50 for the first page. */
export async function getAttempts(chapterId: number, offset: number, limit: number) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_attempts",
    args: [chapterId, offset, limit],
  }) as unknown as Promise<Attempt[]>;
}

export async function getCharacter(address: string) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_character",
    args: [address],
  }) as unknown as Promise<Character>;
}

export async function hasCharacter(address: string) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "has_character",
    args: [address],
  }) as unknown as Promise<boolean>;
}

export async function getPromptBalance(address: string) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "prompt_balance",
    args: [address],
  }) as unknown as Promise<number>;
}

/** How many attempts this address has used on a chapter (max 3). */
export async function getUserAttempts(chapterId: number, address: string) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_user_attempts",
    args: [chapterId, address],
  }) as unknown as Promise<number>;
}

export async function getLeaderboard() {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_leaderboard",
    args: [],
  }) as unknown as Promise<LeaderboardEntry[]>;
}

// ── Write helpers (return tx hash) ──────────────────────────────────────────

export async function mintPrompts(writeClient: any, to: string, amount: number) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "mint_prompts",
    args: [to, amount],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function transferOwnership(writeClient: any, newOwner: string) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "transfer_ownership",
    args: [newOwner],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function createCharacter(
  writeClient: any,
  name: string,
  gender: string,
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
  difficulty: number
) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_chapter",
    args: [title, scenario, winCondition, difficulty],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function submitAction(
  writeClient: any,
  chapterId: number,
  action: string
) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "submit_action",
    args: [chapterId, action],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

// ── Poll for receipt + check execution ──────────────────────────────────────

export async function waitForResult(txHash: string) {
  const receipt = await readClient.waitForTransactionReceipt({
    hash: txHash as `0x${string}` & { length: 66 },
    status: TransactionStatus.FINALIZED,
  });
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(`Execution failed: ${receipt.txExecutionResultName}`);
  }
  return receipt;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface FomoWinner {
  explorer: string;
  roll: number;
  attempt_index: number;
}

export interface Chapter {
  id: number;
  creator: string;
  title: string;
  scenario: string;
  win_condition: string;
  difficulty: number;
  attempt_count: number;
  active: boolean;
  fomo_winner: FomoWinner;
}

export interface Attempt {
  explorer: string;
  action: string;
  success: boolean;
  roll: number;
  judgment: string;
}

export interface LeaderboardEntry {
  chapter_id: number;
  explorer: string;
  roll: number;
  attempt_index: number;
}

export interface Character {
  name: string;
  age: number;
  character_class: string;
  backstory: string;
  strength: number;
  intelligence: number;
  agility: number;
}

export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function hasWinner(chapter: Chapter): boolean {
  return chapter.fomo_winner.explorer !== ZERO_ADDR;
}
