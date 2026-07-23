# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# RO-Style MMO Web Game

You are a senior full-stack game developer working on a Ragnarok Online-style MMORPG web game.

## Coding Standards
- TypeScript strict mode — always type everything, no "any"
- Server is AUTHORITATIVE — all game logic validated server-side
- Functional components with hooks (React)
- Async/await with proper error handling (try/catch + typed errors)
- Write clean, modular code — one responsibility per file
- Comment complex game formulas (e.g. damage calc, hit/flee)

When building a feature, always:
1. Show the full TypeScript file(s) — no partial snippets unless asked
2. Include the Socket.io event types on both client and server
3. Show the Prisma schema change if DB is needed
4. Show the Redis key pattern if caching is involved
5. Mention any new dependencies to install

## Project Overview
Ragnarok Online-inspired 2.5D isometric MMORPG running in browser.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + PixiJS 8 + Zustand + Socket.io-client
- **Backend**: Node.js 20 + Express + TypeScript + Socket.io 4 + Worker Threads (game loop 20 ticks/sec)
- **DB**: PostgreSQL 16 (Prisma ORM) + Redis 7 (ioredis)
- **Auth**: JWT (1h) + refresh token (7d in Redis) + bcrypt (12 rounds)
- **Validation**: Zod
- **Monorepo**: pnpm workspaces

## Project Structure
```
client/src/          — Next.js app (port 3000)
  app/               — App Router pages (/, /game, /character-select, /character-create)
  components/        — React components (HUD, windows, forms)
  game/renderer/     — PixiJS map, sprite, camera, effects
  game/systems/      — Client-side prediction
  hooks/             — Custom React hooks
  stores/            — Zustand stores (authStore)
  utils/             — Helpers (api.ts fetch wrapper with auto token refresh)

server/src/          — Node.js game server (API port 3001, Socket port 3002)
  api/routes/        — Express routes (auth, characters)
  api/validators/    — Zod schemas
  game/loop/         — Worker thread game loop
  game/systems/      — combat, ai, skills, drops
  game/maps/         — Map loader
  game/monsters/     — Monster spawn manager
  socket/            — Socket.io /game namespace (JWT auth)
  db/                — prisma.ts (singleton), redis.ts (helpers)
  middleware/        — auth.ts (verifyJWT), validate.ts (Zod)

shared/src/          — @ro-game/shared (workspace package)
  types/             — user, character, socket event types
  constants/         — game defaults, formulas

data/                — JSON game data (maps, monsters, items, skills)
```

## Database (Prisma)
Models: User, Character, Item, Inventory, Skill, CharacterSkill, Guild, GuildMember, MapDefinition, MonsterDefinition, MonsterDrop, MonsterSpawn, WarpPoint, Quest, CharacterQuest

## Key Patterns
- Server is **authoritative** — all game logic validated server-side
- TypeScript **strict mode** everywhere — no `any`
- Shared types via `@ro-game/shared` workspace package
- API routes use Zod validation middleware
- Socket.io uses JWT from handshake auth
- Redis keys: `refresh_token:{userId}`, `session:{characterId}`

## Game Formulas (RO-style)
- ATK = STR + WeaponATK + (STR/10)^2
- MATK = INT + (INT/7)^2 + SkillLevel * Multiplier
- Hit = DEX + BaseLevel, Flee = AGI + BaseLevel
- HitRate = 80 + Hit - Flee (clamped 5-95%)
- Crit = LUK/3 (1.4x damage, ignores DEF)
- MaxHP = 35 + (BaseLevel * 5) + (VIT * 8)
- MaxSP = 10 + (BaseLevel * 2) + (INT * 5)

## Character System
- 6 stats: STR, AGI, VIT, INT, DEX, LUK (start at 1)
- Classes: Novice → 1st Job (Lv10) → 2nd Job (Job Lv40)
- Base Level 1-99, Job Level 1-50
- Start: statPoints=10, zeny=500, map=prontera

