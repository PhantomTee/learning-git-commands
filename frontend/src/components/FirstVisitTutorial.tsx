"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "ct_tutorial_complete_v1";

const steps = [
  {
    kicker: "Welcome",
    title: "ChainTales is an on-chain RPG",
    body: "Creators write chapters. Explorers submit actions. GenLayer's AI dungeon master judges each attempt on-chain.",
  },
  {
    kicker: "Start",
    title: "Create your character first",
    body: "Your character unlocks play. Class and stats matter because the AI judge scores actions against your chapter objective and primary stat.",
  },
  {
    kicker: "Creators",
    title: "Creator NFTs unlock chapter writing",
    body: "Mint or buy a Creator NFT in the marketplace, then publish chapters with a scenario, win condition, difficulty, and action price.",
  },
  {
    kicker: "Explorers",
    title: "Win the FOMO prize pool",
    body: "Each action pays GEN. Sixty percent enters the prize pool, and the last successful explorer before close can claim it.",
  },
];

export default function FirstVisitTutorial() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const complete = localStorage.getItem(STORAGE_KEY) === "1";
    setOpen(!complete);
    setReady(true);
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!ready || !open) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(5,3,7,0.82)", backdropFilter: "blur(10px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <div className="panel w-full max-w-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-900 via-amber-400 to-amber-900" />
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <p className="font-display text-xs tracking-[0.28em] uppercase text-amber-300">
              {current.kicker}
            </p>
            <button
              type="button"
              onClick={finish}
              className="text-xs font-display tracking-widest text-amber-200/55 hover:text-amber-200 transition-colors"
            >
              Skip
            </button>
          </div>

          <div className="space-y-3">
            <h2 id="tutorial-title" className="font-display font-black text-2xl sm:text-3xl text-amber-400 tracking-wider">
              {current.title}
            </h2>
            <p className="text-sm leading-relaxed text-amber-100/75">
              {current.body}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Link
              href="/character"
              onClick={finish}
              className="btn-stone text-center px-3 py-2 rounded-lg"
            >
              Character
            </Link>
            <Link
              href="/marketplace"
              onClick={finish}
              className="btn-stone text-center px-3 py-2 rounded-lg"
            >
              Marketplace
            </Link>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of ${steps.length}`}>
              {steps.map((item, index) => (
                <button
                  key={item.kicker}
                  type="button"
                  onClick={() => setStep(index)}
                  aria-label={`Go to tutorial step ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${index === step ? "w-7 bg-amber-400" : "w-2 bg-amber-900/70"}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep((value) => Math.max(0, value - 1))}
                disabled={step === 0}
                className="btn-stone px-4 py-2 rounded-lg text-xs disabled:opacity-35"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => isLast ? finish() : setStep((value) => value + 1)}
                className="btn-gold px-4 py-2 rounded-lg text-xs"
              >
                {isLast ? "Enter ChainTales" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
