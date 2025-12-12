# 🎮 Battle System - Implementation Plan

## 📋 Overview

The Battle System is the core gameplay loop where players form teams and battle through stages to earn rewards and progress.

---

## 🏗️ System Architecture

### Module Breakdown

```
Battle System
├── Team Formation (Select 5 characters)
├── Battle Engine (Combat simulation)
├── Stage Progression (Unlock new stages)
└── Reward Distribution (Gold, EXP, Items)
```

---

## 🗄️ Database Design

### New Tables (4)

1. **`player_teams`** - Team configurations
   - User's team setups (5 character slots)
   - One active team per user
   - Cascade delete on character removal

2. **`battle_stages`** - Available stages
   - Stage number, difficulty, requirements
   - Enemy configuration (count, level range)
   - Base rewards (gold, exp)

3. **`battles`** - Battle history
   - Battle results (Victory/Defeat)
   - Rewards earned
   - Battle log (JSON)

4. **`player_progress`** - Stage completion
   - Times completed
   - Best performance
   - Unlock tracking

### Sample Stages (6 Initial)
1. Forest Outskirts (Easy, Power: 500)
2. Goblin Camp (Easy, Power: 800)
3. Dark Woods (Normal, Power: 1200)
4. Bandit Hideout (Normal, Power: 1800)
5. Ancient Ruins (Hard, Power: 2500)
6. Dragon Lair (Expert, Power: 4000)

---

## ⚙️ Backend Implementation

### Models (3 Files)

**1. `models/Team.js`**
- Create/Update team
- Get user teams
- Validate team composition
- Calculate team power

**2. `models/Battle.js`**
- Simulate battle logic
- Generate enemies
- Calculate damage
- Determine winner
- Distribute rewards

**3. `models/Stage.js`**
- Get available stages
- Check stage requirements
- Get stage details

### Controllers (2 Files)

**1. `controllers/TeamController.js`**
- `GET /api/teams` - Get user teams
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `PUT /api/teams/:id/activate` - Set active team
- `DELETE /api/teams/:id` - Delete team

**2. `controllers/BattleController.js`**
- `GET /api/battles/stages` - Get available stages
- `GET /api/battles/stages/:id` - Get stage details
- `POST /api/battles/start` - Start battle
- `GET /api/battles/history` - Get battle history
- `GET /api/battles/progress` - Get player progress

### Routes (2 Files)
- `routes/teams.js`
- `routes/battles.js`

---

## 🎨 Frontend Implementation

### Pages (1 File)

**`pages/BattlePage.tsx`**
- Stage selection UI
- Active team display
- Start battle button
- Progress tracking

### Components (3 Files)

**1. `components/TeamFormation.tsx`**
- Character selection grid
- Team slot management (5 slots)
- Drag & drop support
- Team power calculation
- Save team button

**2. `components/BattleScene.tsx`**
- Battle animation
- HP bars
- Turn-based combat visualization
- Victory/Defeat display

**3. `components/RewardModal.tsx`**
- Display earned rewards
- Gold and EXP gained
- Stage completion status

### Stores (1 File)

**`stores/useBattleStore.ts`**
- Current team state
- Battle state (idle, fighting, victory, defeat)
- Stage selection
- Battle results
- Progress tracking

---

## 🎯 Battle Logic

### Team Power Calculation
```javascript
teamPower = sum of (character.current_atk + character.current_def + character.current_hp/10)
```

### Battle Simulation (Turn-based)
1. Generate enemies based on stage
2. Calculate team power vs enemy power
3. Simulate turn-by-turn combat
4. Each turn: random character attacks random enemy
5. Battle ends when one side reaches 0 HP
6. Award rewards if victory

### Reward Formula
```javascript
goldReward = baseGold × (1 + stageDifficulty × 0.5)
expReward = baseExp × (1 + stageDifficulty × 0.5)
```

---

## 📝 Implementation Tasks

### Phase 1: Database & Backend (2-3 hours)

**Task 1: Database Schema**
- [x] Create `battle_system_schema.sql`
- [ ] Import schema to database
- [ ] Verify tables created

**Task 2: Team System Backend**
- [ ] Create `Team.js` model
- [ ] Create `TeamController.js`
- [ ] Create `routes/teams.js`
- [ ] Test team CRUD operations

**Task 3: Battle System Backend**
- [ ] Create `Battle.js` model
- [ ] Create `Stage.js` model
- [ ] Create `BattleController.js`
- [ ] Create `routes/battles.js`
- [ ] Implement battle simulation logic
- [ ] Test battle flow

### Phase 2: Frontend UI (1-2 hours)

**Task 4: Team Formation UI**
- [ ] Create `TeamFormation.tsx`
- [ ] Create `useBattleStore.ts`
- [ ] Implement character selection
- [ ] Add team power display
- [ ] Test team saving

**Task 5: Battle Page UI**
- [ ] Create `BattlePage.tsx`
- [ ] Create `BattleScene.tsx`
- [ ] Create `RewardModal.tsx`
- [ ] Add stage selection
- [ ] Implement battle animation
- [ ] Test full battle flow

### Phase 3: Testing & Polish (30 mins)

**Task 6: Integration Testing**
- [ ] Test complete battle flow
- [ ] Verify reward distribution
- [ ] Check progression tracking
- [ ] Bug fixes and polish

---

## 🎁 Future Extensions

### Daily Rewards System
**Tables:**
- `daily_rewards` - Daily login bonuses
- `player_daily_claims` - Claim tracking

### Quest System
**Tables:**
- `quests` - Quest templates
- `player_quests` - Active quests
- `quest_rewards` - Quest rewards

### Achievement System
**Tables:**
- `achievements` - Achievement templates
- `player_achievements` - Unlocked achievements

### Shop System
**Tables:**
- `shop_items` - Available items
- `shop_purchases` - Purchase history

---

## 📊 Estimated Timeline

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| Database | Schema design | 30 min | ✅ Done |
| Backend | Models + Controllers + Routes | 2 hours | ⏳ Pending |
| Frontend | UI Components + Pages | 1.5 hours | ⏳ Pending |
| Testing | Integration + Polish | 30 min | ⏳ Pending |
| **Total** | | **~4 hours** | |

---

## 🚀 Next Steps

1. Import battle system schema to database
2. Implement Team model and controller
3. Implement Battle simulation logic
4. Create Team Formation UI
5. Create Battle Scene UI
6. Test complete flow
7. Update DEVELOPMENT.md

---

**Ready to start implementation!** 🎮
