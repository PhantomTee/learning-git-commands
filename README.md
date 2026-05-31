# ChainTales

AI-judged DND adventures on Genlayer. Creators write chapters, Explorers submit actions — the on-chain dungeon master decides your fate.

## Architecture

```
contracts/game.py          Genlayer IntelliContract (Python + LLM)
frontend/src/              Next.js 15 app
frontend/convex/           Convex real-time backend (player positions, chat)
deploy/deploy.py           Deployment helper
```

### How it works

```
Creator writes Chapter (scenario + win condition)
    ↓ stored on Genlayer
Explorer submits action + spends 1 Prompt token
    ↓ Genlayer validators run LLM in consensus
AI dungeon master judges: success or fail (d20 roll modifies outcome)
    ↓
FOMO: last successful explorer is the current winner
    ↓ real-time position/chat via Convex
```

## Quick Start

### 1. Run Genlayer locally

```bash
npm install -g @genlayer/studio
genlayer start
```

### 2. Deploy the contract

```bash
cd frontend
node -e "
  const { createClient, createAccount } = require('genlayer-js');
  const { localnet } = require('genlayer-js/chains');
  const fs = require('fs');
  const client = createClient({ chain: localnet });
  const account = createAccount();
  const code = fs.readFileSync('../contracts/game.py', 'utf8');
  client.deployContract({ code, args: [], account })
    .then(h => client.waitForTransactionReceipt({ hash: h, status: 'FINALIZED' }))
    .then(r => console.log('Contract address:', r.contractAddress));
"
```

### 3. Configure environment

```bash
cp frontend/.env.example frontend/.env.local
# Set NEXT_PUBLIC_CONTRACT_ADDRESS=<address from step 2>
# Set NEXT_PUBLIC_GENLAYER_RPC_URL=http://localhost:4000/api
```

### 4. Set up Convex (real-time layer)

```bash
cd frontend
npx convex dev   # follow prompts to create a free Convex project
# Set NEXT_PUBLIC_CONVEX_URL=<your convex url>
```

### 5. Run the frontend

```bash
cd frontend
npm run dev
```

## Contract Functions

| Function | Role | Description |
|---|---|---|
| `create_character(name, sex, age)` | Any | LLM generates class + stats |
| `create_chapter(title, scenario, win_condition)` | Creator | Publishes a dungeon chapter |
| `submit_action(chapter_id, action)` | Explorer | Spends 1 prompt, LLM judges |
| `mint_prompts(amount)` | Dev | Mint prompt tokens (replace with payment) |
| `get_all_chapters()` | Read | All chapters |
| `get_attempts(chapter_id)` | Read | Explorer log for a chapter |
| `get_leaderboard()` | Read | All successful attempts |

## Stack

- **Genlayer** — AI-native blockchain, LLM consensus for action judgment
- **Next.js 15** — Frontend, App Router, Server Components
- **Convex** — Real-time player positions and world chat
- **TanStack Query** — Client-side data fetching
- **Tailwind CSS** — Styling
