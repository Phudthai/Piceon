'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayerSkill } from '@ro-game/shared';

interface SkillBarProps {
  skills: PlayerSkill[];
  skillBar: Array<number | null>; // 9 slots, skillId or null
  onUseSkill: (skillId: number) => void;
  onSetSlot: (slot: number, skillId: number | null) => void;
}

export function SkillBar({ skills, skillBar, onUseSkill, onSetSlot }: SkillBarProps) {
  const skillMap = new Map<number, PlayerSkill>();
  for (const s of skills) {
    skillMap.set(s.skillId, s);
  }

  // Only show active/usable skills in bar
  const usableSkills = skills.filter((s) => s.type !== 'PASSIVE');

  // Client-local cooldown countdown (optimistic — starts on click, not server-confirmed;
  // the server enforces the real cooldown independently, see server/src/game/systems/effects.ts)
  const cooldownEndsRef = useRef<Record<number, number>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 150);
    return () => clearInterval(interval);
  }, []);

  const handleUse = (skill: PlayerSkill) => {
    const now = Date.now();
    if ((cooldownEndsRef.current[skill.skillId] ?? 0) > now) return;
    onUseSkill(skill.skillId);
    if (skill.cooldown > 0) {
      cooldownEndsRef.current[skill.skillId] = now + skill.cooldown * 1000;
    }
  };

  return (
    <div style={barContainerStyle}>
      {skillBar.map((skillId, idx) => {
        const skill = skillId ? skillMap.get(skillId) : null;
        const slotNum = idx + 1;
        const remainingMs = skill ? (cooldownEndsRef.current[skill.skillId] ?? 0) - Date.now() : 0;
        const onCooldown = remainingMs > 0;

        return (
          <div
            key={idx}
            style={slotStyle}
            onClick={() => {
              if (skill) handleUse(skill);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              // Cycle through usable skills on right-click
              if (!skill) {
                const first = usableSkills[0];
                if (first) onSetSlot(idx, first.skillId);
              } else {
                const currentIdx = usableSkills.findIndex((s) => s.skillId === skillId);
                const next = usableSkills[(currentIdx + 1) % usableSkills.length];
                onSetSlot(idx, next?.skillId ?? null);
              }
            }}
            title={skill ? `${skill.name} Lv.${skill.level} (${slotNum})` : `Empty (${slotNum})`}
          >
            <div style={{ fontSize: 8, color: '#666', position: 'absolute', top: 1, left: 3 }}>
              {slotNum}
            </div>
            {skill ? (
              <div style={{ fontSize: 9, color: '#eee', textAlign: 'center', lineHeight: 1.2 }}>
                {skill.name.split(' ').map((w) => w[0]).join('')}
                <div style={{ fontSize: 8, color: '#888' }}>Lv.{skill.level}</div>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: '#444' }}>—</div>
            )}
            {onCooldown && (
              <div style={cooldownOverlayStyle}>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }}>
                  {(remainingMs / 1000).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const barContainerStyle: React.CSSProperties = {
  position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
  zIndex: 10, display: 'flex', gap: 3,
  background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: 4,
};

const slotStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 4, border: '1px solid #444',
  background: 'rgba(0,0,0,0.4)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  position: 'relative', transition: 'border-color 0.15s',
};

const cooldownOverlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, borderRadius: 4,
  background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
