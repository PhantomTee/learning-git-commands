// No "use client" — safe to import from Server Components and API routes.
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

export const CONTRACT_ADDRESS = "0x53f68c3B0a3e67ddB68eFC35E237cD4b37645954" as `0x${string}`;

export const EXPLORER_URL = "https://explorer-studio.genlayer.com";
export const explorerTxUrl = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;

export const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
export const DEFAULT_BASE_PRIZE_GEN = 100;
export const BPS_DENOMINATOR = 10000;

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

export function difficultyMultiplierBps(difficulty: number): number {
  if (difficulty <= 1) return 10000;
  if (difficulty <= 7) return 11000;
  if (difficulty <= 15) return 13000;
  return 15000;
}

export function getRequiredPublishDepositLocal(basePrizeWei: bigint, difficulty: number): bigint {
  return basePrizeWei * BigInt(difficultyMultiplierBps(difficulty)) / BigInt(BPS_DENOMINATOR);
}

export function hasWinner(chapter: Chapter): boolean {
  return chapter.fomo_winner.explorer !== ZERO_ADDR;
}

// ── Types ────────────────────────────────────────────────────────────────────

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
  level: number;
  xp: number;
  wins: number;
}

export interface NftItem {
  token_id: number;
  owner: string;
  price: number; // wei — 0 means not listed
}

export interface GeneratedScenario {
  title: string;
  scenario: string;
  win_condition: string;
  difficulty: number;
}

// ── Read client ───────────────────────────────────────────────────────────────

export const readClient = createClient({ chain: studionet });

// ── Read helpers ──────────────────────────────────────────────────────────────

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

export async function getRequiredPublishDeposit(basePrizeWei: bigint, difficulty: number) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_required_publish_deposit",
    args: [basePrizeWei, difficulty],
  }) as unknown as Promise<bigint>;
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

export async function getAllNfts() {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_all_nfts",
    args: [],
  }) as unknown as Promise<NftItem[]>;
}

export async function getCreatorNft(address: string) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_creator_nft",
    args: [address],
  }) as unknown as Promise<number>;
}

export async function getNftSupply() {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_nft_supply",
    args: [],
  }) as unknown as Promise<number>;
}

export async function getNftSvg(tokenId: number) {
  return readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_nft_svg",
    args: [tokenId],
  }) as unknown as Promise<string>;
}
