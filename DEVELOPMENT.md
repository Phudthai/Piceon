# 🎮 Piceon - Idle RPG Development Log

## 📋 Project Overview
- **Project Name**: Piceon
- **Type**: Idle RPG Game
- **Phase 1 Focus**: Character System, Gacha System, Inventory System
- **Started**: 2025-01-14
- **Current Phase**: Phase 2 Complete + Enhanced Team Management (2025-11-20)
- **Database**: `picoen` (MariaDB/MySQL)

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v18+
- MariaDB/MySQL
- Git

### 1. Initial Setup
```bash
# Clone repository (if applicable)
cd /Users/kanokpol/Piceon

# Start MariaDB
mysql.server start

# Create database
mysql -u root -p
CREATE DATABASE picoen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 2. Database Setup
```bash
# Import main schema (users, characters, gacha)
mysql -u root -p picoen < backend/database/schema.sql

# Import battle system schema (teams, stages, battles)
mysql -u root -p picoen < backend/database/battle_system_schema.sql

# Verify tables created
mysql -u root -p picoen -e "SHOW TABLES;"
# Should show: 9 tables
```

### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment (if .env doesn't exist)
cp .env.example .env
# Edit .env:
# - DB_HOST=localhost
# - DB_USER=root
# - DB_PASSWORD=your_password
# - DB_NAME=picoen
# - JWT_SECRET=your_secret_key

# Start development server
npm run dev
# Backend runs on http://localhost:3000
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment (if needed)
cp .env.example .env.local
# Default: VITE_API_BASE_URL=http://localhost:3000/api

# Start development server
npm run dev
# Frontend runs on http://localhost:5173 or 5174
```

### 5. Test the Application
```bash
# Open browser: http://localhost:5173 (or 5174)
# Register new account or use test account:
# Username: player1
# Email: player1@example.com
# Password: password123
```

### 6. Stopping Servers
```bash
# Kill backend
lsof -ti:3000 | xargs kill -9
pkill -f nodemon

# Kill frontend
lsof -ti:5173 | xargs kill -9
lsof -ti:5174 | xargs kill -9

# Stop MariaDB (optional)
mysql.server stop
```

---

## 🎯 Core Features (Phase 1)

### 1. Character System
- ✅ Character templates with types (Warrior, Mage, Archer, Tank, Assassin)
- ✅ Rarity levels: Common, Rare, Epic, Legendary
- ✅ Base attributes: ATK, DEF, HP, Special Ability
- ✅ Level and upgrade system

### 2. Gacha System
- ✅ Multiple pull types: Normal (100 Gold), Premium (300 Gems), 10x Pull (2700 Gems)
- ✅ Drop rates based on rarity
- ✅ Pity system (90 pulls = 1 Legendary guaranteed)
- ✅ Gacha history tracking

### 3. Inventory System
- ✅ Limited inventory slots (default: 50)
- ✅ Lock/unlock characters
- ✅ Sell/dismantle characters
- ✅ Sort and filter capabilities
- ✅ Character upgrade system

---

## 🗄️ Database Schema

### Core Tables (5):
1. **users** - User accounts and resources
2. **character_templates** - Master character data
3. **player_characters** - User's character inventory
4. **gacha_history** - Pull history tracking
5. **gacha_banners** - Available gacha banners

### Battle System Tables (4):
6. **player_teams** - User's team compositions
7. **battle_stages** - Battle stage definitions
8. **battles** - Battle history and results
9. **player_progress** - Stage completion tracking

### Skills System Tables (2) - NEW! 🆕:
10. **character_skills** - All available skills (38 skills)
11. **character_template_skills** - Character-Skill relationships

**Total Tables**: 11

### Resources:
- **Gems**: Premium currency (starting: 300)
- **Gold**: Basic currency (starting: 10,000)
- **Inventory Slots**: Default 50 slots

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (sets httpOnly cookie)
- `POST /api/auth/login` - User login (sets httpOnly cookie)
- `GET /api/auth/profile` - Get user profile (requires auth)
- `POST /api/auth/logout` - Logout user (clears cookie) [New!]
- `GET /api/auth/resources` - Get user resources (requires auth)

### Characters
- `GET /api/characters/templates` - List all character templates
- `GET /api/characters/templates/:id` - Get character details
- `GET /api/characters/templates/:id/skills` - Get character skills (with level param)
- `GET /api/characters/templates/:id/skills/unlocked` - Get unlocked skills only

### Inventory
- `GET /api/inventory` - Get user's characters
- `PUT /api/inventory/:id/lock` - Lock/unlock character
- `DELETE /api/inventory/:id` - Sell character
- `PUT /api/inventory/:id/upgrade` - Upgrade character

### Gacha
- `GET /api/gacha/banners` - List active banners
- `POST /api/gacha/pull` - Single pull
- `POST /api/gacha/pull-10` - 10x pull
- `GET /api/gacha/history` - Pull history

### Resources
- `GET /api/resources` - Get user's resources (gems, gold)

### Teams
- `GET /api/teams` - Get user's teams
- `GET /api/teams/:id` - Get team by ID with characters
- `GET /api/teams/active` - Get active team
- `POST /api/teams` - Create new team
- `PUT /api/teams/:id` - Update team (name, slots)
- `PUT /api/teams/:id/activate` - Set team as active
- `DELETE /api/teams/:id` - Delete team
- `GET /api/teams/:id/power` - Calculate team power

### Battles
- `GET /api/battles/stages` - Get all battle stages
- `POST /api/battles/start` - Start battle with stage_id
- `GET /api/battles/history` - Get battle history

### Items & Equipment 🆕
- `GET /api/items/catalog` - Get items catalog (public, with filters)
- `GET /api/items/inventory` - Get user's item inventory
- `GET /api/items/inventory/type/:type` - Get inventory by type (material/consumable/special)
- `GET /api/items/inventory/:itemId` - Get item details
- `POST /api/items/inventory/add` - Add item to inventory (admin/rewards)
- `POST /api/items/inventory/remove` - Remove items from inventory
- `POST /api/items/inventory/use` - Use consumable item

### Equipment 🆕
- `GET /api/equipment` - Get user's equipment
- `GET /api/equipment/:id` - Get equipment by ID
- `POST /api/equipment/create` - Create equipment instance (from drops/rewards)
- `PUT /api/equipment/:id/upgrade` - Upgrade equipment level
- `PUT /api/equipment/:id/star` - Upgrade equipment stars
- `PUT /api/equipment/:id/equip` - Equip/unequip to character
- `PUT /api/equipment/:id/lock` - Lock/unlock equipment
- `DELETE /api/equipment/:id` - Sell equipment for gold

---

## 📦 Tech Stack

### Backend
- Node.js + Express.js
- MySQL (MariaDB)
- JWT Authentication
- bcrypt (password hashing)

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Zustand (state management)
- Axios (HTTP client)
- TailwindCSS (styling)
- React Router v6

---

## 📝 Development Progress

