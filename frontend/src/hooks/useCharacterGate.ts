"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/Toast";
import { hasCharacter, normaliseError } from "@/lib/genlayer";

export const CHARACTER_GATE_MESSAGE = "You need to create a character before you can play ChainTales.";

export type CharacterGateResult =
  | { ok: true; account: string }
  | { ok: false; reason: "no_wallet" | "no_account" | "no_character" | "check_failed"; message: string; account?: string };

interface GateOptions {
  requestAccount?: boolean;
  showToast?: boolean;
}

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<string[]>;
}

export function useCharacterGate() {
  const [checking, setChecking] = useState(false);
  const { warning, error: toastError } = useToast();

  const requireCharacter = useCallback(async (options: GateOptions = {}): Promise<CharacterGateResult> => {
    const { requestAccount = true, showToast = true } = options;
    const eth = typeof window !== "undefined" ? (window as Window & { ethereum?: EthereumProvider }).ethereum : undefined;

    if (!eth) {
      const message = "Install MetaMask to play ChainTales.";
      if (showToast) toastError("No wallet", message);
      return { ok: false, reason: "no_wallet", message };
    }

    setChecking(true);
    try {
      const method = requestAccount ? "eth_requestAccounts" : "eth_accounts";
      const accounts = await eth.request({ method });
      const account = accounts?.[0] as string | undefined;

      if (!account) {
        const message = "Connect your wallet to play ChainTales.";
        if (showToast) toastError("Wallet required", message);
        return { ok: false, reason: "no_account", message };
      }

      const exists = await hasCharacter(account);
      if (!exists) {
        if (showToast) {
          warning("Character required", CHARACTER_GATE_MESSAGE, { href: "/character", label: "Create character" });
        }
        return { ok: false, reason: "no_character", message: CHARACTER_GATE_MESSAGE, account };
      }

      return { ok: true, account };
    } catch (err: unknown) {
      const message = normaliseError(err).message;
      if (showToast) toastError("Character check failed", message);
      return { ok: false, reason: "check_failed", message };
    } finally {
      setChecking(false);
    }
  }, [toastError, warning]);

  return { checking, requireCharacter };
}
