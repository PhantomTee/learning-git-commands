# ChainTales

An on-chain RPG built entirely on [GenLayer](https://genlayer.com). Creators write dungeon chapters. Explorers submit actions. An on-chain AI dungeon master — powered by GenLayer's intelligent contract runtime — judges every attempt in real time, with consensus across multiple validators.

No oracles. No off-chain APIs. Everything — AI judgment, scenario generation, NFT art, prize distribution — runs inside a single Python smart contract on GenLayer studionet.

---

## How it works

### Creator
Creators hold a Creator NFT and publish prize-backed chapters. A chapter has a scenario, win condition, difficulty, action price, and upfront publish deposit. The publish deposit goes straight into that chapter's prize pool. Higher difficulty applies a larger deposit multiplier.

### Explorer
Explorers create a character, choose an active chapter, and pay the listed action price for each attempt. The on-chain AI dungeon master judges the action against the chapter scenario, win condition, and character stats.

### Current Leader
A successful action makes the explorer the current leader for that active chapter. The chapter stays open. Other explorers can still attempt it and replace the current leader before close.

### Final Winner
When the chapter closes, the current leader becomes the final winner. Only then can that address claim the prize pool. If the chapter closes with no current leader, the pool goes to protocol.

Chapters expire after 7 days, and once expired **anyone** may close them. This
matters: before, only the creator could close a chapter, and the creator earns
30 % of every attempt — so closing was against their interest and a standing
leader's prize could stay locked indefinitely.

---

## GenLayer — every integration point

GenLayer is not used just for deployment. The contract is architected around GenLayer's specific capabilities at every layer.

### 1. Contract language — Python on GenLayer

`contracts/game.py` is a GenLayer intelligent contract written in Python. It uses GenLayer's native types and decorators throughout:

```python
from genlayer import *

class ChainTales(gl.Contract):
    characters: TreeMap[str, Character]
    chapters:   TreeMap[u256, Chapter]
    nft_owners: TreeMap[u256, Address]
    ...
```

- `gl.Contract` — base class for all GenLayer contracts
- `TreeMap[K, V]` — GenLayer's ordered persistent map, used for all on-chain state
- `u256`, `Address` — GenLayer's native EVM-compatible types
- `@gl.public.write`, `@gl.public.view`, `@gl.public.write.payable` — GenLayer function visibility decorators
- `gl.message.sender_address`, `gl.message.value` — GenLayer transaction context

### 2. On-chain AI — action judgment

Every explorer action triggers a live AI call inside the contract. GenLayer executes this across multiple independent validators, reaching consensus before writing the result to state:

```python
def judge() -> str:
    return gl.nondet.exec_prompt(
        f"""You are scoring an explorer's action in a DND game.
<chapter_scenario>{safe_scenario}</chapter_scenario>
<win_condition>{safe_win_condition}</win_condition>
<explorer_action>{safe_action}</explorer_action>
...
Return ONLY valid JSON:
{{"verdict": "STRONG_HIT | HIT | NEUTRAL | MISS | CRITICAL_MISS"}}""",
        response_format="json",
    )

result = self._parse(gl.eq_principle.strict_eq(judge))
```

- `gl.nondet.exec_prompt` — runs an LLM prompt as a non-deterministic step inside the contract
- `gl.eq_principle.strict_eq` — GenLayer consensus principle: all validators must return byte-identical results before the transaction is accepted

The verdict shifts the explorer's d20 roll by ±2, making strategy matter. The entire judgment pipeline — prompt, consensus, roll calculation, stat progression, prize accounting — completes in a single on-chain transaction.

The roll itself is not free to read in advance. It was originally derived from
the chapter id, the attempt count and the explorer's own agility — all public
through `get_chapter` — so anyone could compute the exact roll their next
attempt would produce and pay only when it was a guaranteed win. The seed now
mixes in the execution timestamp, which is identical for every validator (so
consensus holds) but is not knowable while the transaction is being composed.

### 3. On-chain AI — scenario generation

Creators can pay 10 GEN to have the contract generate a full chapter scenario via AI:

```python
def generate() -> str:
    return gl.nondet.exec_prompt(
        f"""You are a dungeon master for ChainTales, a blockchain RPG.
Write a chapter set in a {theme}. Difficulty: {difficulty}/20.
Return ONLY this exact JSON ...""",
        response_format="json",
    )

data = self._parse(gl.eq_principle.prompt_comparative(
    generate,
    f"Both outputs must describe a {theme} chapter with difficulty {difficulty}. "
    "title, scenario, and win_condition must convey the same setting and objective.",
))
```

- `gl.eq_principle.prompt_comparative` — a softer GenLayer consensus principle: validators reach agreement based on semantic equivalence rather than byte equality, appropriate for creative generation

The seed (caller address + chapter count) is deterministic across all validators so every node queries the same theme and difficulty before independently calling the LLM. The result — title, scenario, win condition — is written to the receipt and decoded by the frontend.

### 4. Reading AI results from receipts

The frontend decodes AI output directly from the GenLayer transaction receipt using `genlayer-js`'s ABI decoder:

```typescript
const tx = await readClient.request({
  method: "eth_getTransactionByHash",
  params: [txHash],
});
const encoded = tx?.consensus_data?.leader_receipt?.[0]?.result;
const bytes   = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
const decoded = abi.calldata.decode(bytes.slice(1));
```

`consensus_data.leader_receipt` is a GenLayer-specific transaction field that carries the leader validator's return value after consensus is reached.

### 5. On-chain SVG NFT art

The contract generates the full NFT image — a 400×560 fantasy card — entirely in Python as a returned string, with no IPFS or external storage:

```python
@gl.public.view
def get_nft_svg(self, token_id: u256) -> str:
    # Tier by token number: #1-33 FOUNDER (amber), #34-66 KEEPER (violet), #67-100 SEEKER (crimson)
    s  = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560">'
    s += ...  # gradient bg, double border, shield, sword, token number, tier badge
    return s
```

The frontend mirrors this exact algorithm in `frontend/src/lib/nft-svg.ts` for instant display without an extra RPC call. The contract is the authoritative source; the TypeScript version is a client-side cache.

### 6. Native GEN transfers

Prize payouts and NFT purchase settlements use GenLayer's EVM contract interface to send native GEN directly from the contract to any address:

```python
@gl.evm.contract_interface
class _Addr:
    class View: pass
    class Write: pass

# Prize claim:
_Addr(winner.explorer).emit_transfer(value=pool)

# NFT sale — seller receives payment immediately:
_Addr(seller).emit_transfer(value=listed_price)
```

### 7. genlayer-js — frontend SDK

Every frontend interaction with the chain goes through `genlayer-js`:

```typescript
import { createClient } from "genlayer-js";
import { studionet }    from "genlayer-js/chains";
import { TransactionStatus, ExecutionResult } from "genlayer-js/types";

// Read client (no wallet required)
export const readClient = createClient({ chain: studionet });

// Write client (MetaMask provider)
export function createWriteClient(address: `0x${string}`) {
  return createClient({
    chain:    studionet,
    account:  address,
    provider: (window as any).ethereum,
  });
}
```

All contract reads use `readClient.readContract`, all writes use `writeClient.writeContract`, and transaction finality is tracked with `readClient.waitForTransactionReceipt`.

### 8. Studionet network — MetaMask integration

The Navbar automatically adds and switches to the GenLayer studionet network in MetaMask:

```typescript
const STUDIONET_CHAIN_ID = "0xf22f"; // 61999

await eth.request({
  method: "wallet_addEthereumChain",
  params: [{
    chainId:   STUDIONET_CHAIN_ID,
    chainName: "Genlayer Studio Network",
    nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
    rpcUrls:   ["https://studio.genlayer.com/api"],
  }],
});
```

### 9. Automated deployment — sim_fundAccount

`deploy/deploy-studionet.mjs` is a fully automated deployment script. It uses `sim_fundAccount`, a GenLayer studionet-specific RPC method that funds a fresh account with test GEN — no private key management or faucet UI needed:

```javascript
// Amount must be a plain JSON integer — raw string bypasses JS float precision loss
const fundBody = `{"jsonrpc":"2.0","id":1,"method":"sim_fundAccount","params":["${account.address}",1000000000000000000000]}`;
await rpc("sim_fundAccount", null, fundBody);
```

After deployment the script reads the contract address from the GenLayer receipt and auto-patches `CONTRACT_ADDRESS` in `genlayer-server.ts`.

---

## Economics

| Flow | Destination |
|---|---|
| Chapter publish deposit | 100% to that chapter's prize pool |
| Explorer attempt payment | 60% prize pool · 30% chapter creator · 10% protocol |
| Creator NFT mint | Protocol |
| AI scenario generation | Protocol |
| NFT secondary sale | 100% to seller (instant on-chain transfer) |

Publish deposits use a creator-chosen base prize multiplied by chapter difficulty:

| Difficulty | Multiplier |
|---|---:|
| 1 | 1.0x |
| 2–7 | 1.1x |
| 8–15 | 1.3x |
| 16–20 | 1.5x |

Minimum example: a 10 GEN base prize requires 10 GEN at difficulty 1, 11 GEN at difficulty 2–7, 13 GEN at difficulty 8–15, and 15 GEN at difficulty 16–20.

---

## Project structure

```
contracts/
  game.py                      # GenLayer Python smart contract — entire backend

frontend/
  src/
    app/
      page.tsx                 # Home — world map + active chapters
      chapter/[id]/page.tsx    # Chapter detail — action input + attempt feed
      chapter/create/page.tsx  # Chapter creation + AI scenario generation
      character/page.tsx       # Character sheet + creator earnings + prize claims
      leaderboard/page.tsx     # Hall of legends — current leaders and final winners ranked by roll
      marketplace/page.tsx     # Creator NFT mint, buy, list, delist

    components/
      Navbar.tsx               # Wallet connect + studionet network switching
      CharacterSheet.tsx       # Stat bars + class display
      WorldMap.tsx             # Chapter grid
      ChapterCard.tsx          # Chapter summary card
      ActionInput.tsx          # Action textarea + submit + result display
      Toast.tsx                # Toast notification system

    lib/
      genlayer-server.ts       # Read client + all read helpers (server-safe)
      genlayer.ts              # Write client + all write helpers + waitForResult
      nft-svg.ts               # Client-side SVG mirror of contract's get_nft_svg

    hooks/
      useNotifications.ts      # Polls for new attempts on creator's chapters

deploy/
  deploy-studionet.mjs         # Automated deploy: fund → deploy → patch address
```

---

## Running locally

**1. Install frontend dependencies**

```bash
cd frontend
npm install
```

**2. Deploy the contract** *(optional — a live contract is already on studionet)*

```bash
node deploy/deploy-studionet.mjs
```

Generates a fresh key, funds it via `sim_fundAccount`, deploys `contracts/game.py`, and patches the contract address in the frontend automatically.

**3. Start the frontend**

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect MetaMask — the app will offer to add the GenLayer studionet network automatically.

**4. Get test GEN**

Use the [GenLayer Studio](https://studio.genlayer.com) faucet, or run the deploy script which funds accounts programmatically via `sim_fundAccount`.

---

## Contract

Deployed on GenLayer studionet:

```
0x67dB16A5467404f09ed52BFF8B40d1a75D8C3015
```

Explorer: [https://explorer-studio.genlayer.com](https://explorer-studio.genlayer.com)
