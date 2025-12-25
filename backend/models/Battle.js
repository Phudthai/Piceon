/**
 * Battle Model
 * Handles battle simulation and logic
 */

const BaseModel = require('./BaseModel');
const Team = require('./Team');
const Stage = require('./Stage');
const User = require('./User');
const Character = require('./Character');
const Skill = require('./Skill');

class Battle extends BaseModel {
  constructor() {
    super('battles');
  }

  /**
   * Simulate battle
   * @param {number} userId - User ID
   * @param {number} stageId - Stage ID
   * @returns {Promise<Object>} Battle result
   */
  async simulateBattle(userId, stageId) {
    // Get active team
    const activeTeam = await Team.getActiveTeam(userId);
    if (!activeTeam) {
      throw new Error('No active team set');
    }

    const teamData = await Team.getTeamWithCharacters(activeTeam.id, userId);
    if (!teamData.characters || teamData.characters.length === 0) {
      throw new Error('Team is empty');
    }

    // Get stage
    const stage = await Stage.getStageById(stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }

    // Check if unlocked
    const isUnlocked = await Stage.isStageUnlocked(stageId, userId);
    if (!isUnlocked) {
      throw new Error('Stage is locked');
    }

    // Calculate team power
    const teamPower = await Team.calculateTeamPower(activeTeam.id, userId);

    // Generate enemies
    const enemies = await this.generateEnemies(stage);
    const enemyPower = enemies.reduce((sum, e) => sum + e.power, 0);

    // Store initial enemy HP before simulation
    const initialEnemies = enemies.map(e => ({
      name: e.name,
      hp: e.hp,
      atk: e.atk,
      def: e.def
    }));

    // Simulate combat
    const battleResult = await this.simulate(teamData.characters, enemies, stage);

    // Calculate rewards
    const rewards = this.calculateRewards(stage, battleResult.result);

    // Save battle record
    await this.create({
      user_id: userId,
      stage_id: stageId,
      team_id: activeTeam.id,
      result: battleResult.result,
      turns: battleResult.turns,
      team_power: teamPower,
      team_hp_remaining: battleResult.teamHpRemaining,
      gold_earned: rewards.gold,
      exp_earned: rewards.exp,
      battle_log: JSON.stringify(battleResult.log)
    });

    // If victory, update progress and give rewards
    if (battleResult.result === 'Victory') {
      await this.updateProgress(userId, stageId, battleResult.turns);
      await User.addResources(userId, { gold: rewards.gold });

      // TODO: Add EXP to characters
    }

    return {
      ...battleResult,
      rewards,
      stage: stage.name,
      player_team: teamData.characters.filter(slot => slot.character).map((slot, idx) => ({
        ...slot.character,
        uniqueId: `team_${slot.character.id}_${idx}`
      })),
      enemies: initialEnemies.map((e, idx) => ({
        name: e.name,
        current_hp: e.hp,
        current_atk: e.atk,
        current_def: e.def,
        type: 'Enemy',
        rarity: 'Common',
        uniqueId: `enemy_${e.name}_${idx}`
      }))
    };
  }

  /**
   * Generate enemy team
   */
  async generateEnemies(stage) {
    const enemies = [];
    const allChars = await Character.getRandomCharactersByCount(stage.enemy_count, 'Normal');

    for (let char of allChars) {
      const level = Math.floor(Math.random() * (stage.enemy_level_max - stage.enemy_level_min + 1)) + stage.enemy_level_min;
      enemies.push({
        name: char.name,
        level,
        hp: char.base_hp * level,
        atk: char.base_atk * level,
        def: char.base_def * level,
        power: (char.base_atk + char.base_def + char.base_hp / 10) * level
      });
    }

    return enemies;
  }

