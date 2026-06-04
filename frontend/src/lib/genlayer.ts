"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus, ExecutionResult } from "genlayer-js/types";

const chain = studionet;

export const readClient = createClient({ chain });

export function createWriteClient(address: `0x${string}`) {
  return createClient({
    chain,
    account: address,
    provider: typeof window !== "undefined" ? (window as any).ethereum : undefined,
  });
}

export const EXPLORER_URL = "https://explorer-studio.genlayer.com";
export const explorerTxUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) ?? "0x";

// ── GEN token formatting ─────────────────────────────────────────────────────

export function formatGEN(wei: number | bigint): string {
  const n = typeof wei === "bigint" ? Number(wei) : wei;
  const gen = n / 1e18;
  if (gen >= 1000) return `${(gen / 1000).toFixed(1)}k GEN`;
  if (gen >= 1)    return `${gen % 1 === 0 ? gen.toFixed(0) : gen.toFixed(2)} GEN`;
  return `${(gen * 1000).toFixed(2)} mGEN`;
}

export function genToWei(gen: number): bigint {
  return BigInt(Math.floor(gen * 1e18));
}

// ── Read helpers ─────────────────────────────────────────────────────────────

export async function getChapters(offset = 0, limit = 50) {
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

export async function getAttempts(chapterId: number, offset = 0, limit = 50) {
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

export async function getLeaderboard() {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_leaderboard",
    args: [],
  }) as unknown as Promise<LeaderboardEntry[]>;
}

export async function getUserAttempts(chapterId: number, address: string) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_user_attempts",
    args: [chapterId, address],
  }) as unknown as Promise<number>;
}

export async function getPrizePool(chapterId: number) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_prize_pool",
    args: [chapterId],
  }) as unknown as Promise<number>;
}

export async function getCreatorBalance(address: string) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_creator_balance",
    args: [address],
  }) as unknown as Promise<number>;
}

export async function getClaimablePrizes(address: string) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_claimable_prizes",
    args: [address],
  }) as unknown as Promise<ClaimablePrize[]>;
}

// ── Write helpers ────────────────────────────────────────────────────────────

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

export async function generateScenario(writeClient: any, onHash?: (hash: string) => void): Promise<GeneratedScenario> {
  const txHash = await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "generate_scenario",
    args: [],
    value: BigInt("10000000000000000000"), // 10 GEN in wei
  }) as `0x${string}`;

  onHash?.(txHash);
  const receipt = await waitForResult(txHash);

  const raw = (receipt as any).consensus_data?.leader_receipt?.[0]?.result;
  if (!raw) throw new Error("No result returned from contract");
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return parsed as GeneratedScenario;
}

// ── Poll for receipt ─────────────────────────────────────────────────────────

export async function waitForResult(txHash: string) {
  let receipt;
  try {
    receipt = await readClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}` & { length: 66 },
      status: TransactionStatus.ACCEPTED,
      retries: 120,
      interval: 3000,
    });
  } catch (err: any) {
    const msg = err?.message ?? "";
    if (msg.includes("Timed out") || msg.includes("timeout")) {
      throw new Error("Validators are still reaching consensus — please wait a moment and try again.");
    }
    throw err;
  }
  // Only fail on an explicit error result; undefined means the field isn't
  // populated on this receipt shape, which is fine — not an execution failure.
  if (receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
    const leaderErr = (receipt as any).consensus_data?.leader_receipt?.[0]?.error;
    throw new Error(leaderErr ?? "Contract execution failed");
  }
  return receipt;
}

// ── Types ────────────────────────────────────────────────────────────────────

export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export function hasWinner(chapter: Chapter): boolean {
  return chapter.fomo_winner.explorer !== ZERO_ADDR;
}

export interface FomoWinner {
  explorer: string;
  roll: number;
  attempt_index: number;
  prize_claimed: boolean;
}

export interface Chapter {
  id: number;
  creator: string;
  title: string;
  scenario: string;
  win_condition: string;
  difficulty: number;
  price_per_attempt: number;
  attempt_count: number;
  active: boolean;
  prize_pool: number;
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
  prize_pool: number;
  prize_claimed: boolean;
}

export interface ClaimablePrize {
  chapter_id: number;
  title: string;
  prize_pool: number;
  roll: number;
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

export interface GeneratedScenario {
  title: string;
  scenario: string;
  win_condition: string;
  difficulty: number;
}