## Game Engine (client/src/game/)
- `GameEngine.ts` — Main engine: PixiJS, map, camera, click-to-move/attack/pickup, monsters, drops, damage text
- `renderer/isometric.ts` — tileToScreen / screenToTile conversion
- `renderer/MapRenderer.ts` — Renders tile grid with ground/entity/effect layers
- `renderer/Camera.ts` — Smooth lerp camera follow (factor 0.08)
- `renderer/PlayerSprite.ts` — Player visual with name label, movement interpolation
- `renderer/MonsterSprite.ts` — Monster visual with HP bar, name label, movement interpolation
- `renderer/DropSprite.ts` — Item drop visual with bobbing animation
- `renderer/DamageText.ts` — Floating damage numbers (normal/crit/miss)
- `systems/pathfinding.ts` — A* pathfinding with diagonal support

## Real-time System (Phase 2)
- `server/src/game/GameState.ts` — In-memory authoritative state (players per map, dirty tracking)
- `server/src/game/loop/GameLoop.ts` — 20 ticks/sec loop: process movement, broadcast state deltas
- `server/src/game/systems/movement.ts` — Path validation, step-by-step movement
- `server/src/game/maps/MapLoader.ts` — Load/cache map JSON data
- `server/src/socket/index.ts` — Socket.io /game namespace: join, move, attack, chat, equip, shop, disconnect
- `client/src/hooks/useSocket.ts` — React hook: connect, sendMove, sendChat, sendAttack, sendPickup, sendEquip, sendShopBuy/Sell
- State delta pattern: only dirty players broadcast per tick, scoped to map room

## Combat System (Phase 3)
- `server/src/game/systems/combat.ts` — RO damage formulas (ATK, hit/flee, crit)
- `server/src/game/systems/ai.ts` — Monster AI (passive/aggressive/assist/boss)
- `server/src/game/systems/drops.ts` — Drop generation, despawn timers, ownership priority
- `server/src/game/systems/experience.ts` — EXP tables, level up (base/job), stat points
- `server/src/game/monsters/SpawnManager.ts` — Monster spawn/respawn from JSON data

## Inventory & Shop System (Phase 4)
- `server/src/game/systems/inventory.ts` — Load/equip/unequip/use items, stat recalculation
- `server/src/game/systems/shop.ts` — NPC shop buy/sell logic with zeny
- `data/shops/shops.json` — 3 NPC shops (weapon, armor, item) in Prontera
- `client/src/components/InventoryWindow.tsx` — Item grid with tabs (All/Equip/Use/Etc), equip/use actions
- `client/src/components/EquipmentWindow.tsx` — Equipment slots display, unequip
- `client/src/components/ShopWindow.tsx` — Buy/sell with quantity selector
- Socket events: inventory:load, inventory:update, item:equip/unequip/use, shop:buy/sell, shop:open
- Keyboard: I=Inventory, E=Equipment, S=Skills, A=Status, Q=Quests, P=Party, G=Guild, Esc=Close

## Status & Death Systems
- `server/src/game/systems/stats.ts` — allocateStatPoints (DB-authoritative, shared by REST route + `stats:allocate` socket event); caller must sync new values into in-memory PlayerState
- `server/src/game/systems/experience.ts` — grantLevelUpPoints: +3 statPoints/base level, +1 skillPoint/job level, persisted immediately on level up
- `client/src/components/StatusWindow.tsx` — stat allocation UI (A key); STA quick button shows pending points
- Death: GameLoop emits `player:dead` → client shows blocking overlay → `player:respawn` revives full HP/SP at Prontera via warpPlayer; joining with hp≤0 auto-revives
- PlayerStats fields zeny/statPoints/skillPoints are optional — omitted when unknown, client keeps last value (never send 0 as placeholder)
- Socket events: stats:allocate/update, player:dead/respawn

## Skill System (Phase 5)
- `server/src/game/systems/skills.ts` — Learn skills with skill points (from job level up), use skills (SP cost, cooldown, damage/heal/buff); skill defs imported from `data/skills/*.json` per class
- `client/src/components/SkillWindow.tsx` — Skill tree UI, learn with skill points
- `client/src/components/SkillBar.tsx` — Hotbar for skill use
- `data/skills/novice.json`, `data/skills/swordsman.json` — Skill definitions per class
- Socket events: skills:load, skills:update, skill:learn, skill:use