  /**
   * Load and apply character skills
   */
  async loadCharacterSkills(character) {
    const templateId = character.character_template_id || character.template_id;
    const skills = await Skill.getUnlockedSkills(templateId, character.level);

    // Apply passive skills
    const passives = skills.filter(s => s.skill_type === 'passive');
    let modifiedChar = { ...character };

    for (const passive of passives) {
      modifiedChar = this.applyPassiveSkill(modifiedChar, passive);
    }

    // Attach active skills
    const actives = skills.filter(s => s.skill_type === 'active');

    return {
      ...modifiedChar,
      skills: actives,
      passives: passives,
      cooldowns: {} // Track skill cooldowns
    };
  }

  /**
   * Apply passive skill effects
   */
  applyPassiveSkill(character, skill) {
    const modified = { ...character };

    switch (skill.category) {
      case 'crit_chance':
        modified.crit_chance = (modified.crit_chance || 0) + skill.value;
        break;
      case 'crit_damage':
        modified.crit_damage = (modified.crit_damage || 150) + skill.value;
        break;
      case 'lifesteal':
        modified.lifesteal = (modified.lifesteal || 0) + skill.value;
        break;
      case 'counter_attack':
        modified.counter_chance = (modified.counter_chance || 0) + skill.value;
        break;
      case 'dodge':
        modified.dodge_chance = (modified.dodge_chance || 0) + skill.value;
        break;
      case 'atk_boost':
        modified.current_atk = Math.floor(modified.current_atk * (1 + skill.value / 100));
        break;
      case 'def_boost':
        modified.current_def = Math.floor(modified.current_def * (1 + skill.value / 100));
        break;
      case 'hp_boost':
        modified.current_hp = Math.floor(modified.current_hp * (1 + skill.value / 100));
        modified.max_hp = modified.current_hp;
        break;
      case 'hp_regen':
        modified.hp_regen = (modified.hp_regen || 0) + skill.value;
        break;
      case 'last_stand':
        modified.last_stand = skill.value;
        break;
      case 'first_strike':
        modified.first_strike = true;
        break;
    }

    return modified;
  }

