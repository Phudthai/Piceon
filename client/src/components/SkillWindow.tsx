'use client';

import { useState } from 'react';
import type { PlayerSkill, SkillDef } from '@ro-game/shared';

import universalSkills from '../../../data/skills/universal.json';
import swordsmanSkills from '../../../data/skills/swordsman.json';
import mageSkills from '../../../data/skills/mage.json';
import archerSkills from '../../../data/skills/archer.json';
import thiefSkills from '../../../data/skills/thief.json';
import acolyteSkills from '../../../data/skills/acolyte.json';
import merchantSkills from '../../../data/skills/merchant.json';

const ALL_SKILL_DEFS: SkillDef[] = [
  ...universalSkills, ...swordsmanSkills,
  ...mageSkills, ...archerSkills, ...thiefSkills, ...acolyteSkills, ...merchantSkills,
] as SkillDef[];

interface SkillWindowProps {
  learnedSkills: PlayerSkill[];
  skillPoints: number;
  characterClass: string;
  onLearn: (skillId: number) => void;
  onClose: () => void;
}

export function SkillWindow({ learnedSkills, skillPoints, characterClass, onLearn, onClose }: SkillWindowProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillDef | null>(null);

  // Filter skills available for this class
  const availableDefs = ALL_SKILL_DEFS.filter(
    (d) => d.classRequired == null || d.classRequired === characterClass
  );

  const learnedMap = new Map<number, PlayerSkill>();
  for (const s of learnedSkills) {
    learnedMap.set(s.skillId, s);
  }

  const typeColor: Record<string, string> = {
    ACTIVE: '#e74c3c',
    PASSIVE: '#95a5a6',
    HEAL: '#2ecc71',
    BUFF: '#3498db',
    DEBUFF: '#9b59b6',
  };

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>Skills</span>
        <span style={{ fontSize: 11, color: '#f39c12' }}>Points: {skillPoints}</span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      <div style={listStyle}>
        {availableDefs.map((def) => {
          const learned = learnedMap.get(def.id);
          const currentLevel = learned?.level ?? 0;
          const canLearn = skillPoints > 0 && currentLevel < def.maxLevel;

          return (
            <div
              key={def.id}
              onClick={() => setSelectedSkill(def)}
              style={{
                ...rowStyle,
                borderColor: selectedSkill?.id === def.id ? '#f39c12' : 'transparent',
                opacity: currentLevel > 0 ? 1 : 0.6,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: typeColor[def.type] || '#fff' }}>{def.name}</span>
                  <span style={{ fontSize: 10, color: '#888' }}>
                    Lv.{currentLevel}/{def.maxLevel}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: '#666' }}>{def.type}</div>
              </div>
              {canLearn && (
                <button
                  onClick={(e) => { e.stopPropagation(); onLearn(def.id); }}
                  style={learnBtnStyle}
                >
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected skill detail */}
      {selectedSkill && (
        <div style={detailStyle}>
          <div style={{ fontWeight: 'bold', color: typeColor[selectedSkill.type] || '#fff' }}>
            {selectedSkill.name}
          </div>
          <div style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>
            {selectedSkill.description}
          </div>
          <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selectedSkill.spCost > 0 && <span>SP: {selectedSkill.spCost}</span>}
            {selectedSkill.cooldown > 0 && <span>CD: {selectedSkill.cooldown}s</span>}
            {selectedSkill.range > 0 && <span>Range: {selectedSkill.range}</span>}
            <span>Target: {selectedSkill.targetType}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', left: 16, transform: 'translateY(-50%)',
  width: 260, background: 'rgba(10,15,30,0.95)', borderRadius: 8,
  border: '1px solid #333', zIndex: 30, display: 'flex', flexDirection: 'column',
  maxHeight: '80vh', color: '#ddd',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 12px', borderBottom: '1px solid #333', fontSize: 14, gap: 8,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: 14, padding: '2px 6px',
};

const listStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
  maxHeight: 300,
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.2)',
  cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s',
};

const learnBtnStyle: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 4, border: '1px solid #2ecc71',
  background: 'rgba(46,204,113,0.2)', color: '#2ecc71', cursor: 'pointer',
  fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const detailStyle: React.CSSProperties = {
  padding: 8, borderTop: '1px solid #333',
  display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12,
};
