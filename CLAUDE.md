# Ideation Engine — Quick Start

## What This Is
A visual ideation platform that turns AI model outputs into interactive bubble diagrams. Dream ideas, riff variations, ground them in reality, and export as knowledge repos.

## Architecture
- **worker.ts**: Single Cloudflare Worker — all API + UI
- **BYOK (Bring Your Own Keys)**: Users configure providers in the UI or via environment variables
- **Free tier**: Uses repo owner's API keys for $0.02 credit demo
- **Models**: Seed-2.0-pro (creative), Seed-2.0-mini (fast riffs), DeepSeek-chat (grounding)

## Setup
1. Copy `.env.example` to `.dev.vars`
2. Fill in your API keys (at least one provider)
3. Run `npx wrangler dev` for local development
4. Run `npx wrangler deploy` to deploy to Cloudflare

## Environment Variables (for .dev.vars or Cloudflare Secrets)
```
DEEPSEEK_API_KEY=sk-...
SILICONFLOW_API_KEY=sk-...
DEEPINFRA_API_KEY=...
```

## API Endpoints
- `POST /api/session` — Create new session
- `GET /api/sessions` — List sessions
- `GET /api/session/:id` — Get session with all bubbles
- `POST /api/dream` — Generate single pro bubble
- `POST /api/pipeline` — Dream + N spokes
- `POST /api/riff` — Generate spokes from selected bubbles
- `POST /api/ground` — Feasibility check on selected bubbles
- `POST /api/bubble/:id/toggle` — Toggle canon selection
- `GET /api/session/:id/export` — Export as Markdown
- `GET /api/session/:id/export/pseudo` — Export as pseudocode
- `GET /health` — Health check
- `GET /vessel.json` — Fleet metadata

## Key Patterns
- Bubble layout is hub-and-spoke: pro dream at center, mini variations radiate out
- Double-click to select/canon, then riff deeper from selected
- Each bubble stores model, temp, maxTokens for reproducibility
- Sessions persist in KV namespace `IDEATE_KV`
- BYOK config goes browser→provider directly, never touches our server

## Modifying
- To change models: edit FREE_PRO, FREE_MINI, FREE_CHAT constants
- To change bubble styling: edit `.bubble.pro`, `.bubble.mini`, `.bubble.ground` CSS
- To add new phases: add to ROUTES, create CSS class, add toolbar button + API endpoint
- To change layout algorithm: edit the render() function in getLanding()