  /**
   * Simulate turn-based combat
   */
  async simulate(teamChars, enemies, stage) {
    // Load skills for team characters
    let team = [];
    for (const slot of teamChars.filter(s => s.character)) {
      const charWithSkills = await this.loadCharacterSkills(slot.character);
      team.push({
        ...charWithSkills,
        hp: charWithSkills.current_hp,
        max_hp: charWithSkills.current_hp,
        atk: charWithSkills.current_atk,
        def: charWithSkills.current_def,
        uniqueId: `team_${charWithSkills.id}_${team.length}`,
        buffs: [],
        debuffs: []
      });
    }

    let enemyTeam = enemies.map((e, idx) => ({
      ...e,
      max_hp: e.hp,
      uniqueId: `enemy_${e.name}_${idx}`,
      buffs: [],
      debuffs: [],
      cooldowns: {}
    }));

    let turns = 0;
    const log = [];
    const maxTurns = 100;

    while (turns < maxTurns) {
      turns++;

      // Process HP regen for team
      for (const char of team) {
        if (char.hp_regen && char.hp_regen > 0) {
          const healAmount = Math.floor(char.max_hp * (char.hp_regen / 100));
          char.hp = Math.min(char.max_hp, char.hp + healAmount);
          if (healAmount > 0) {
            log.push({
              turn: turns,
              type: 'regen',
              character: char.name,
              characterId: char.uniqueId,
              amount: healAmount,
              remaining_hp: char.hp
            });
          }
        }

        // Decrease buff/debuff durations
        char.buffs = char.buffs.map(b => ({ ...b, duration: b.duration - 1 })).filter(b => b.duration > 0);
        char.debuffs = char.debuffs.map(d => ({ ...d, duration: d.duration - 1 })).filter(d => d.duration > 0);

        // Decrease cooldowns
        Object.keys(char.cooldowns).forEach(skillId => {
          if (char.cooldowns[skillId] > 0) char.cooldowns[skillId]--;
        });
      }

      // Team attacks with skills
      const attacker = team[Math.floor(Math.random() * team.length)];
      const attackResult = await this.processAttack(attacker, enemyTeam, team, turns);
      log.push(...attackResult.logs);

      // Apply attack effects
      if (attackResult.damage) {
        for (const dmg of attackResult.damage) {
          const target = enemyTeam.find(e => e.uniqueId === dmg.targetId);
          if (target) {
            target.hp -= dmg.amount;

            // Lifesteal
            if (attacker.lifesteal && attacker.lifesteal > 0) {
              const heal = Math.floor(dmg.amount * (attacker.lifesteal / 100));
              attacker.hp = Math.min(attacker.max_hp, attacker.hp + heal);
              log.push({
                turn: turns,
                type: 'lifesteal',
                character: attacker.name,
                characterId: attacker.uniqueId,
                amount: heal,
                remaining_hp: attacker.hp
              });
            }
          }
        }
      }

      enemyTeam = enemyTeam.filter(e => e.hp > 0);
      if (enemyTeam.length === 0) {
        return { result: 'Victory', turns, teamHpRemaining: team.reduce((sum, c) => sum + c.hp, 0), log };
      }

      // Enemies attack
      const enemyAttacker = enemyTeam[Math.floor(Math.random() * enemyTeam.length)];
      const teamTarget = team[Math.floor(Math.random() * team.length)];

      // Check dodge
      if (teamTarget.dodge_chance && Math.random() * 100 < teamTarget.dodge_chance) {
        log.push({
          turn: turns,
          type: 'dodge',
          attacker: enemyAttacker.name,
          attackerId: enemyAttacker.uniqueId,
          target: teamTarget.name,
          targetId: teamTarget.uniqueId
        });
      } else {
        const enemyDamage = Math.max(1, enemyAttacker.atk - Math.floor(teamTarget.def * 0.5));
        teamTarget.hp -= enemyDamage;

        log.push({
          turn: turns,
          type: 'attack',
          attacker: enemyAttacker.name,
          attackerId: enemyAttacker.uniqueId,
          target: teamTarget.name,
          targetId: teamTarget.uniqueId,
          damage: enemyDamage,
          remaining_hp: Math.max(0, teamTarget.hp)
        });

        // Counter attack
        if (teamTarget.counter_chance && teamTarget.hp > 0 && Math.random() * 100 < teamTarget.counter_chance) {
          const counterDamage = Math.floor(teamTarget.atk * 0.5);
          enemyAttacker.hp -= counterDamage;
          log.push({
            turn: turns,
            type: 'counter',
            attacker: teamTarget.name,
            attackerId: teamTarget.uniqueId,
            target: enemyAttacker.name,
            targetId: enemyAttacker.uniqueId,
            damage: counterDamage,
            remaining_hp: Math.max(0, enemyAttacker.hp)
          });
        }
      }

      // Last stand check
      team = team.filter(c => {
        if (c.hp <= 0 && c.last_stand && !c.last_stand_used) {
          c.hp = Math.floor(c.max_hp * (c.last_stand / 100));
          c.last_stand_used = true;
          log.push({
            turn: turns,
            type: 'last_stand',
            character: c.name,
            characterId: c.uniqueId,
            hp_restored: c.hp
          });
          return true;
        }
        return c.hp > 0;
      });

      if (team.length === 0) {
        return { result: 'Defeat', turns, teamHpRemaining: 0, log };
      }

      enemyTeam = enemyTeam.filter(e => e.hp > 0);
    }

    return { result: 'Defeat', turns, teamHpRemaining: 0, log };
  }

