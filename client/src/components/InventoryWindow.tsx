'use client';

import { useState } from 'react';
import type { InventoryItem } from '@ro-game/shared';

interface InventoryWindowProps {
  items: InventoryItem[];
  maxWeight?: number;
  onEquip: (inventoryId: string) => void;
  onUnequip: (inventoryId: string) => void;
  onUseItem: (inventoryId: string) => void;
  onRefine: (inventoryId: string, useProtection: boolean) => void;
  onSocket: (inventoryId: string, socketType: 'CARD' | 'RUNE', socketIndex: number, cardInventoryId: string) => void;
  onUnsocket: (inventoryId: string, socketType: 'CARD' | 'RUNE', socketIndex: number) => void;
  onClose: () => void;
}

// Mirrors server/src/game/systems/enhancement.ts REFINE_SUCCESS_RATE — display only, server is authoritative
const REFINE_SUCCESS_RATE: Record<number, number> = {
  1: 100, 2: 90, 3: 80, 4: 70,
  5: 60, 6: 50, 7: 40, 8: 30, 9: 20, 10: 10,
};
const BREAK_RISK_LEVEL = 5;
const MAX_REFINE_LEVEL = 10;
// Mirrors server/src/game/systems/inventory.ts recalcEquipStats — display only, server is authoritative
const REFINE_ATK_PER_LEVEL = 2;
const REFINE_DEF_PER_LEVEL = 1;

/** Item's own ATK/DEF/MATK/MDEF including refine bonus and socketed card bonuses —
 * matches what the server actually adds to the character's combat stats when equipped. */
function effectiveItemStats(item: InventoryItem) {
  const socketBonus = (item.sockets ?? []).reduce(
    (acc, s) => {
      const b = s.cardStatBonus;
      if (b) {
        acc.atk += b.atk ?? 0;
        acc.def += b.def ?? 0;
        acc.matk += b.matk ?? 0;
        acc.mdef += b.mdef ?? 0;
      }
      return acc;
    },
    { atk: 0, def: 0, matk: 0, mdef: 0 }
  );
  const refineLevel = item.refineLevel ?? 0;
  return {
    atk: item.atk + (item.type === 'WEAPON' ? refineLevel * REFINE_ATK_PER_LEVEL : 0) + socketBonus.atk,
    def: item.def + (item.type === 'ARMOR' ? refineLevel * REFINE_DEF_PER_LEVEL : 0) + socketBonus.def,
    matk: item.matk + socketBonus.matk,
    mdef: item.mdef + socketBonus.mdef,
  };
}

