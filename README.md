# 🎮 Piceon - Idle RPG Game

A full-stack web-based Idle RPG game with Character Collection, Gacha System, and Inventory Management.

## 📋 Project Status

**Phase 1 & 2**: ✅ **COMPLETE** (2025-11-20)

### Completed Systems (100%)
- ✅ **Authentication** - Registration, Login, JWT
- ✅ **Gacha System** - Single/10x pulls, Pity system
- ✅ **Inventory** - Filter, Sort, Character management
- ✅ **Character Upgrade** - Level up, Lock, Favorite, Sell
- ✅ **Team Formation** - Create teams, Manage 5 character slots
- ✅ **Battle System** - Turn-based combat, Stage progression
- ✅ **Lobby/Dashboard** - Central hub with all features

### Statistics
- **Files Created**: 51+ (Backend: 22, Frontend: 29+)
- **API Endpoints**: 28+ fully functional
- **Database Tables**: 9 with sample data
- **Lines of Code**: ~3,700+

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- MySQL/MariaDB
- npm or yarn

### 1. Database Setup

```bash
# Start MariaDB server
mysql.server start

# Create database
mysql -u root -p
CREATE DATABASE picoen;
exit;

# Import schemas
mysql -u root -p picoen < backend/database/schema.sql
mysql -u root -p picoen < backend/database/battle_system_schema.sql
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start server
npm run dev
```

Backend will run on `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local if needed

# Start dev server
npm run dev
```

Frontend will run on `http://localhost:5173`

## 🎯 Core Features

### ✅ Implemented Features