  /**
   * Process attack with skill check
   */
  async processAttack(attacker, enemies, allies, turn) {
    const logs = [];
    const damage = [];

    // Try to use active skill
    if (attacker.skills && attacker.skills.length > 0) {
      for (const skill of attacker.skills) {
        // Check cooldown
        if (attacker.cooldowns[skill.id] && attacker.cooldowns[skill.id] > 0) continue;

        // Check trigger rate
        if (Math.random() * 100 >= skill.trigger_rate) continue;

        // Skill triggered!
        attacker.cooldowns[skill.id] = skill.cooldown;

        const skillResult = this.processSkill(attacker, skill, enemies, allies, turn);
        logs.push(...skillResult.logs);
        damage.push(...skillResult.damage);

        return { logs, damage };
      }
    }

    // Normal attack if no skill triggered
    const target = enemies[Math.floor(Math.random() * enemies.length)];
    let dmg = Math.max(1, attacker.atk - Math.floor(target.def * 0.5));

    // Check crit
    if (attacker.crit_chance && Math.random() * 100 < attacker.crit_chance) {
      const critMultiplier = (attacker.crit_damage || 150) / 100;
      dmg = Math.floor(dmg * critMultiplier);
      logs.push({
        turn: turn,
        type: 'crit',
        attacker: attacker.name,
        attackerId: attacker.uniqueId,
        target: target.name,
        targetId: target.uniqueId,
        damage: dmg,
        remaining_hp: Math.max(0, target.hp - dmg)
      });
    } else {
      logs.push({
        turn: turn,
        type: 'attack',
        attacker: attacker.name,
        attackerId: attacker.uniqueId,
        target: target.name,
        targetId: target.uniqueId,
        damage: dmg,
        remaining_hp: Math.max(0, target.hp - dmg)
      });
    }

    damage.push({ targetId: target.uniqueId, amount: dmg });

    return { logs, damage };
  }

  /**
   * Process skill effects
   */
  processSkill(attacker, skill, enemies, allies, turn) {
    const logs = [];
    const damage = [];

    logs.push({
      turn: turn,
      type: 'skill_used',
      character: attacker.name,
      characterId: attacker.uniqueId,
      skill: skill.name,
      skillId: skill.id
    });

    // Determine targets
    let targets = [];
    switch (skill.target) {
      case 'self':
        targets = [attacker];
        break;
      case 'ally':
        targets = [allies[Math.floor(Math.random() * allies.length)]];
        break;
      case 'all_allies':
        targets = allies;
        break;
      case 'single_enemy':
        targets = [enemies[Math.floor(Math.random() * enemies.length)]];
        break;
      case 'all_enemies':
        targets = enemies;
        break;
      case 'random_enemies':
        const count = Math.min(3, enemies.length);
        targets = [];
        for (let i = 0; i < count; i++) {
          targets.push(enemies[Math.floor(Math.random() * enemies.length)]);
        }
        break;
    }

    // Apply skill effect
    // For AOE skills, calculate damage once and apply to all
    let aoeDamage = null;
    if (skill.category === 'aoe_damage' || skill.category === 'multi_target') {
      aoeDamage = Math.floor(skill.power * (attacker.atk / 100));
    }

    for (const target of targets) {
      switch (skill.category) {
        case 'single_damage':
          const singleDmg = Math.floor(skill.power * (attacker.atk / 100));
          damage.push({ targetId: target.uniqueId, amount: singleDmg });
          logs.push({
            turn: turn,
            type: 'skill_damage',
            attacker: attacker.name,
            attackerId: attacker.uniqueId,
            target: target.name,
            targetId: target.uniqueId,
            skill: skill.name,
            damage: singleDmg,
            remaining_hp: Math.max(0, target.hp - singleDmg)
          });
          break;

        case 'aoe_damage':
        case 'multi_target':
          // Use pre-calculated AOE damage for all targets
          damage.push({ targetId: target.uniqueId, amount: aoeDamage });
          logs.push({
            turn: turn,
            type: 'skill_damage',
            attacker: attacker.name,
            attackerId: attacker.uniqueId,
            target: target.name,
            targetId: target.uniqueId,
            skill: skill.name,
            damage: aoeDamage,
            remaining_hp: Math.max(0, target.hp - aoeDamage)
          });
          break;

        case 'execute':
          if (target.hp < target.max_hp * 0.3) {
            const dmg = Math.floor(skill.power * (attacker.atk / 100) * 2);
            damage.push({ targetId: target.uniqueId, amount: dmg });
            logs.push({
              turn: turn,
              type: 'execute',
              attacker: attacker.name,
              attackerId: attacker.uniqueId,
              target: target.name,
              targetId: target.uniqueId,
              damage: dmg
            });
          }
          break;

        case 'heal':
          const healAmount = Math.floor(skill.power * (attacker.atk / 100));
          target.hp = Math.min(target.max_hp, target.hp + healAmount);
          logs.push({
            turn: turn,
            type: 'heal',
            caster: attacker.name,
            casterId: attacker.uniqueId,
            target: target.name,
            targetId: target.uniqueId,
            amount: healAmount,
            remaining_hp: target.hp
          });
          break;

        case 'shield':
          target.buffs.push({
            type: 'shield',
            value: skill.value,
            duration: skill.duration
          });
          logs.push({
            turn: turn,
            type: 'buff',
            caster: attacker.name,
            target: target.name,
            buff: 'shield',
            value: skill.value,
            duration: skill.duration
          });
          break;

        case 'buff_atk':
        case 'buff_def':
        case 'speed_buff':
          target.buffs.push({
            type: skill.category,
            value: skill.value,
            duration: skill.duration
          });
          logs.push({
            turn: turn,
            type: 'buff',
            caster: attacker.name,
            target: target.name,
            buff: skill.category,
            value: skill.value,
            duration: skill.duration
          });
          break;

        case 'debuff_atk':
        case 'debuff_def':
        case 'stun':
        case 'silence':
          target.debuffs.push({
            type: skill.category,
            value: skill.value,
            duration: skill.duration
          });
          logs.push({
            turn: turn,
            type: 'debuff',
            caster: attacker.name,
            target: target.name,
            debuff: skill.category,
            value: skill.value,
            duration: skill.duration
          });
          break;

        case 'poison':
        case 'bleed':
          target.debuffs.push({
            type: skill.category,
            damage: skill.value,
            duration: skill.duration
          });
          logs.push({
            turn: turn,
            type: 'dot',
            caster: attacker.name,
            target: target.name,
            effect: skill.category,
            damage: skill.value,
            duration: skill.duration
          });
          break;
      }
    }

    return { logs, damage };
  }

