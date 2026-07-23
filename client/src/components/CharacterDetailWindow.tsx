'use client';

import type { BaseStats, InventoryItem } from '@ro-game/shared';

interface CharacterDetailWindowProps {
  items: InventoryItem[];
  /** Effective stats — base + socketed card bonuses + passive skill bonuses (the "true"
   *  total), not the raw allocatable base stat shown on the Status window */
  effectiveStats: BaseStats | null;
  baseLevel: number;
  jobLevel: number;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  atk?: number;
  matk?: number;
  hit?: number;
  flee?: number;
  critChance?: number;
  def?: number;
  mdef?: number;
  aspd?: number;
  onClose: () => void;
}

const SLOT_LABELS: Array<{ key: string; label: string }> = [
  { key: 'head', label: 'Head' },
  { key: 'weapon', label: 'Weapon' },
  { key: 'offhand', label: 'Off-hand' },
  { key: 'body', label: 'Body' },
  { key: 'garment', label: 'Garment' },
  { key: 'shoes', label: 'Shoes' },
  { key: 'accessory1', label: 'Accessory 1' },
  { key: 'accessory2', label: 'Accessory 2' },
];

// Mirrors server/src/game/systems/inventory.ts recalcEquipStats — display only, server is authoritative
const REFINE_ATK_PER_LEVEL = 2;
const REFINE_DEF_PER_LEVEL = 1;

/** Item's own ATK/DEF including refine bonus and socketed card bonuses — matches what
 * the server actually adds to the character's combat stats when equipped. */
function effectiveItemStats(item: InventoryItem) {
  const socketBonus = (item.sockets ?? []).reduce(
    (acc, s) => {
      const b = s.cardStatBonus;
      if (b) {
        acc.atk += b.atk ?? 0;
        acc.def += b.def ?? 0;
      }
      return acc;
    },
    { atk: 0, def: 0 }
  );
  const refineLevel = item.refineLevel ?? 0;
  return {
    atk: item.atk + (item.type === 'WEAPON' ? refineLevel * REFINE_ATK_PER_LEVEL : 0) + socketBonus.atk,
    def: item.def + (item.type === 'ARMOR' ? refineLevel * REFINE_DEF_PER_LEVEL : 0) + socketBonus.def,
  };
}

const fmt = (n: number | undefined, decimals = 0) =>
  n === undefined || !Number.isFinite(n) ? '—' : n.toFixed(decimals);

export function CharacterDetailWindow({
  items, effectiveStats, baseLevel, jobLevel, hp, maxHp, sp, maxSp,
  atk, matk, hit, flee, critChance, def, mdef, aspd, onClose,
}: CharacterDetailWindowProps) {
  const equipped = items.filter((i) => i.equipped);
  const slotMap: Record<string, InventoryItem | undefined> = {};
  for (const item of equipped) {
    if (item.equipSlot) slotMap[item.equipSlot] = item;
  }

  const statBadges: Array<{ label: string; value: string }> = [
    { label: 'STR', value: fmt(effectiveStats?.str) },
    { label: 'AGI', value: fmt(effectiveStats?.agi) },
    { label: 'VIT', value: fmt(effectiveStats?.vit) },
    { label: 'INT', value: fmt(effectiveStats?.int) },
    { label: 'DEX', value: fmt(effectiveStats?.dex) },
    { label: 'LUK', value: fmt(effectiveStats?.luk) },
    { label: 'MAX HP', value: fmt(maxHp) },
    { label: 'MAX SP', value: fmt(maxSp) },
    { label: 'ATK', value: fmt(atk) },
    { label: 'MATK', value: fmt(matk) },
    { label: 'DEF', value: fmt(def) },
    { label: 'MDEF', value: fmt(mdef) },
    { label: 'Hit', value: fmt(hit) },
    { label: 'Flee', value: fmt(flee) },
    { label: 'Crit%', value: fmt(critChance, 1) },
    { label: 'ASPD', value: fmt(aspd, 1) },
  ];

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>Character</span>
        <span style={{ fontSize: 11, color: '#888' }}>
          Base Lv.{baseLevel} / Job Lv.{jobLevel}
        </span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      <div style={bodyStyle}>
        {/* Equipment */}
        <div>
          <div style={sectionTitleStyle}>Equipment</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SLOT_LABELS.map(({ key, label }) => {
              const item = slotMap[key];
              const eff = item ? effectiveItemStats(item) : null;
              return (
                <div key={key} style={slotRowStyle}>
                  <span style={{ fontSize: 11, color: '#888', width: 74 }}>{label}</span>
                  {item ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.refineLevel ? `+${item.refineLevel} ${item.name}` : item.name}
                      </span>
                      <span style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>
                        {eff && eff.atk > 0 ? `ATK+${eff.atk} ` : ''}
                        {eff && eff.def > 0 ? `DEF+${eff.def}` : ''}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>— empty —</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats */}
        <div>
          <div style={sectionTitleStyle}>Stats</div>
          <div style={statGridStyle}>
            {statBadges.map(({ label, value }) => (
              <div key={label} style={statBadgeStyle}>
                <span style={{ fontSize: 10, color: '#888' }}>{label}</span>
                <span style={{ fontSize: 13, color: '#f9e79f', fontWeight: 'bold' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: 480, maxHeight: '80vh', background: 'rgba(10,15,30,0.95)', borderRadius: 8,
  border: '1px solid #333', zIndex: 30, color: '#ddd', display: 'flex', flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 12px', borderBottom: '1px solid #333', fontSize: 14, gap: 8,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: 14, padding: '2px 6px',
};

const bodyStyle: React.CSSProperties = {
  display: 'flex', gap: 16, padding: 12, overflowY: 'auto',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12, color: '#f39c12', fontWeight: 'bold', marginBottom: 6,
};

const slotRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '4px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.2)', width: 220,
};

const statGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, width: 200,
};

const statBadgeStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '5px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.25)',
};