#### Character System
- 5 Character Types: Warrior, Mage, Archer, Tank, Assassin
- 4 Rarity Levels: Common, Rare, Epic, Legendary
- 20 Unique Characters with stats and special abilities
- Character progression with level-up system
- **Special Abilities**: Each character has unique skill (not yet active in battle)
  - Common: Basic abilities (Power Strike, Fire Bolt, etc.)
  - Rare: Advanced abilities (Whirlwind AOE, Multi-Shot, etc.)
  - Epic: Powerful abilities (Meteor Strike, Divine Shield, etc.)
  - Legendary: Ultimate abilities (Time Stop, Heaven's Arrow, etc.)

#### Gacha System
- **Normal Pull**: 100 Gold per pull (70% Common, 25% Rare, 4.5% Epic, 0.5% Legendary)
- **Premium Pull**: 300 Gems per pull (50% Common, 35% Rare, 13% Epic, 2% Legendary)
- **10x Pull**: 2700 Gems (guaranteed 1 Epic+)
- **Pity System**: Every 90 pulls guarantees 1 Legendary
- Full pull history tracking

#### Inventory System
- Character collection management
- Lock/Unlock characters to prevent accidental deletion
- Favorite system for important characters
- Character upgrade system (level up with stat increases)
- Sell characters for Gold
- Filter by rarity, type, locked, favorite
- Sort by various criteria

#### Team Formation System
- Create and manage multiple teams
- 5 character slots per team
- Set active team for battles
- Team power calculation (ATK + DEF + HP/10)
- Character validation (no duplicates)

#### Battle System
- 6 battle stages (Easy → Expert difficulty)
- Turn-based combat simulation
- Stage progression with unlock requirements
- Victory/Defeat outcomes with rewards
- Battle history tracking
- Gold and EXP rewards based on difficulty
- **Battle Scene Visualization**:
  - Full-screen turn-based battle display
  - Real-time turn-by-turn animations (1.5s per attack)
  - Character vs Enemy with real-time HP bars
  - Damage numbers with animations
  - Skip Battle button for instant results
  - Victory/Defeat animations
  - Unique ID system for duplicate character tracking
  - Attack counter and turn counter display
- **Battle Logic**:
  - Turn-based: 1 turn = Your team attack + Enemy attack
  - Damage formula: ATK - (DEF × 0.5), minimum 1 damage
  - Random target selection each attack
  - Victory when all enemies defeated
  - Defeat when all team members defeated or 100 turn timeout

#### Lobby/Dashboard
- Central hub for all game features
- Player statistics display
- Resource tracking (Gems, Gold)
- Quick navigation to all systems
- Beginner quick-start guide

#### Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- User registration and login
- Protected API routes

## 📁 Project Structure

```
Piceon/
├── backend/                 # Node.js + Express Backend
│   ├── config/             # Database configuration
│   ├── controllers/        # Request handlers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Auth & validation
│   ├── database/           # SQL schema
│   └── server.js           # Entry point
│
├── frontend/               # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API services
│   │   ├── stores/        # Zustand state management
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx        # Main app
│   └── index.html
│
└── DEVELOPMENT.md         # Detailed development log
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `GET /api/auth/resources` - Get user resources (protected)

### Characters
- `GET /api/characters/templates` - Get all character templates
- `GET /api/characters/templates/:id` - Get character by ID
- `GET /api/characters/templates/rarity/:rarity` - Get by rarity
- `GET /api/characters/templates/type/:type` - Get by type
- `GET /api/characters/stats` - Get character statistics

### Gacha
- `GET /api/gacha/banners` - Get active banners
- `POST /api/gacha/pull` - Perform single pull (protected)
- `POST /api/gacha/pull-10` - Perform 10x pull (protected)
- `GET /api/gacha/history` - Get pull history (protected)
- `GET /api/gacha/stats` - Get pull statistics (protected)

### Inventory
- `GET /api/inventory` - Get user's inventory (protected)
- `GET /api/inventory/:id` - Get specific character (protected)
- `PUT /api/inventory/:id/lock` - Lock/unlock character (protected)
- `PUT /api/inventory/:id/favorite` - Toggle favorite (protected)
- `PUT /api/inventory/:id/upgrade` - Upgrade character (protected)
- `DELETE /api/inventory/:id` - Sell character (protected)
- `GET /api/inventory/stats` - Get inventory statistics (protected)

### Teams
- `GET /api/teams` - Get user's teams (protected)
- `GET /api/teams/:id` - Get specific team (protected)
- `GET /api/teams/active` - Get active team (protected)
- `POST /api/teams` - Create new team (protected)
- `PUT /api/teams/:id` - Update team (protected)
- `PUT /api/teams/:id/activate` - Set team as active (protected)
- `DELETE /api/teams/:id` - Delete team (protected)
- `GET /api/teams/:id/power` - Get team power (protected)

### Battles
- `GET /api/battles/stages` - Get all battle stages
- `GET /api/battles/stages/:id` - Get specific stage
- `POST /api/battles/start` - Start battle (protected)
- `GET /api/battles/history` - Get battle history (protected)
- `GET /api/battles/progress` - Get user progress (protected)

## 💎 Game Economy

### Starting Resources
- **Gems**: 300 (Premium currency)
- **Gold**: 10,000 (Basic currency)
- **Inventory Slots**: 50

### Gacha Costs
- **Normal Pull**: 100 Gold
- **Premium Pull**: 300 Gems
- **10x Pull**: 2,700 Gems or 900 Gold

### Character Sell Values
- **Common**: 50 Gold
- **Rare**: 200 Gold
- **Epic**: 1,000 Gold
- **Legendary**: 5,000 Gold

### Upgrade Costs
- Base cost: 100 Gold
- Each level: Cost × 1.5

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL/MariaDB
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: express-validator
- **Security**: helmet, cors

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Styling**: TailwindCSS v3
- **Routing**: React Router v6

## 🔮 Roadmap (Phase 3+)

### High Priority
- [ ] **Skill System Integration** - Implement character special abilities in battle
  - Skill trigger mechanics (chance-based or cooldown)
  - Special effects (AOE, Stun, Heal, Critical, etc.)
  - Skill animations in battle scene
  - Energy/cooldown management
- [ ] **Daily Rewards** - Login bonuses and streaks
- [ ] **Player Profile** - Detailed statistics and achievements
- [ ] **Quest System** - Daily/Weekly missions

### Medium Priority
- [ ] **Shop System** - Buy gems/items with different packages
- [ ] **Achievement System** - Unlock rewards for milestones
- [ ] **Auto-Battle** - Idle combat mechanics
- [ ] **Character Evolution** - Upgrade rarity and unlock new skills

### Low Priority
- [ ] **Leaderboards** - Competitive rankings
- [ ] **Social Features** - Friend system
- [ ] **Limited Events** - Seasonal banners
- [ ] **PvP Arena** - Player vs Player battles

## 📝 Development Notes

- Mock images are used for characters (will be replaced later)
- UI design is functional-first (will be enhanced later)
- Focus on core mechanics and functionality

## 📄 License

This project is for educational and portfolio purposes.

## 👨‍💻 Developer

Built with ❤️ using Claude Code AI Assistant

For detailed development progress, see [DEVELOPMENT.md](./DEVELOPMENT.md)
