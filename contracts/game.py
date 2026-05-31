# ChainTales – AI-judged DND game on Genlayer
# Explorers submit actions, Intelligent Contract LLM-judges outcomes,
# FOMO pool rewards the last successful explorer before the timer expires.

import json
from dataclasses import dataclass
from genlayer import *

_ZERO_ADDR = Address(b'\x00' * 20)


# ── Storage-compatible dataclasses ──────────────────────────────────────────

@allow_storage
@dataclass
class Character:
    name: str
    sex: bool       # False = male, True = female
    age: u256
    character_class: str
    backstory: str
    strength: u256
    intelligence: u256
    agility: u256


@allow_storage
@dataclass
class Chapter:
    id: u256
    creator: Address
    title: str
    scenario: str       # Rich narrative setup written by the Creator
    win_condition: str  # What the Explorer must achieve (LLM evaluates this)
    attempt_count: u256
    active: bool


@allow_storage
@dataclass
class Attempt:
    chapter_id: u256
    explorer: Address
    action: str
    success: bool
    roll: u256      # Final d20 roll (1–20)
    judgment: str   # LLM narrative of what happened


# ── Main contract ────────────────────────────────────────────────────────────

class ChainTales(gl.Contract):
    characters: TreeMap[Address, Character]
    chapters: TreeMap[u256, Chapter]
    attempts: DynArray[Attempt]          # Flat log — filter by chapter_id client-side
    prompt_balances: TreeMap[Address, u256]
    fomo_winners: TreeMap[u256, Address] # Last successful explorer per chapter
    # Bare u256 scalars are not safe at contract root — use TreeMap sentinel instead
    _state: TreeMap[str, u256]           # stores "chapter_count"

    def __init__(self) -> None:
        self._state["chapter_count"] = u256(0)

    # ── Internal helpers ──────────────────────────────────────────────────

    def _chapter_count(self) -> u256:
        if "chapter_count" in self._state:
            return self._state["chapter_count"]
        return u256(0)

    def _prompt_balance(self, addr: Address) -> u256:
        if addr in self.prompt_balances:
            return self.prompt_balances[addr]
        return u256(0)

    def _fomo_winner(self, chapter_id: u256) -> str:
        if chapter_id in self.fomo_winners:
            return str(self.fomo_winners[chapter_id])
        return "0x" + "00" * 20

    # ── Prompt token (AI gas) ─────────────────────────────────────────────

    @gl.public.write
    def mint_prompts(self, amount: u256) -> None:
        """Dev helper: mint prompt tokens to the caller. Replace with real purchase logic."""
        caller = gl.message.sender_address
        current = self._prompt_balance(caller)
        self.prompt_balances[caller] = current + amount

    @gl.public.view
    def prompt_balance(self, address: Address) -> u256:
        return self._prompt_balance(address)

    # ── Character system ──────────────────────────────────────────────────

    @gl.public.write
    def create_character(self, name: str, sex: bool, age: u256) -> None:
        """Mint a character. LLM generates class, backstory, and stats. One per address."""
        caller = gl.message.sender_address
        assert caller not in self.characters, "Character already exists for this address"

        def generate() -> str:
            prompt = f"""You are a fantasy RPG character generator.
Create a character with these base attributes:
- Name: {name}
- Sex: {"female" if sex else "male"}
- Age: {int(age)}

Return ONLY valid JSON with these exact fields:
{{
  "character_class": "one of: Warrior, Mage, Rogue, Ranger, Bard, Cleric",
  "backstory": "2-3 sentence origin story that fits the name and age",
  "strength": <integer 1-20>,
  "intelligence": <integer 1-20>,
  "agility": <integer 1-20>
}}"""
            return gl.nondet.exec_prompt(prompt, response_format="json")

        data = json.loads(gl.eq_principle.strict_eq(generate))

        self.characters[caller] = Character(
            name=name,
            sex=sex,
            age=age,
            character_class=data["character_class"],
            backstory=data["backstory"],
            strength=u256(int(data["strength"])),
            intelligence=u256(int(data["intelligence"])),
            agility=u256(int(data["agility"])),
        )

    @gl.public.view
    def get_character(self, address: Address) -> dict:
        c = self.characters[address]
        return {
            "name": c.name,
            "sex": c.sex,
            "age": int(c.age),
            "character_class": c.character_class,
            "backstory": c.backstory,
            "strength": int(c.strength),
            "intelligence": int(c.intelligence),
            "agility": int(c.agility),
        }

    @gl.public.view
    def has_character(self, address: Address) -> bool:
        return address in self.characters

    # ── Chapter system (Creator role) ─────────────────────────────────────

    @gl.public.write
    def create_chapter(self, title: str, scenario: str, win_condition: str) -> u256:
        """Creator writes a chapter with a scenario and a win condition the LLM will judge."""
        caller = gl.message.sender_address
        assert caller in self.characters, "Must have a character to create a chapter"

        chapter_id = self._chapter_count()
        self._state["chapter_count"] = chapter_id + u256(1)

        self.chapters[chapter_id] = Chapter(
            id=chapter_id,
            creator=caller,
            title=title,
            scenario=scenario,
            win_condition=win_condition,
            attempt_count=u256(0),
            active=True,
        )
        return chapter_id

    @gl.public.write
    def close_chapter(self, chapter_id: u256) -> None:
        assert chapter_id in self.chapters, "Chapter does not exist"
        assert self.chapters[chapter_id].creator == gl.message.sender_address, \
            "Only the creator can close a chapter"
        self.chapters[chapter_id].active = False

    @gl.public.view
    def get_chapter(self, chapter_id: u256) -> dict:
        assert chapter_id in self.chapters, "Chapter does not exist"
        ch = self.chapters[chapter_id]
        return {
            "id": int(ch.id),
            "creator": str(ch.creator),
            "title": ch.title,
            "scenario": ch.scenario,
            "win_condition": ch.win_condition,
            "attempt_count": int(ch.attempt_count),
            "active": ch.active,
            "fomo_winner": self._fomo_winner(chapter_id),
        }

    @gl.public.view
    def get_all_chapters(self) -> list:
        result = []
        count = int(self._chapter_count())
        for i in range(count):
            cid = u256(i)
            ch = self.chapters[cid]
            result.append({
                "id": i,
                "creator": str(ch.creator),
                "title": ch.title,
                "scenario": ch.scenario,
                "win_condition": ch.win_condition,
                "attempt_count": int(ch.attempt_count),
                "active": ch.active,
                "fomo_winner": self._fomo_winner(cid),
            })
        return result

    # ── Explorer action system ────────────────────────────────────────────

    @gl.public.write
    def submit_action(self, chapter_id: u256, action: str) -> dict:
        """Explorer spends 1 prompt token, LLM judges the action, dice roll modifies outcome."""
        caller = gl.message.sender_address
        assert caller in self.characters, "Must have a character to explore"

        balance = self._prompt_balance(caller)
        assert balance >= u256(1), "Insufficient prompt tokens — mint more to continue"

        assert chapter_id in self.chapters, "Chapter does not exist"
        assert self.chapters[chapter_id].active, "This chapter is no longer active"
        assert self.chapters[chapter_id].creator != caller, \
            "Creators cannot explore their own chapter"

        # Burn the prompt token
        self.prompt_balances[caller] = balance - u256(1)

        # Pseudo-random d20 — deterministic across validators (same attempt_count = same roll)
        roll = int(self.chapters[chapter_id].attempt_count) % 20 + 1

        character = self.characters[caller]
        scenario = self.chapters[chapter_id].scenario
        win_condition = self.chapters[chapter_id].win_condition

        def judge() -> str:
            prompt = f"""You are a strict but fair DND dungeon master adjudicating a challenge.

CHAPTER SCENARIO:
{scenario}

WIN CONDITION:
{win_condition}

EXPLORER CHARACTER:
Name: {character.name}, Class: {character.character_class}
STR: {int(character.strength)}, INT: {int(character.intelligence)}, AGI: {int(character.agility)}

EXPLORER'S ACTION:
{action}

DICE ROLL (d20): {roll}
Roll guide — 1-5: likely fails unless action is brilliant, 6-14: action quality decides,
15-20: likely succeeds unless action is completely off-track.

Consider the character's stats relative to the action type (physical vs mental vs stealth).

Return ONLY valid JSON:
{{
  "success": <true or false>,
  "judgment": "<1-2 sentence vivid narrative of what happened>",
  "roll_modifier": <integer -2 to 2 based on action cleverness and stat fit>
}}"""
            return gl.nondet.exec_prompt(prompt, response_format="json")

        result = json.loads(gl.eq_principle.strict_eq(judge))

        final_roll = max(1, min(20, roll + int(result["roll_modifier"])))
        success: bool = bool(result["success"])

        self.attempts.append(Attempt(
            chapter_id=chapter_id,
            explorer=caller,
            action=action,
            success=success,
            roll=u256(final_roll),
            judgment=str(result["judgment"]),
        ))

        # Mutate storage directly through the proxy — no re-assignment needed
        self.chapters[chapter_id].attempt_count = \
            self.chapters[chapter_id].attempt_count + u256(1)

        if success:
            self.fomo_winners[chapter_id] = caller

        return {
            "success": success,
            "roll": final_roll,
            "judgment": result["judgment"],
        }

    @gl.public.view
    def get_attempts(self, chapter_id: u256) -> list:
        result = []
        for a in self.attempts:
            if a.chapter_id == chapter_id:
                result.append({
                    "explorer": str(a.explorer),
                    "action": a.action,
                    "success": a.success,
                    "roll": int(a.roll),
                    "judgment": a.judgment,
                })
        return result

    @gl.public.view
    def get_leaderboard(self) -> list:
        """Returns all successful attempts across all chapters."""
        result = []
        for a in self.attempts:
            if a.success:
                result.append({
                    "chapter_id": int(a.chapter_id),
                    "explorer": str(a.explorer),
                    "action": a.action,
                    "roll": int(a.roll),
                    "judgment": a.judgment,
                })
        return result
