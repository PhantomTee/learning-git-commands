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

export async function getAllChapters() {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_all_chapters",
    args: [],
  }) as unknown as Promise<Chapter[]>;
}

export async function getChapter(id: number) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_chapter",
    args: [id],
  }) as unknown as Promise<Chapter>;
}

export async function getAttempts(chapterId: number) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_attempts",
    args: [chapterId],
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

export async function getLeaderboard() {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_leaderboard",
    args: [],
  }) as unknown as Promise<Attempt[]>;
}

// ── Write helpers (return tx hash) ──────────────────────────────────────────

export async function mintPrompts(writeClient: any, amount: number) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "mint_prompts",
    args: [amount],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function createCharacter(
  writeClient: any,
  name: string,
  sex: boolean,
  age: number
) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_character",
    args: [name, sex, age],
    value: BigInt(0),
  }) as unknown as Promise<`0x${string}`>;
}

export async function createChapter(
  writeClient: any,
  title: string,
  scenario: string,
  winCondition: string
) {
  return writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "create_chapter",
    args: [title, scenario, winCondition],
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

export interface Chapter {
  id: number;
  creator: string;
  title: string;
  scenario: string;
  win_condition: string;
  attempt_count: number;
  active: boolean;
  fomo_winner: string;
}

export interface Attempt {
  explorer: string;
  action: string;
  success: boolean;
  roll: number;
  judgment: string;
  chapter_id?: number;
}

export interface Character {
  name: string;
  sex: boolean;
  age: number;
  character_class: string;
  backstory: string;
  strength: number;
  intelligence: number;
  agility: number;
}
