'use client';

import { useState } from 'react';
import type { BaseStats, PlayerStats } from '@ro-game/shared';

interface StatusWindowProps {
  stats: BaseStats;
  statPoints: number;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  baseLevel: number;
  jobLevel: number;
  atk?: number;
  matk?: number;
  hit?: number;
  flee?: number;
  critChance?: number;
  statPreview?: NonNullable<PlayerStats['statPreview']>;
  onAllocate: (stat: keyof BaseStats) => void;
  onClose: () => void;
}

const STAT_LABELS: Array<{ key: keyof BaseStats; label: string; derivedLabel: string }> = [
  { key: 'str', label: 'STR', derivedLabel: 'ATK' },
  { key: 'agi', label: 'AGI', derivedLabel: 'Flee' },
  { key: 'vit', label: 'VIT', derivedLabel: 'MaxHP' },
  { key: 'int', label: 'INT', derivedLabel: 'MATK' },
  { key: 'dex', label: 'DEX', derivedLabel: 'Hit' },
  { key: 'luk', label: 'LUK', derivedLabel: 'Crit%' },
];

// Rounds derived-stat display to whole numbers; crit% keeps one decimal since it's often <1
const fmt = (n: number, decimals = 0) => (Number.isFinite(n) ? n.toFixed(decimals) : '—');

export function StatusWindow({
  stats, statPoints, hp, maxHp, sp, maxSp, baseLevel, jobLevel,
  atk, matk, hit, flee, critChance, statPreview,
  onAllocate, onClose,
}: StatusWindowProps) {
  const [hoveredStat, setHoveredStat] = useState<keyof BaseStats | null>(null);

  const derivedValue: Record<keyof BaseStats, { value: number | undefined; decimals?: number }> = {
    str: { value: atk },
    agi: { value: flee },
    vit: { value: maxHp },
    int: { value: matk },
    dex: { value: hit },
    luk: { value: critChance, decimals: 1 },
  };

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>Status</span>
        <span style={{ fontSize: 11, color: '#f39c12' }}>Points: {statPoints}</span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      <div style={{ padding: '8px 12px', fontSize: 11, color: '#888', display: 'flex', gap: 12 }}>
        <span>Base Lv.{baseLevel}</span>
        <span>Job Lv.{jobLevel}</span>
        <span style={{ color: '#e94560' }}>HP {hp}/{maxHp}</span>
        <span style={{ color: '#3498db' }}>SP {sp}/{maxSp}</span>
      </div>

      <div style={listStyle}>
        {STAT_LABELS.map(({ key, label, derivedLabel }) => {
          const { value, decimals } = derivedValue[key];
          const delta = statPreview?.[key];
          const isHovered = hoveredStat === key;
          return (
            <div
              key={key}
              style={rowStyle}
              onMouseEnter={() => setHoveredStat(key)}
              onMouseLeave={() => setHoveredStat((cur) => (cur === key ? null : cur))}
            >
              <span style={{ width: 36, fontWeight: 'bold', fontSize: 13 }}>{label}</span>
              <span style={{ flex: 1, fontSize: 10, color: isHovered ? '#2ecc71' : '#666' }}>
                {isHovered && delta !== undefined
                  ? `+1 → ${derivedLabel} +${fmt(delta, decimals)}`
                  : value !== undefined
                    ? `${derivedLabel} ${fmt(value, decimals)}`
                    : derivedLabel}
              </span>
              <span style={{ width: 28, textAlign: 'right', fontSize: 14, color: '#f9e79f' }}>
                {stats[key]}
              </span>
              {statPoints > 0 && (
                <button onClick={() => onAllocate(key)} style={plusBtnStyle} title={`+1 ${label}`}>
                  +
                </button>
              )}
            </div>
          );
        })}
      </div>

      {statPoints === 0 && (
        <div style={{ padding: '6px 12px 10px', fontSize: 10, color: '#666', textAlign: 'center' }}>
          Level up to earn more stat points
        </div>
      )}
    </div>
  );
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', top: 90, left: 16,
  width: 230, background: 'rgba(10,15,30,0.95)', borderRadius: 8,
  border: '1px solid #333', zIndex: 30, display: 'flex', flexDirection: 'column',
  color: '#ddd',
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
  padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '5px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.25)',
};

const plusBtnStyle: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 4, border: '1px solid #2ecc71',
  background: 'rgba(46,204,113,0.2)', color: '#2ecc71', cursor: 'pointer',
  fontSize: 14, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center',
};
