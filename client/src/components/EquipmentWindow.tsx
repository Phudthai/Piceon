'use client';

import type { InventoryItem } from '@ro-game/shared';

interface EquipmentWindowProps {
  items: InventoryItem[];
  onUnequip: (inventoryId: string) => void;
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

export function EquipmentWindow({ items, onUnequip, onClose }: EquipmentWindowProps) {
  const equipped = items.filter((i) => i.equipped);
  const slotMap: Record<string, InventoryItem | undefined> = {};
  for (const item of equipped) {
    if (item.equipSlot) {
      slotMap[item.equipSlot] = item;
    }
  }

  // Calculate total stats from equipment (incl. refine + card bonuses)
  let totalAtk = 0;
  let totalDef = 0;
  for (const item of equipped) {
    const eff = effectiveItemStats(item);
    totalAtk += eff.atk;
    totalDef += eff.def;
  }

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>Equipment</span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {SLOT_LABELS.map(({ key, label }) => {
          const item = slotMap[key];
          return (
            <div key={key} style={slotRowStyle}>
              <span style={{ fontSize: 11, color: '#888', width: 80 }}>{label}</span>
              {item ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 12, color: '#eee' }}>
                    {item.refineLevel ? `+${item.refineLevel} ${item.name}` : item.name}
                  </span>
                  <span style={{ fontSize: 10, color: '#888' }}>
                    {(() => {
                      const eff = effectiveItemStats(item);
                      return (
                        <>
                          {eff.atk > 0 ? `ATK+${eff.atk}` : ''}
                          {eff.def > 0 ? `DEF+${eff.def}` : ''}
                        </>
                      );
                    })()}
                  </span>
                  <button
                    onClick={() => onUnequip(item.inventoryId)}
                    style={unequipBtnStyle}
                  >
                    X
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic' }}>— empty —</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: '4px 12px 8px', borderTop: '1px solid #333', fontSize: 11, color: '#aaa' }}>
        Total: ATK +{totalAtk} / DEF +{totalDef}
      </div>
    </div>
  );
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: 300, background: 'rgba(10,15,30,0.95)', borderRadius: 8,
  border: '1px solid #333', zIndex: 30, color: '#ddd',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 12px', borderBottom: '1px solid #333', fontSize: 14,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: 14, padding: '2px 6px',
};

const slotRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '4px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.2)',
};

const unequipBtnStyle: React.CSSProperties = {
  marginLeft: 'auto', background: 'transparent', border: '1px solid #555',
  borderRadius: 3, color: '#e74c3c', cursor: 'pointer', fontSize: 10,
  padding: '1px 5px',
};