### 🆕 Latest Updates (2025-11-21)

**Session Management & Security**:
- ✅ Cookie-based authentication (httpOnly cookies)
- ✅ Custom cookie name: `picoen-access-token`
- ✅ Automatic session persistence across browser restarts
- ✅ Logout endpoint with cookie clearing

**Enhanced Team Management**:
- ✅ Edit/Modify existing teams
- ✅ Character filters (Type + Rarity)
- ✅ Delete team functionality with confirmation
- ✅ Improved UI with 3-button layout (Edit, Set Active, Delete)
- ✅ Auto-clear edit mode when deleting edited team

**Skills System** 🆕:
- ✅ Complete skill system database design
- ✅ 38 unique skills (21 active + 17 passive)
- ✅ Skill distribution by rarity:
  - Common: 2 skills (1 active + 1 passive)
  - Rare: 3 skills (2 active + 1 passive)
  - Epic: 3 skills (2 active + 1 passive)
  - Legendary: 4 skills (2-3 active + 1-2 passive)
- ✅ Skill categories: damage, heal, buff, debuff, passive effects
- ✅ Advanced skill mechanics: trigger rate, cooldown, duration, priority
- ✅ Level-based skill unlocking (unlock at levels 1, 5, 10, 15)
- ✅ **Skill Model (models/Skill.js)**: Complete CRUD operations for skills
- ✅ **Battle Integration**: Skills fully integrated into combat
  - Passive skills apply stat boosts before battle starts
  - Active skills trigger based on trigger_rate and cooldown mechanics
  - Skill effects: damage (single/AoE/multi), heal, buff, debuff, DoT
  - Advanced combat mechanics: Crit, Dodge, Counter, Lifesteal, Last Stand
  - Enhanced battle log tracks all skill usage and effects

### ✅ Completed Tasks

**Backend (100% Complete)**:
- [x] Database schema (schema.sql) with 25 characters (covering all 38 skills)
- [x] Models: BaseModel, User, Character, PlayerCharacter, Gacha
- [x] Middleware: auth.js, validation.js
- [x] Controllers: BaseController, Auth, Character, Gacha, Inventory
- [x] Routes: auth, characters, gacha, inventory
- [x] Server setup (server.js, database.js, .env.example)

**Frontend (Core Complete - 80%)**:
- [x] Vite + React 18 + TypeScript setup
- [x] TailwindCSS configuration
- [x] TypeScript types & interfaces
- [x] API client with axios interceptors
- [x] Services: auth, character, gacha, inventory
- [x] Zustand stores: useAuthStore, useCharacterStore, useGachaStore, useInventoryStore
- [x] Main app structure (App.tsx, main.tsx, routing)
- [x] Basic pages: Home, Login, Gacha (placeholder), Inventory (placeholder)

### ✅ Completed Features (Phase 1)

### Core Systems (100%)
- ✅ **Authentication System**
  - User registration and login with JWT
  - Password hashing with bcrypt
  - Protected routes and token refresh
  - User profile management
  - **Session Management with Cookies** (New!)
    - httpOnly cookies for JWT storage
    - Automatic session persistence across page reloads
    - Secure cookie configuration (SameSite + HTTPS for production)
    - Logout with cookie clearing
    - Session verification on app startup

- ✅ **Gacha System**
  - Normal banner (100 Gold per pull)
  - Premium banner (300 Gems per pull)
  - 10x multi-pull with discounts
  - Pity system (90 pulls = guaranteed Legendary)
  - Pull history tracking
  - Real-time resource updates

- ✅ **Inventory System**
  - Character grid view with rarity colors
  - Filter by rarity (All, Common, Rare, Epic, Legendary)
  - Sort by: Recently Obtained, Level, Rarity, Attack
  - Character count and inventory stats
  - Lock/Favorite indicators
  - Full character management

- ✅ **Character Upgrade System**
  - Character detail modal with full stats
  - Level up system with dynamic pricing (100 × 1.5^level Gold)
  - Lock/Unlock character protection
  - Favorite/Unfavorite management
  - Sell character for gold rewards
  - Real-time validation and updates

### Technical Implementation (100%)
- ✅ Database: 11 tables (5 core + 4 battle + 2 skills)
- ✅ Backend API: 20+ endpoints fully functional
- ✅ Frontend UI: React + TypeScript + Tailwind
- ✅ State Management: Zustand stores
- ✅ Error Handling: Comprehensive validation
- ✅ Responsive Design: Mobile-friendly UI
- ✅ Skills System: 38 unique skills with advanced mechanics

## 🚀 Next Phase Features

### High Priority
- [x] **Team Formation System** - Complete! (Edit, Delete, Filters)
- [x] **Character Skills Database** - Complete! (38 skills, all rarities)
- [ ] **Skills in Battle** - Integrate skills into combat system
- [ ] **Auto-Battle System** - Idle combat mechanics
- [ ] **Daily Rewards** - Login bonuses and streaks

### Medium Priority
- [ ] **Player Profile** - Statistics and achievements
- [ ] **Quest System** - Daily/Weekly missions
- [ ] **Shop System** - Buy gems/items with real pricing

### Low Priority
- [ ] **Leaderboards** - Competitive rankings
- [ ] **Social Features** - Friend system
- [ ] **Events** - Limited-time banners

---

## 🎲 Gacha Drop Rates

### Normal Pull (100 Gold)
| Rarity | Rate |
|--------|------|
| Common | 70% |
| Rare | 25% |
| Epic | 4.5% |
| Legendary | 0.5% |

### Premium Pull (300 Gems)
| Rarity | Rate |
|--------|------|
| Common | 50% |
| Rare | 35% |
| Epic | 13% |
| Legendary | 2% |

### 10x Pull (2700 Gems)
- Same rates as Premium Pull
- **Guaranteed**: At least 1 Epic or higher
- **Pity System**: Every 90 pulls guarantees 1 Legendary

---

## 💫 Skills System Details

### Skill Types & Categories

**Active Skills (21 total)**:
- **Offensive** (9): single_damage, aoe_damage, multi_target, execute, bleed, poison
- **Defensive** (3): heal, shield, taunt
- **Support/Buff** (4): buff_atk, buff_def, speed_buff, revive
- **Debuff** (5): debuff_atk, debuff_def, stun, silence, weaken, armor_break

**Passive Skills (17 total)**:
- **Combat** (6): crit_chance, crit_damage, lifesteal, counter_attack, dodge, first_strike
- **Stats** (3): atk_boost, def_boost, hp_boost
- **Special** (2): hp_regen, last_stand

### Skill Mechanics

**Trigger System**:
- `trigger_rate`: 20%-100% chance to activate (active skills only)
- `cooldown`: 0-5 turns before skill can be reused
- `priority`: 1-10 execution order (1 = highest)
- `duration`: 1-3 turns for buffs/debuffs/DoT effects