export function InventoryWindow({
  items, maxWeight, onEquip, onUnequip, onUseItem, onRefine, onSocket, onUnsocket, onClose,
}: InventoryWindowProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'equip' | 'use' | 'etc'>('all');
  const [useProtection, setUseProtection] = useState(false);
  // Which (socketType, socketIndex) slot is currently showing its card/rune picker
  const [socketingSlot, setSocketingSlot] = useState<{ type: 'CARD' | 'RUNE'; index: number } | null>(null);

  const selectedItem = items.find((i) => i.inventoryId === selectedId) ?? null;
  const currentWeight = items.reduce((sum, i) => sum + i.weight * i.quantity, 0);

  const filteredItems = items.filter((item) => {
    if (tab === 'all') return true;
    if (tab === 'equip') return item.type === 'WEAPON' || item.type === 'ARMOR';
    if (tab === 'use') return item.type === 'CONSUMABLE';
    if (tab === 'etc') return item.type === 'ETC' || item.type === 'CARD' || item.type === 'RUNE' || item.type === 'QUEST_ITEM';
    return true;
  });

  const cardItems = items.filter((i) => i.type === 'CARD');
  const runeItems = items.filter((i) => i.type === 'RUNE');

  const typeColor: Record<string, string> = {
    WEAPON: '#e74c3c',
    ARMOR: '#3498db',
    CONSUMABLE: '#2ecc71',
    ETC: '#95a5a6',
    CARD: '#9b59b6',
    RUNE: '#e67e22',
    QUEST_ITEM: '#f39c12',
  };

  const displayName = (item: InventoryItem) =>
    item.refineLevel ? `+${item.refineLevel} ${item.name}` : item.name;

  const targetLevel = (selectedItem?.refineLevel ?? 0) + 1;
  const risky = targetLevel >= BREAK_RISK_LEVEL;

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>Inventory</span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      {maxWeight !== undefined && (
        <div style={{ padding: '4px 12px', fontSize: 10, color: currentWeight > maxWeight * 0.9 ? '#e74c3c' : '#888' }}>
          Weight: {currentWeight} / {maxWeight}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '4px 8px' }}>
        {(['all', 'equip', 'use', 'etc'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedId(null); setSocketingSlot(null); }}
            style={{
              ...tabStyle,
              background: tab === t ? '#2c3e50' : 'transparent',
              color: tab === t ? '#fff' : '#888',
            }}
          >
            {t === 'all' ? 'All' : t === 'equip' ? 'Equip' : t === 'use' ? 'Use' : 'Etc'}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div style={gridStyle}>
        {filteredItems.map((item) => (
          <div
            key={item.inventoryId}
            onClick={() => { setSelectedId(item.inventoryId); setSocketingSlot(null); setUseProtection(false); }}
            style={{
              ...itemSlotStyle,
              borderColor: selectedId === item.inventoryId ? '#f39c12' : '#333',
              background: item.equipped ? 'rgba(46,204,113,0.15)' : 'rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 10, color: typeColor[item.type] || '#aaa', textAlign: 'center' }}>
              {displayName(item)}
            </div>
            <div style={{ fontSize: 9, color: '#888', textAlign: 'center' }}>
              {item.quantity > 1 ? `x${item.quantity}` : ''}
              {item.equipped ? ' [E]' : ''}
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#666', padding: 20 }}>
            No items
          </div>
        )}
      </div>

      {/* Selected item detail */}
      {selectedItem && (
        <div style={detailStyle}>
          <div style={{ fontWeight: 'bold', color: typeColor[selectedItem.type] || '#fff' }}>
            {displayName(selectedItem)}
          </div>
          <div style={{ fontSize: 11, color: '#aaa' }}>
            {selectedItem.type}{selectedItem.subtype ? ` (${selectedItem.subtype})` : ''}
          </div>
          {selectedItem.description && (
            <div style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>{selectedItem.description}</div>
          )}
          <div style={{ fontSize: 11, color: '#888', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(() => {
              const eff = effectiveItemStats(selectedItem);
              return (
                <>
                  {eff.atk > 0 && <span>ATK: {eff.atk}</span>}
                  {eff.def > 0 && <span>DEF: {eff.def}</span>}
                  {eff.matk > 0 && <span>MATK: {eff.matk}</span>}
                  {eff.mdef > 0 && <span>MDEF: {eff.mdef}</span>}
                </>
              );
            })()}
            {selectedItem.range !== undefined && <span>Range: {selectedItem.range}</span>}
            <span>Weight: {selectedItem.weight}</span>
            <span>Sell: {selectedItem.sellPrice}z</span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {(selectedItem.type === 'WEAPON' || selectedItem.type === 'ARMOR') && !selectedItem.equipped && (
              <button onClick={() => onEquip(selectedItem.inventoryId)} style={actionBtnStyle}>
                Equip
              </button>
            )}
            {selectedItem.equipped && (
              <button onClick={() => onUnequip(selectedItem.inventoryId)} style={actionBtnStyle}>
                Unequip
              </button>
            )}
            {selectedItem.type === 'CONSUMABLE' && (
              <button onClick={() => onUseItem(selectedItem.inventoryId)} style={actionBtnStyle}>
                Use
              </button>
            )}
          </div>

          {/* Refine */}
          {(selectedItem.type === 'WEAPON' || selectedItem.type === 'ARMOR') && (
            <div style={sectionStyle}>
              <div style={{ fontSize: 11, color: '#f39c12', fontWeight: 'bold' }}>
                Refine {targetLevel <= MAX_REFINE_LEVEL ? `(+${selectedItem.refineLevel ?? 0} → +${targetLevel})` : '(max)'}
              </div>
              {targetLevel <= MAX_REFINE_LEVEL && (
                <>
                  <div style={{ fontSize: 10, color: '#aaa' }}>
                    Success chance: {REFINE_SUCCESS_RATE[targetLevel] ?? 10}%
                    {risky && ' — failure destroys this item!'}
                  </div>
                  {risky && (
                    <label style={{ fontSize: 10, color: '#ccc', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={useProtection}
                        onChange={(e) => setUseProtection(e.target.checked)}
                      />
                      Use a Blessed Charm to prevent destruction
                    </label>
                  )}
                  <button
                    onClick={() => onRefine(selectedItem.inventoryId, useProtection)}
                    style={{ ...actionBtnStyle, borderColor: risky ? '#e74c3c' : '#555', alignSelf: 'flex-start' }}
                  >
                    Refine
                  </button>
                </>
              )}
            </div>
          )}

          {/* Card and Rune sockets — independent pools, a card can only go in a card
              slot and a rune can only go in a rune slot */}
          {(selectedItem.type === 'WEAPON' || selectedItem.type === 'ARMOR') && (
            <>
              {renderSocketSection(selectedItem, 'CARD', '#9b59b6', cardItems)}
              {renderSocketSection(selectedItem, 'RUNE', '#e67e22', runeItems)}
            </>
          )}
        </div>
      )}
    </div>
  );

  function renderSocketSection(
    item: InventoryItem,
    socketType: 'CARD' | 'RUNE',
    color: string,
    socketableItems: InventoryItem[]
  ) {
    const maxSlots = socketType === 'CARD' ? item.cardSlots : item.runeSlots;
    if (!maxSlots) return null;

    return (
      <div style={sectionStyle}>
        <div style={{ fontSize: 11, color, fontWeight: 'bold' }}>
          {socketType === 'CARD' ? 'Card Sockets' : 'Rune Sockets'}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Array.from({ length: maxSlots }).map((_, idx) => {
            const socket = item.sockets?.find((s) => s.socketType === socketType && s.socketIndex === idx);
            const isSocketing = socketingSlot?.type === socketType && socketingSlot.index === idx;
            return (
              <div key={idx} style={socketSlotStyle}>
                {socket ? (
                  <>
                    <span style={{ fontSize: 10 }}>{socket.name}</span>
                    <button onClick={() => onUnsocket(item.inventoryId, socketType, idx)} style={smallBtnStyle}>
                      Remove
                    </button>
                  </>
                ) : isSocketing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {socketableItems.length === 0 && (
                      <span style={{ fontSize: 9, color: '#666' }}>
                        No {socketType === 'CARD' ? 'cards' : 'runes'}
                      </span>
                    )}
                    {socketableItems.map((c) => (
                      <button
                        key={c.inventoryId}
                        onClick={() => { onSocket(item.inventoryId, socketType, idx, c.inventoryId); setSocketingSlot(null); }}
                        style={smallBtnStyle}
                      >
                        {c.name}
                      </button>
                    ))}
                    <button onClick={() => setSocketingSlot(null)} style={smallBtnStyle}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setSocketingSlot({ type: socketType, index: idx })} style={smallBtnStyle}>
                    [Empty]
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)',
  width: 280, background: 'rgba(10,15,30,0.95)', borderRadius: 8,
  border: '1px solid #333', zIndex: 30, display: 'flex', flexDirection: 'column',
  maxHeight: '80vh', color: '#ddd',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 12px', borderBottom: '1px solid #333', fontSize: 14,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: 14, padding: '2px 6px',
};

const tabStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
  fontSize: 11, transition: 'background 0.15s',
};

const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
  padding: 8, overflowY: 'auto', maxHeight: 300,
};

const itemSlotStyle: React.CSSProperties = {
  border: '1px solid #333', borderRadius: 4, padding: 4,
  cursor: 'pointer', minHeight: 44, display: 'flex', flexDirection: 'column',
  justifyContent: 'center', transition: 'border-color 0.15s',
};

const detailStyle: React.CSSProperties = {
  padding: 8, borderTop: '1px solid #333',
  display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12,
  overflowY: 'auto', maxHeight: 260,
};

const actionBtnStyle: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, border: '1px solid #555',
  background: '#2c3e50', color: '#eee', cursor: 'pointer', fontSize: 11,
};

const sectionStyle: React.CSSProperties = {
  marginTop: 6, paddingTop: 6, borderTop: '1px solid #2a2a3a',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const socketSlotStyle: React.CSSProperties = {
  border: '1px solid #333', borderRadius: 4, padding: 4,
  minWidth: 70, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
  background: 'rgba(0,0,0,0.25)',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '2px 6px', borderRadius: 3, border: '1px solid #555',
  background: '#1a1a2e', color: '#ccc', cursor: 'pointer', fontSize: 9,
};