  /**
   * Calculate battle rewards
   */
  calculateRewards(stage, result) {
    if (result === 'Defeat') {
      return { gold: 0, exp: 0 };
    }

    const difficultyMultiplier = { Easy: 1, Normal: 1.5, Hard: 2, Expert: 3 }[stage.difficulty] || 1;
    return {
      gold: Math.floor(stage.base_gold_reward * difficultyMultiplier),
      exp: Math.floor(stage.base_exp_reward * difficultyMultiplier)
    };
  }

  /**
   * Update player progress
   */
  async updateProgress(userId, stageId, turns) {
    const sql = `
      INSERT INTO player_progress (user_id, stage_id, times_completed, best_turns, first_cleared_at, last_cleared_at)
      VALUES (?, ?, 1, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        times_completed = times_completed + 1,
        best_turns = LEAST(IFNULL(best_turns, 999), ?),
        last_cleared_at = NOW()
    `;
    await this.executeQuery(sql, [userId, stageId, turns, turns]);
  }

  /**
   * Get user battle history
   */
  async getUserBattleHistory(userId, limit = 20) {
    const sql = `
      SELECT b.*, s.name as stage_name, s.stage_number
      FROM ${this.table} b
      JOIN battle_stages s ON b.stage_id = s.id
      WHERE b.user_id = ?
      ORDER BY b.battled_at DESC
      LIMIT ?
    `;
    return await this.executeQuery(sql, [userId, limit]);
  }

  /**
   * Get user progress
   */
  async getUserProgress(userId) {
    const sql = `
      SELECT pp.*, s.name as stage_name, s.stage_number
      FROM player_progress pp
      JOIN battle_stages s ON pp.stage_id = s.id
      WHERE pp.user_id = ?
      ORDER BY s.stage_number ASC
    `;
    return await this.executeQuery(sql, [userId]);
  }
}

module.exports = new Battle();