**Target Types**:
- `self`: Affects the caster
- `single_enemy`: Single target damage/debuff
- `all_enemies`: AOE attacks
- `ally`: Single ally support
- `all_allies`: Team-wide buffs/heals
- `random_enemies`: Multi-target random hits

**Skill Unlock System**:
- Level 1: First 1-2 skills unlocked
- Level 5: Rare characters unlock 3rd skill
- Level 10: Epic characters unlock 3rd skill
- Level 15: Legendary characters unlock 4th skill

### Example Character Skills

**Rookie Warrior (Common)**:
1. Power Strike - 150% single damage, 50% trigger, 2 turn cooldown
2. Battle Stance - Passive +15% ATK

**Shadow Assassin (Rare)**:
1. Shadow Strike - 250% guaranteed crit, 70% trigger
2. Poison Blade - 50% damage x3 turns, 40% trigger
3. Evasion - Passive 25% dodge (unlock lv5)

**Death Reaper (Legendary)**:
1. Execute - Up to 300% based on missing HP
2. Poison Blade - 50% damage x3 turns
3. Evasion - Passive 25% dodge (unlock lv10)
4. Lifesteal - Passive 20% heal from damage (unlock lv15)

---

## 📌 Notes & Reminders

- Mock images for characters (will be replaced later)
- UI design is secondary - focus on functionality first
- Future features: Daily rewards, Quests, Missions (Phase 2+)
- Character trading system (Future consideration)

---

## 🐛 Known Issues
- None yet

---

## 📅 Change Log

### 2025-01-14

**Backend Development (100% Complete)**:
- ✅ Database schema with 5 tables + 25 sample characters
- ✅ 5 Models: BaseModel, User, Character, PlayerCharacter, Gacha
- ✅ 2 Middleware: auth (JWT), validation (express-validator)
- ✅ 5 Controllers: BaseController, Auth, Character, Gacha, Inventory
- ✅ 4 Routes: /api/auth, /api/characters, /api/gacha, /api/inventory
- ✅ Full gacha system logic with pity counter
- ✅ Inventory management with lock/favorite/upgrade/sell

**Frontend Development (Core 80% Complete)**:
- ✅ Vite + React 18 + TypeScript + TailwindCSS setup
- ✅ Complete type definitions (types/index.ts)
- ✅ 4 Services: api, auth, character, gacha, inventory
- ✅ 4 Zustand stores with full state management
- ✅ Routing with protected routes
- ✅ 4 Pages: Home, Login, Gacha (placeholder), Inventory (placeholder)

**Files Created**: 40+ files including backend (16 files) and frontend (24+ files)

---

### 2025-11-19

**System Setup & Integration**:
- ✅ Database `picoen` created and configured
- ✅ MariaDB server running on localhost:3306
- ✅ Backend server running on port 3000
- ✅ Frontend dev server running on port 5174
- ✅ Database schema imported with 20 sample characters (5 per rarity)
- ✅ User registration and authentication tested successfully

**Frontend UI Implementation (90% Complete)**:
- ✅ **GachaPage**: Fully functional gacha system
  - Banner selection (Normal/Premium)
  - Single pull and 10x pull functionality
  - Real-time character reveal with rarity colors
  - Resource updates (gems/gold)
  - Visual feedback with rarity-based styling
- ✅ **InventoryPage**: Complete inventory management
  - Character grid with rarity-based colors
  - Filter by rarity (All, Common, Rare, Epic, Legendary)
  - Sort by: Recently Obtained, Level, Rarity, Attack
  - Character count display
  - Lock/Favorite indicators
  - Character stats display (ATK, DEF, HP)
- ✅ **AuthStore**: Added `updateUser()` method for resource updates

**Testing Status**:
- ✅ Backend API endpoints tested and working
- ✅ Database connectivity verified
- ✅ User authentication flow complete
- ✅ Gacha system ready for live testing
- ✅ Inventory system ready for live testing