## Party, Chat & Guild (Phase 6)
- `server/src/game/systems/party.ts` — In-memory parties: max 12 members, shared EXP on same map (split equally), leader kick
- `server/src/game/systems/guild.ts` — DB-persisted guilds (Guild + GuildMember models): leader invites/promotes/kicks, guild chat channel
- `client/src/components/PartyWindow.tsx`, `client/src/components/GuildWindow.tsx`
- Socket events: party:invite/invited/accept/decline/leave/kick/update, guild:create/invite/invited/accept/decline/leave/update, chat:send, chat:message

## Quests, Warps & NPCs (Phase 7)
- `server/src/game/systems/quests.ts` — Quest defs from `data/quests/quests.json`; kill objectives tracked in CharacterQuest.progress JSON (`kill_<monsterId>: count`); accept/complete at NPC; rewards = EXP + zeny + items
- `server/src/game/systems/warp.ts` — getWarpAt + buildFullState; GameLoop.handleWarp fires when a player steps on a warp tile: switches GameState room + socket rooms, emits map:change + full state:delta, persists position
- NPC interaction: `npc:talk` handler (range ≤ 4 tiles) — shop NPC → shop:open (this is the ONLY way shops open), quest NPC → npc:dialog with accept/complete choices
- NPCs are defined in map JSON `npcPositions` (ids must match shops.json npcId for shop NPCs); rendered client-side via `renderer/NpcSprite.ts`, click to talk
- `client/src/components/QuestWindow.tsx` (Q key), `NpcDialogWindow.tsx`
- Map change flow: server emits map:change → client updates character state → GameEngine recreated with new map; state:delta arriving during re-init is buffered in pendingDeltaRef and applied after init
- `player:leave` event removes departed players' sprites (warp + disconnect)
- Socket events: npc:talk, npc:dialog, quest:accept, quest:complete, quests:load/update, map:change, player:leave
- Maps: prontera ⇄ prt_fild01 ⇄ prt_fild02; warp destinations must NOT land on the target map's return warp tile (infinite loop)

## Seed Data (data/)
- `data/maps/prontera.json` — 40x40 town map with shops + quest NPC (Sergeant Alto)
- `data/maps/prt_fild01.json` — 50x50 field map (Poring, Fabre)
- `data/maps/prt_fild02.json` — 50x50 field map (Lunatic, Willow, Wolf)
- `data/monsters/monsters.json` — 5 monsters (Poring, Fabre, Lunatic, Willow, Wolf)
- `data/items/items.json` — 24 items (ETC drops, consumables, weapons, armor)
- `data/skills/novice.json`, `data/skills/swordsman.json` — Skills per class
- `data/quests/quests.json` — 3 kill quests from Sergeant Alto (Lv1/3/10)
- `server/src/db/seed.ts` — Seed script: `pnpm --filter @ro-game/server run db:seed`
- Seeds dev test account: **test@test.com / test1234** (character "Tester")

## Dev Commands
```bash
docker compose up -d          # Start PostgreSQL + Redis
pnpm install                  # Install all deps (postinstall runs prisma generate)
pnpm db:migrate               # Run Prisma migrations
pnpm db:generate              # Generate Prisma client
pnpm db:studio                # Open Prisma Studio
pnpm --filter @ro-game/server run db:seed   # Seed game data
pnpm dev                      # Start client + server
pnpm dev:client               # Start Next.js (port 3000)
pnpm dev:server               # Start backend (port 3001/3002)
pnpm build                    # Build shared, then client + server (tsc / next build)
```
- Env: copy `server/.env.example` → `server/.env` and `client/.env.example` → `client/.env.local` before first run
- Node 20 (`.nvmrc`), pnpm 10
- No lint or test tooling is configured yet — verify changes with `pnpm build` (type-checks via tsc/next build)

## Development Roadmap
- [x] Phase 0: Project setup, auth, character CRUD
- [x] Phase 1: Character creation UI, PixiJS map rendering, click-to-move
- [x] Phase 2: Real-time player sync (Socket.io)
- [x] Phase 3: Monsters, combat, drops, EXP/level up
- [x] Phase 4: Inventory, equipment, NPC shops
- [x] Phase 5: Skill system, skill tree UI
- [x] Phase 6: Party, chat, guild
- [x] Phase 7: Quests, map warps, multiple maps
- [ ] Phase 8: Polish, optimization, anti-cheat