**Current Status**:
- 🟢 Backend: Running (http://localhost:3000)
- 🟢 Frontend: Running (http://localhost:5174)
- 🟢 Database: Connected
- 🟢 Authentication: Working
- 🟢 Gacha System: **Fully Functional**
- 🟢 Inventory System: **Fully Functional**

**Test Account**:
- Username: `player1`
- Email: `player1@example.com`
- Password: `password123`
- Starting Resources: 💎 300 Gems, 🪙 10,000 Gold

---

**Character Upgrade System (100% Complete)**:
- ✅ **CharacterModal Component**: Full character detail modal
  - Character stats display (ATK, DEF, HP, Level)
  - Upgrade system with cost calculation (100 * 1.5^level)
  - Real-time gold check and validation
  - Lock/Unlock toggle functionality
  - Favorite/Unfavorite toggle functionality
  - Sell character with gold reward
  - Locked character protection (cannot sell)
- ✅ **Inventory Integration**: Click character to open modal
- ✅ **API Endpoints**: All backend endpoints working
  - `PUT /api/inventory/:id/upgrade` - Upgrade character level
  - `PUT /api/inventory/:id/lock` - Lock/unlock character
  - `PUT /api/inventory/:id/favorite` - Favorite/unfavorite character
  - `DELETE /api/inventory/:id` - Sell character for gold

**Features Summary**:
- 🎲 **Gacha System**: Single pull, 10x pull, pity system (90 pulls)
- 📦 **Inventory**: Filter, sort, view all characters
- ⚡ **Character Upgrade**: Level up characters with gold
- 🔒 **Character Management**: Lock, favorite, sell characters
- 💰 **Economy**: Gems (premium), Gold (basic), dynamic pricing

---

## 📊 Project Statistics (as of 2025-11-19)

**Development Time**: ~6 hours total
**Code Files Created**: 51+ files
- Backend: 22 files (Models, Controllers, Routes, Middleware)
- Frontend: 29+ files (Pages, Components, Stores, Services)

**Database**:
- Tables: 9 (users, character_templates, player_characters, gacha_banners, gacha_history, player_teams, battle_stages, battles, player_progress)
- Sample Data: 20 characters (5 per rarity), 2 gacha banners, 6 battle stages

**API Endpoints**: 28+ endpoints
- Authentication: 3 endpoints
- Gacha: 5 endpoints
- Inventory: 5 endpoints
- Characters: 2 endpoints
- Teams: 8 endpoints
- Battles: 5 endpoints

**Lines of Code**: ~3,700+ lines
- Backend: ~2,000 lines
- Frontend: ~1,700 lines

**Features Completed**: 6 major systems
1. Authentication & User Management
2. Gacha System with Pity
3. Inventory Management
4. Character Upgrade System
5. Team Formation & Management
6. Battle System with Progression
7. Lobby/Dashboard Hub

**Current Game State**:
- ✅ Fully playable core loop
- ✅ Working economy (Gems/Gold)
- ✅ Character progression system
- ✅ Collection management

**Battle System (100% Complete - 2025-11-19)**:
- ✅ **Team Formation System**
  - Create and manage up to multiple teams
  - 5 character slots per team
  - Set active team for battles
  - Team power calculation
  - Character validation (no duplicates)
  - **Edit/Modify existing teams** (Updated 2025-11-20)
    - Edit button on each team card
    - Load team data into formation slots
    - Update team composition
    - Cancel edit to clear selection
  - **Character Filters** (Updated 2025-11-20)
    - Filter by character type (Warrior, Mage, Archer, Tank, Assassin)
    - Filter by rarity (Common, Rare, Epic, Legendary)
    - Combined filters (Type + Rarity)
    - Clear filters button
    - Character count display
  - **Delete Team** (Updated 2025-11-20)
    - Delete button on each team card
    - Confirmation dialog before deletion
    - Auto-clear edit mode if deleted team was being edited
    - Cannot delete if team is active (must set another team active first)
- ✅ **Battle System**
  - 6 stages (Easy → Expert difficulty)
  - Turn-based combat simulation
  - Stage progression system
  - Unlock requirements
  - Battle history tracking
- ✅ **Rewards System**
  - Gold and EXP rewards
  - Difficulty-based multipliers
  - Victory/Defeat handling
  - Progress tracking
- ✅ **Frontend UI**
  - Team Formation page (/team)
  - Battle page with stage selection (/battle)
  - Battle result modal
  - Team power display
- ✅ **Battle Scene Component** (Updated 2025-11-20)
  - Full-screen turn-based battle visualization
  - Character vs Enemy display with animations
  - Turn-by-turn combat display (auto-advance every 1.5s)
  - Damage numbers with animations
  - Real-time HP bars for both teams
  - Character highlighting (attacker/target)
  - Skip Battle button for instant results
  - Victory/Defeat animations
  - **Bug Fixes (2025-11-20)**:
    - Fixed unique ID system for duplicate character names
    - Fixed HP calculation using uniqueId instead of name
    - Fixed turn counting logic (1 turn = 2 attacks)
    - Fixed frontend displaying all attacks instead of just turn count
    - Fixed enemy HP showing negative values
    - Added proper attack/turn display in UI

**Backend (Battle System)**:
- Models: Team, Stage, Battle, Skill
- Controllers: TeamController, BattleController
- Routes: /api/teams (8 endpoints), /api/battles (5 endpoints)
- Database: 6 tables (player_teams, battle_stages, battles, player_progress, character_skills, character_template_skills)
- **Skills Integration**:
  - Skill Model with full CRUD operations
  - Battle.js: loadCharacterSkills(), applyPassiveSkill(), processAttack(), processSkill()
  - Advanced combat: Crit, Dodge, Counter, Lifesteal, Last Stand, Buffs/Debuffs, DoT
  - Enhanced battle log with skill tracking
- **Battle Logic**:
  - Turn-based combat: 1 turn = Your team attack + Enemy attack
  - Damage calculation: ATK - (DEF × 0.5), minimum 1
  - Unique ID system for tracking duplicate character names
  - Victory condition: All enemies defeated
  - Defeat condition: All team members defeated or timeout (100 turns)
  - Battle log tracking with attackerId/targetId for accurate HP calculation

**Lobby/Dashboard System (100% Complete - 2025-11-20)**:
- ✅ **LobbyPage Component**
  - Central hub for all game features
  - Player statistics dashboard (characters, teams, stages cleared)
  - Resource display (Gems, Gold)
  - Feature tiles with navigation
  - Quick start guide for new players
- ✅ **Routing Updates**
  - Smart authentication routing
  - Auto-redirect to /lobby for authenticated users
  - Login redirects to lobby after success
  - Protected lobby route
- ✅ **Navigation Integration**
  - Links to all 4 main features (Gacha, Inventory, Team, Battle)
  - "Coming Soon" placeholders (Daily Rewards, Profile)
  - Logout functionality
  - User welcome message

**Frontend (Lobby)**:
- Page: LobbyPage.tsx
- Routes: Updated App.tsx routing logic
- Login flow: Updated post-login redirect

**Current Game Flow**:
1. User logs in → Redirected to /lobby
2. Lobby shows stats and all features
3. Navigate to any feature (Gacha, Inventory, Team, Battle)
4. Return to lobby as central hub

**Character Skills System** ✅ **FULLY IMPLEMENTED**:
- ✅ Complete skill system with 38 unique skills (21 active + 17 passive)
- ✅ Skills fully integrated into battle mechanics
- ✅ **Backend Implementation**:
  - **Skill Model** (models/Skill.js): getCharacterSkills(), getUnlockedSkills(), getSkillById()
  - **Battle Integration** (models/Battle.js):
    - loadCharacterSkills() - Loads skills before combat
    - applyPassiveSkill() - Applies passive stat boosts
    - processAttack() - Handles skill triggers with cooldowns
    - processSkill() - Executes skill effects on targets
- ✅ **Combat Mechanics**:
  - Passive skills: Crit, Dodge, Counter, Lifesteal, Stat Boosts, HP Regen, Last Stand
  - Active skills: Damage (single/AoE/multi), Heal, Buffs, Debuffs, DoT (Poison/Bleed)
  - Trigger system with cooldown management and trigger rates
- ✅ **Enhanced Battle Log**: Tracks skills, crits, dodges, counters, regen, buffs/debuffs
- ✅ **Frontend Integration** (COMPLETE):
  - SkillCard component with compact/full modes
  - Inventory page: Display all character skills with unlock status
  - Team Formation: Skills visible in character selection
  - Battle page: Real-time skill visualization in combat log
  - Support for all skill types: skills, crits, dodges, counters, heals, buffs, debuffs, Last Stand
- ✅ **Bug Fixes**:
  - Fixed "Bind parameters must not contain undefined" error in Battle.loadCharacterSkills()
  - Added support for both `character_template_id` and `template_id` field names
  - Battle system now works with character data from inventory
- ✅ **New Characters Added** (21-25):
  - **Holy Priest** (Rare Mage): Heal, Group Heal, HP Regen
  - **Battle Cleric** (Rare Tank): Guardian Shield, Weaken, Counter Strike
  - **Divine Healer** (Epic Mage): Group Heal, Revive, HP Regen
  - **War Priest** (Epic Warrior): Armor Break, Weaken, Counter Strike
  - **Archangel** (Legendary Mage): Group Heal, Revive, Heal, HP Regen
  - **Total Characters**: 25 (covering all 38 skills)

**🎒 Enhanced Inventory & Equipment System** 🆕 (Backend Complete - 2025-11-21):
- ✅ **Database Schema Complete**:
  - `items` table: 38 items (19 equipment, 13 materials, 3 consumables, 3 special)
  - `equipment_templates` table: 19 equipment templates
  - `player_inventory` table: Stackable items storage
  - `player_equipment` table: Individual equipment instances
  - Added equipment slots to `player_characters`: weapon, armor, accessory, artifact
  - Added character progression: stars (0-5), rank (E-SSS)
- ✅ **Models Created**:
  - `Item.js`: Items master data queries
  - `PlayerInventory.js`: Stackable items management (add/remove/use)
  - `Equipment.js`: Equipment instances, upgrade, enhance, equip/unequip
  - Updated `PlayerCharacter.js`: Added `calculateTotalStats()` and `getPlayerCharacterWithStats()`
  - Updated `Team.js`: Team power calculation includes equipment stats
- ✅ **Controllers & Routes Complete**:
  - `ItemInventoryController.js`: GET inventory, add/remove/use items, catalog
  - `EquipmentController.js`: GET equipment, create/upgrade/enhance, equip/lock/sell
  - `/api/items/*`: Item inventory routes
  - `/api/equipment/*`: Equipment management routes
  - Catalog endpoint public for browsing items
- 🔄 **Pending**:
  - Frontend UI for inventory/equipment
  - Update character upgrade to use items (gold + items hybrid)
  - Character ascension/evolution system implementation

**Item Categories**:
- **Equipment** (Non-stackable, max 1):
  - Weapons (5): Iron Sword → Excalibur (Common → Mythic)
  - Armor (5): Leather Armor → Aegis Shield
  - Accessories (5): Health Ring → Immortal Soul
  - Artifacts (4): Lucky Charm → Time Pendant
- **Materials** (Stackable, max 999):
  - EXP Potions (Small/Medium/Large), Level Stone
  - Enhancement Stones (Basic/Advanced/Master), Star Stone
  - Character Souls, Elemental Essences (Fire/Water/Wind/Earth)
- **Consumables** (Stackable, max 99):
  - Stamina Potion, Gold Boost, EXP Boost
- **Special** (Stackable, max 99):
  - Gacha Tickets, Inventory Expansion

**Equipment System**:
- Level: 0-20 (5% growth per level)
- Stars: ★☆☆☆☆ (0-5, +10% per star)
- Sub-stats: 0-3 random based on rarity
- Enhancement using Enhancement Stones + Gold
- Star upgrade using Star Stones + Gold

**Character Progression**:
- Leveling: Gold OR EXP Potions OR Hybrid (50% discount)
- Ascension: Star ★ system using Character Souls
- Evolution: Rank up (E→D→C→B→A→S→SS→SSS) using Elemental Essence

**Implementation Roadmap**:

**Phase 3.1: Equipment & Items Frontend** 🔴 HIGH PRIORITY
- [x] Equipment Management UI (2025-11-21)
  - [x] Equipment list page with grid/list view
  - [x] Equipment detail modal (stats, level, stars, sub-stats)
  - [x] Upgrade Level button (uses Enhancement Stones + Gold)
  - [x] Upgrade Stars button (uses Star Stones + Gold)
  - [x] Lock/Unlock toggle
  - [x] Sell equipment with confirmation
  - [x] Filter by type (weapon, armor, accessory, artifact)
  - [x] Filter by rarity (Common, Rare, Epic, Legendary, Mythic)
  - [x] Separate equipped/unequipped sections
  - [x] Equipment service & Zustand store
  - [x] Route added to /equipment
- [x] Character Equipment Slots (2025-11-21)
  - [x] Add 4 equipment slots to Character Modal (Weapon, Armor, Accessory, Artifact)
  - [x] Show equipped items with icons/names
  - [x] Unequip functionality with confirmation
  - [x] Display Total Stats (base + equipment bonuses with green +bonus)
  - [x] Visual indicator for empty slots with "Equip →" link
  - [x] Link to Equipment page for easy access
- [x] Item Inventory UI (2025-11-21) ✅ COMPLETE
  - [x] Tab system: All, Materials, Consumables, Special
  - [x] Item grid with quantity display (x999 badge)
  - [x] Item detail modal with description
  - [x] Use Item functionality for consumables with quantity selector
  - [x] Category icons and rarity colors
  - [x] Item service & Zustand store
  - [x] Route added to /items
  - [x] Link from Lobby page

**Phase 3.2: Character Progression Systems** 🟡 MEDIUM PRIORITY
- [ ] Hybrid Character Upgrade System
  - [ ] Update upgrade modal with 3 options: Gold Only, Items Only, Hybrid
  - [ ] Gold Only: Current system (100 × 1.5^level)
  - [ ] Items Only: EXP Potion + Level Stone
  - [ ] Hybrid: 50% Gold + 50% Items discount
  - [ ] Show cost preview for each option
- [ ] Character Ascension System (Stars)
  - [ ] Ascension modal UI
  - [ ] Cost: Character Soul + Gold
  - [ ] Star display: ☆☆☆☆☆ → ★★★★★
  - [ ] +10% stats per star bonus
  - [ ] Backend: Add ascension endpoint
- [ ] Character Evolution System (Rank)
  - [ ] Evolution modal UI
  - [ ] Cost: Elemental Essence (matching type) + Gold
  - [ ] Rank progression: E → D → C → B → A → S → SS → SSS
  - [ ] Unlock new skills or increase skill power
  - [ ] Backend: Add evolution endpoint

**Phase 3.3: Rewards & Integration** 🟡 MEDIUM PRIORITY
- [ ] Battle Rewards
  - [ ] Equipment drops from battles (Common/Rare)
  - [ ] Material drops (Enhancement Stones, EXP Potions)
  - [ ] Drop rate based on stage difficulty
  - [ ] Reward display after battle
- [ ] Daily Rewards System
  - [ ] Daily login tracking
  - [ ] 7-day login bonus calendar
  - [ ] Rewards: Gold, Gems, Gacha Tickets, Items
  - [ ] Streak bonus multiplier
- [ ] Gacha Item Drops
  - [ ] Add items to gacha pool (10% chance)
  - [ ] Possible items: Enhancement Stones, Star Stones, EXP Potions
  - [ ] Display item pulls in gacha results

**Phase 3.4: Shop System** 🟢 LOW PRIORITY
- [ ] Item Shop
  - [ ] Enhancement Stones shop (Gold)
  - [ ] Star Stones shop (Gold)
  - [ ] EXP Potions shop (Gold)
  - [ ] Stamina Potions shop (Gold)
- [ ] Equipment Shop
  - [ ] Basic equipment (Common/Rare) for Gold
  - [ ] Daily rotation system
- [ ] Premium Shop
  - [ ] Gem packages (real money simulation)
  - [ ] Bundle packs (Characters + Items + Gems)
  - [ ] Limited-time offers

**Future Features**:
- 🎁 Daily Rewards & Login Bonuses (Phase 3.3)
- 📊 Player Profile & Statistics Dashboard
- 🏆 Achievement System
- 🛒 Shop System (Phase 3.4)
- 🎨 Advanced Battle Animations (Particles, Sound Effects)
- 🎮 PvP Arena System

---

## 🐛 Known Issues & Solutions

### Issue 1: Battle Scene - Duplicate Character Names
**Problem**: Characters with same name (e.g., "Street Thief") showed incorrect HP because system used `char.name` for tracking.

**Root Cause**: Battle log used character name as identifier, causing HP calculation to use wrong character's data when names were duplicated.

**Solution** (Fixed 2025-11-20):
- Added `uniqueId` system: `team_${characterId}_${index}` for players, `enemy_${name}_${index}` for enemies
- Updated battle log to include `attackerId` and `targetId`

### Issue 2: Equipment Page - SQL Error "Unknown column 'pc.name'"
**Problem**: Equipment page failed to load with database error: `Unknown column 'pc.name' in 'SELECT'`

**Root Cause**: Equipment model joined `player_characters` table and tried to select `pc.name`, but the `player_characters` table doesn't have a `name` column. Character names are stored in the `character_templates` table.

**Solution** (Fixed 2025-11-21):
- Added `LEFT JOIN character_templates ct ON pc.template_id = ct.id` in `getUserEquipment()` query
- Changed `pc.name as equipped_on_character` to `ct.name as equipped_on_character`
- File: `/backend/models/Equipment.js` line 30-35

### Issue 3: Frontend - Corrupted Emoji Characters in JSX
**Problem**: Frontend compilation failed with JSX syntax errors due to corrupted emoji characters in multiple files.

**Root Cause**: Emoji characters were not properly encoded during file creation, resulting in invalid UTF-8 byte sequences that caused JSX parser errors.

**Solution** (Fixed 2025-11-21):
- **Items.tsx**: Fixed corrupted emojis in tab buttons (🔨 Materials, ⚡ Consumables, ✨ Special)
- **ItemModal.tsx**: Fixed all category icons (📖 📎 🔨 ⭐ 👻 🔥 ⚡ 🪙 📈 🎫 📦) and close button (✕)
- **EquipmentModal.tsx**: Fixed type icons (⚔️ 🛡️ 💍 ✨), stat icons (⚔️ 🛡️ ❤️), stars (★), lock icons (🔒 🔓)
- Created reusable Loading.tsx and Button.tsx components that were missing

**Files Fixed**:
- `/frontend/src/pages/Items.tsx`
- `/frontend/src/components/items/ItemModal.tsx`
- `/frontend/src/components/equipment/EquipmentModal.tsx`
- `/frontend/src/components/ui/Loading.tsx` (created)
- `/frontend/src/components/ui/Button.tsx` (created)
- Changed frontend HP calculation to use `uniqueId` instead of `name`

**Files Changed**:
- `backend/models/Battle.js` - Added uniqueId to combat simulation
- `frontend/src/components/BattleScene.tsx` - Updated HP tracking logic

### Issue 2: Turn Count Mismatch
**Problem**: Battle showed "Victory" but enemies appeared alive because frontend only displayed half of the attacks.

**Root Cause**:
- Backend: 1 turn = 2 attacks (team attack + enemy attack)
- Frontend: Was checking `currentTurn >= battleData.turns` instead of `battleData.log.length`
- Result: Only showed 10 attacks out of 20 total

**Solution** (Fixed 2025-11-20):
- Moved `turns++` to beginning of loop in backend
- Changed frontend to iterate through `battleData.log.length` instead of `turns`
- Added separate display: "Attack X / Y" and "Turn X / Y"

**Files Changed**:
- `backend/models/Battle.js` - Fixed turn increment position
- `frontend/src/components/BattleScene.tsx` - Updated loop conditions and display

### Issue 3: Enemy HP Showing Negative Values
**Problem**: Enemy HP displayed negative numbers (e.g., -238, -1518)

**Root Cause**: Backend sent `enemies` array after battle simulation where HP was already reduced to negative values.

**Solution** (Fixed 2025-11-20):
- Store `initialEnemies` before battle simulation
- Send initial HP values to frontend instead of post-battle HP
- Add `Math.max(0, hp)` in all HP calculations

**Files Changed**:
- `backend/models/Battle.js` - Store initial enemy HP before simulation
- `frontend/src/components/BattleScene.tsx` - Add Math.max(0, ...) guards

### Issue 4: Module Import Error - BattleScene
**Problem**: `Uncaught SyntaxError: The requested module '/src/services/api.ts' does not provide an export named 'api'`

**Root Cause**: Used named import `import { api }` but api.ts exports default

**Solution** (Fixed 2025-11-20):
- Changed from `import { api } from '@/services/api'`
- To `import api from '@/services/api'`

**File Changed**:
- `frontend/src/components/BattleScene.tsx`

### Issue 5: Bind Parameters Undefined Error
**Problem**: `Error: Bind parameters must not contain undefined. To pass SQL NULL specify JS null`

**Root Cause**:
- Frontend sent `stage_id` but backend expected `stageId`
- Also, characters array had empty slots causing undefined in battle simulation

**Solution** (Fixed 2025-11-20):
- Backend accepts both `stageId` and `stage_id` parameters
- Filter out empty character slots before battle simulation: `.filter(slot => slot.character)`

**Files Changed**:
- `backend/controllers/BattleController.js` - Accept both parameter names
- `backend/models/Battle.js` - Filter empty slots

---

## 🏗️ Code Architecture

### Project Structure
```
Piceon/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── controllers/
│   │   ├── BaseController.js    # Base with response helpers
│   │   ├── AuthController.js    # Login, Register, Profile
│   │   ├── CharacterController.js
│   │   ├── GachaController.js
│   │   ├── InventoryController.js
│   │   ├── TeamController.js
│   │   └── BattleController.js
│   ├── models/
│   │   ├── BaseModel.js         # CRUD operations
│   │   ├── User.js              # User + Resources
│   │   ├── Character.js         # Character templates
│   │   ├── PlayerCharacter.js   # User's characters
│   │   ├── Gacha.js             # Pull logic + Pity
│   │   ├── GachaHistory.js
│   │   ├── Team.js              # Team management
│   │   ├── Stage.js             # Battle stages
│   │   └── Battle.js            # Combat simulation
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── auth.js
│   │   ├── characters.js
│   │   ├── gacha.js
│   │   ├── inventory.js
│   │   ├── teams.js
│   │   └── battles.js
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   └── validation.js        # Input validation
│   ├── database/
│   │   ├── schema.sql           # Core tables (5)
│   │   └── battle_system_schema.sql  # Battle tables (4)
│   └── server.js                # Express app entry
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # Button, Input, Card, Modal
│   │   │   ├── layout/          # Navbar, Footer
│   │   │   ├── CharacterModal.tsx  # Character detail modal
│   │   │   └── BattleScene.tsx  # Turn-based battle UI
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── GachaPage.tsx
│   │   │   ├── InventoryPage.tsx
│   │   │   ├── TeamPage.tsx
│   │   │   ├── BattlePage.tsx
│   │   │   └── LobbyPage.tsx    # Main dashboard
│   │   ├── services/
│   │   │   └── api.ts           # Axios instance + interceptors
│   │   ├── stores/
│   │   │   ├── useAuthStore.ts  # User + Auth state
│   │   │   ├── useBattleStore.ts # Battle state
│   │   │   └── usePlayerStore.ts # Player stats
│   │   ├── types/
│   │   │   └── index.ts         # TypeScript interfaces
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Helper functions
│   │   └── App.tsx              # Main app + routing
│   └── public/
│       └── assets/              # Game assets
│
├── DEVELOPMENT.md               # This file
├── README.md                    # Project overview
├── BATTLE_SYSTEM.md            # Battle system documentation
└── CLAUDE.md                   # Claude Code instructions
```

### Key Design Patterns

#### 1. BaseModel Pattern (Backend)
All models extend `BaseModel` which provides:
```javascript
// CRUD operations
findAll(conditions, options)
findById(id)
findOne(conditions)
create(data)
update(id, data)
delete(id)
count(conditions)

// Query execution
executeQuery(sql, params)
```

**Usage Example**:
```javascript
class Team extends BaseModel {
  constructor() {
    super('player_teams'); // table name
  }

  async getActiveTeam(userId) {
    return await this.findOne({ user_id: userId, is_active: true });
  }
}
```

#### 2. BaseController Pattern (Backend)
All controllers extend `BaseController` which provides:
```javascript
// Response helpers
success(res, data, message)
error(res, message, statusCode)
notFound(res, message)
unauthorized(res, message)
forbidden(res, message)
validationError(res, errors)

// Utilities
asyncHandler(fn)  // Async error wrapper
paginate(query)   // Pagination helper
```

#### 3. Zustand State Management (Frontend)
Simple global state without boilerplate:
```typescript
// Define store
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  login: async (credentials) => { /* ... */ },
  logout: () => set({ user: null, token: null })
}));

// Use in component
const { user, login } = useAuthStore();
```

#### 4. Protected Routes (Frontend)
```typescript
// ProtectedRoute wrapper
<Route path="/battle" element={
  <ProtectedRoute>
    <BattlePage />
  </ProtectedRoute>
} />
```

### Battle System Flow

```
User Clicks "Start Battle"
         ↓
BattlePage.tsx: handleBattle(stageId)
         ↓
Shows BattleScene component
         ↓
BattleScene.tsx: useEffect → api.post('/battles/start')
         ↓
Backend: BattleController.startBattle()
         ↓
Battle.simulateBattle(userId, stageId)
         ↓
1. Get active team + characters
2. Get stage info + verify unlocked
3. Generate enemies based on stage
4. Store initialEnemies (for frontend display)
5. Run combat simulation:
   - Add uniqueId to all characters
   - Loop: team attacks → check victory → enemies attack → check defeat
   - Build battle log with attackerId/targetId
6. Calculate rewards
7. Save battle record
8. Update progress if victory
         ↓
Return: { result, turns, log, rewards, player_team, enemies }
         ↓
Frontend: BattleScene displays turn-by-turn
         ↓
Loop through log.length:
   - Show current attack
   - Update HP using uniqueId
   - Highlight attacker/target
   - Wait 1.5s → next attack
         ↓
All attacks shown → Show victory/defeat modal
         ↓
User clicks Continue → Return to BattlePage
```

### Database Relationships

```
users (1) ←→ (many) player_characters
users (1) ←→ (many) gacha_history
users (1) ←→ (many) player_teams
users (1) ←→ (many) battles
users (1) ←→ (many) player_progress

character_templates (1) ←→ (many) player_characters
gacha_banners (1) ←→ (many) gacha_history

player_teams (1) ←→ (many) battles
battle_stages (1) ←→ (many) battles
battle_stages (1) ←→ (many) player_progress

player_teams:
  - slot_1 to slot_5 → player_characters (foreign keys)
  - is_active → only 1 active team per user
```

### Important Technical Decisions

#### 1. Why uniqueId instead of name?
**Problem**: Multiple characters can have same name (e.g., pulled same character twice)
**Solution**: Generate unique identifier per character instance in battle
- Format: `team_${characterId}_${slotIndex}` or `enemy_${name}_${index}`
- Used for accurate HP tracking in battle log

#### 2. Why 1 turn = 2 attacks?
**Design**: More engaging battle visualization
- Players see both their team attacking AND enemy counterattack per turn
- Matches traditional turn-based RPG feel
- Frontend shows: "Attack 1/20" + "Turn 1/10"

#### 3. Why store initialEnemies separately?
**Problem**: After simulation, enemy HP is negative
**Solution**: Store HP before simulation, send to frontend
- Frontend displays initial HP
- HP decreases via battle log tracking

#### 4. Why filter empty slots?
**Problem**: Team can have 1-5 characters, slots can be null
**Solution**: `.filter(slot => slot.character)` before battle
- Prevents undefined errors in combat
- Only active characters participate

#### 5. Session Management with Cookies (New!)
**Why cookies over localStorage?**
- **Security**: httpOnly cookies prevent XSS attacks (JavaScript cannot access)
- **Persistence**: Cookies stored by browser, survives page reloads automatically
- **Auto-send**: Browser automatically includes cookies in API requests
- **Simplicity**: No need to manually manage token in every request

**Implementation Details**:
- Cookie name: `picoen-access-token`
- Backend sets `httpOnly` cookie on login/register
- Cookie expires after 7 days (configurable via JWT_EXPIRE)
- SameSite=lax prevents CSRF attacks
- Secure flag enabled in production (HTTPS only)
- Frontend axios configured with `withCredentials: true`
- Middleware checks both header and cookie for token (backward compatible)

**Workflow**:
1. User logs in → Backend sets `picoen-access-token` cookie + returns token (for immediate use)
2. User closes browser → Cookie persists
3. User reopens → Frontend calls `/auth/profile` → Cookie `picoen-access-token` auto-sent → User logged in
4. User logs out → Backend clears `picoen-access-token` cookie + Frontend clears localStorage

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### 1. Authentication System
```bash
# Test Registration
- Navigate to /login?register=true
- Enter: username, email, password
- Expected: Redirects to /lobby with user data, cookie set

# Test Login
- Navigate to /login
- Enter credentials
- Expected: Redirects to /lobby, stores JWT in cookie + localStorage

# Test Session Persistence (New!)
- Login successfully
- Close browser completely
- Reopen and navigate to app
- Expected: Automatically logged in (no login required)

# Test Logout
- Click logout button
- Expected: Clears cookie + localStorage, redirects to /login

# Test Protected Routes
- Logout
- Try accessing /lobby, /gacha, /inventory, /team, /battle directly
- Expected: All redirect to /login
```

#### 2. Gacha System
```bash
# Test Normal Pull (100 Gold)
- Go to /gacha
- Select "Normal Gacha"
- Click "Single Pull"
- Expected: -100 gold, +1 character, see rarity-based colors

# Test 10x Pull (2700 Gems)
- Select "Premium Gacha"
- Click "10x Pull"
- Expected: -2700 gems, +10 characters, at least 1 Epic+

# Test Pity System
- Check user's pity_counter in database
- Pull until counter reaches 90
- Expected: Guaranteed Legendary on 90th pull

# Test Insufficient Resources
- Try pulling without enough gems/gold
- Expected: Error message "Insufficient resources"
```

#### 3. Inventory System
```bash
# Test Character Display
- Go to /inventory
- Expected: See all pulled characters in grid

# Test Filtering
- Click rarity filters (Common, Rare, Epic, Legendary)
- Expected: Shows only characters of selected rarity

# Test Sorting
- Try different sort options
- Expected: Characters reorder correctly

# Test Lock/Unlock
- Click character → Toggle lock
- Expected: Lock icon appears/disappears

# Test Upgrade
- Click character → Click "Upgrade"
- Expected: -gold, +level, +stats

# Test Sell
- Click character → Click "Sell"
- Try selling locked character → Should be blocked
- Sell unlocked character → Expected: Character removed, +gold
```

#### 4. Team Formation
```bash
# Test Create Team
- Go to /team
- Click characters to add to slots (max 5)
- Click "➕ Create Team"
- Expected: Team created, shows in "My Teams" section

# Test Edit Team (New!)
- Click "✏️ Edit" button on any team card
- Expected: Team slots populate with team's characters
- Expected: Header shows "✏️ Editing Team" with Cancel button
- Modify characters in slots
- Click "💾 Update Team"
- Expected: Team updated successfully

# Test Cancel Edit (New!)
- Click "✏️ Edit" on a team
- Make some changes
- Click "❌ Cancel"
- Expected: Slots cleared, back to "➕ New Team" mode

# Test Delete Team (New!)
- Click "🗑️ Delete" button on any team card
- Expected: Confirmation dialog appears
- Click "OK" to confirm
- Expected: Team deleted, removed from list
- If team was being edited, edit mode should clear

# Test Character Filters (New!)
- Use "Filter by Type" dropdown (Warrior, Mage, etc.)
- Use "Filter by Rarity" dropdown (Common, Rare, Epic, Legendary)
- Combine both filters
- Expected: Character list updates, shows "X of Y characters"
- Click "Clear Filters" to reset

# Test Set Active Team
- Create 2+ teams
- Click "Set Active" on one
- Expected: Green "✅ Active" badge appears on that team

# Test Team Power
- Add characters with different stats
- Expected: Power = sum of (ATK + DEF + HP/10)

# Test Character Validation
- Try adding same character twice
- Expected: Should be allowed (they're instances)
```

#### 5. Battle System
```bash
# Test Stage Selection
- Go to /battle
- Expected: See 6 stages, Stage 1 unlocked

# Test Battle Start (No Team)
- Click "Start Battle" without active team
- Expected: Error "Please set up an active team first!"

# Test Battle Scene
- Set active team
- Click "Start Battle" on Stage 1
- Expected: Full-screen battle scene appears
- Watch attacks play out (1.5s intervals)
- Expected: HP bars decrease, damage numbers show

# Test Skip Battle
- Start battle
- Click "Skip Battle"
- Expected: Jumps to result immediately

# Test Victory
- Win battle with strong team
- Expected: "VICTORY!" modal, +gold reward, stage progress saved

# Test Defeat
- Try high difficulty with weak team
- Expected: "DEFEAT" modal, no rewards

# Test Stage Unlock
- Complete Stage 1
- Expected: Stage 2 unlocks
```

#### 6. Lobby System
```bash
# Test Stats Display
- Go to /lobby
- Expected: Shows character count, team count, stages cleared

# Test Navigation
- Click feature tiles
- Expected: Navigates to correct pages

# Test Resource Display
- Expected: Shows current gems and gold
```

### Database Testing

```sql
-- Check user data
SELECT id, username, gems, gold, pity_counter FROM users WHERE username = 'player1';

-- Check character inventory
SELECT pc.id, ct.name, ct.rarity, pc.level, pc.current_hp, pc.current_atk
FROM player_characters pc
JOIN character_templates ct ON pc.character_id = ct.id
WHERE pc.user_id = 1
ORDER BY pc.obtained_at DESC;

-- Check active team
SELECT pt.*,
  c1.name as slot1_name,
  c2.name as slot2_name,
  c3.name as slot3_name,
  c4.name as slot4_name,
  c5.name as slot5_name
FROM player_teams pt
LEFT JOIN player_characters c1 ON pt.slot_1 = c1.id
LEFT JOIN player_characters c2 ON pt.slot_2 = c2.id
LEFT JOIN player_characters c3 ON pt.slot_3 = c3.id
LEFT JOIN player_characters c4 ON pt.slot_4 = c4.id
LEFT JOIN player_characters c5 ON pt.slot_5 = c5.id
WHERE pt.user_id = 1 AND pt.is_active = 1;

-- Check battle history
SELECT b.*, s.name as stage_name, b.result, b.turns, b.gold_earned
FROM battles b
JOIN battle_stages s ON b.stage_id = s.id
WHERE b.user_id = 1
ORDER BY b.battled_at DESC
LIMIT 10;

-- Check stage progress
SELECT pp.*, s.name as stage_name, s.difficulty
FROM player_progress pp
JOIN battle_stages s ON pp.stage_id = s.id
WHERE pp.user_id = 1
ORDER BY s.stage_number;
```

### API Testing (curl)

```bash
# Test Registration (with cookie)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}' \
  -c cookies.txt
# Cookie 'picoen-access-token' saved in cookies.txt

# Test Login (with cookie)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
# Cookie 'picoen-access-token' saved in cookies.txt

# Test Protected Endpoint (using cookie)
curl -X GET http://localhost:3000/api/inventory \
  -b cookies.txt

# OR Test Protected Endpoint (using header token - backward compatible)
curl -X GET http://localhost:3000/api/inventory \
  -H "Authorization: Bearer TOKEN"

# Test Gacha Pull (with cookie)
curl -X POST http://localhost:3000/api/gacha/pull \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"banner_id":1}'

# Test Team Creation (with cookie)
curl -X POST http://localhost:3000/api/teams \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name":"Team 1","slots":{"slot_1":1,"slot_2":2}}'

# Test Battle Start (with cookie)
curl -X POST http://localhost:3000/api/battles/start \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"stage_id":1}'

# Test Logout (clears cookie)
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
# Cookie 'picoen-access-token' cleared
```

### Common Debugging Commands

```bash
# Check backend logs
cd backend
npm run dev
# Watch console for errors

# Check frontend console
# Open browser DevTools (F12)
# Check Console tab for errors
# Check Network tab for API calls
# Check Application tab → Cookies → localhost:5173 → picoen-access-token

# Check database connections
mysql -u root -p picoen -e "SELECT COUNT(*) FROM users;"

# Check port usage
lsof -ti:3000  # Backend
lsof -ti:5173  # Frontend

# Clear Vite cache (if frontend issues)
cd frontend
rm -rf node_modules/.vite
npm run dev

# Reset database (WARNING: deletes all data)
mysql -u root -p picoen < backend/database/schema.sql
mysql -u root -p picoen < backend/database/battle_system_schema.sql
```

---

