'use client';

import { useState } from 'react';
import type { ShopData, InventoryItem } from '@ro-game/shared';

interface ShopWindowProps {
  shop: ShopData;
  inventory: InventoryItem[];
  zeny: number;
  onBuy: (npcId: string, itemId: number, quantity: number) => void;
  onSell: (inventoryId: string, quantity: number) => void;
  onClose: () => void;
}

export function ShopWindow({ shop, inventory, zeny, onBuy, onSell, onClose }: ShopWindowProps) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [selectedBuy, setSelectedBuy] = useState<number | null>(null);
  const [selectedSell, setSelectedSell] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const sellableItems = inventory.filter((i) => !i.equipped && i.sellPrice > 0);

  const handleBuy = () => {
    if (selectedBuy === null) return;
    onBuy(shop.npcId, selectedBuy, quantity);
    setQuantity(1);
  };

  const handleSell = () => {
    if (!selectedSell) return;
    onSell(selectedSell, quantity);
    setQuantity(1);
    setSelectedSell(null);
  };

  const selectedBuyItem = shop.items.find((i) => i.itemId === selectedBuy);
  const selectedSellItem = sellableItems.find((i) => i.inventoryId === selectedSell);

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>{shop.shopName}</span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '4px 8px' }}>
        <button
          onClick={() => { setTab('buy'); setQuantity(1); }}
          style={{ ...tabBtnStyle, background: tab === 'buy' ? '#2c3e50' : 'transparent', color: tab === 'buy' ? '#fff' : '#888' }}
        >
          Buy
        </button>
        <button
          onClick={() => { setTab('sell'); setQuantity(1); }}
          style={{ ...tabBtnStyle, background: tab === 'sell' ? '#2c3e50' : 'transparent', color: tab === 'sell' ? '#fff' : '#888' }}
        >
          Sell
        </button>
      </div>

      {/* Item list */}
      <div style={listStyle}>
        {tab === 'buy' ? (
          shop.items.map((item) => (
            <div
              key={item.itemId}
              onClick={() => { setSelectedBuy(item.itemId); setQuantity(1); }}
              style={{
                ...rowStyle,
                borderColor: selectedBuy === item.itemId ? '#f39c12' : 'transparent',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12 }}>{item.name}</div>
                <div style={{ fontSize: 10, color: '#888' }}>
                  {item.atk > 0 ? `ATK: ${item.atk} ` : ''}
                  {item.matk > 0 ? `MATK: ${item.matk} ` : ''}
                  {item.def > 0 ? `DEF: ${item.def}` : ''}
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#f1c40f' }}>{item.price}z</span>
            </div>
          ))
        ) : (
          sellableItems.length > 0 ? sellableItems.map((item) => (
            <div
              key={item.inventoryId}
              onClick={() => { setSelectedSell(item.inventoryId); setQuantity(1); }}
              style={{
                ...rowStyle,
                borderColor: selectedSell === item.inventoryId ? '#f39c12' : 'transparent',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12 }}>{item.name} x{item.quantity}</div>
              </div>
              <span style={{ fontSize: 12, color: '#f1c40f' }}>{item.sellPrice}z</span>
            </div>
          )) : (
            <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>No items to sell</div>
          )
        )}
      </div>

      {/* Bottom: quantity + action */}
      <div style={footerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#888' }}>Qty:</span>
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={qtyBtnStyle}>-</button>
          <span style={{ fontSize: 13, minWidth: 20, textAlign: 'center' }}>{quantity}</span>
          <button onClick={() => setQuantity(Math.min(99, quantity + 1))} style={qtyBtnStyle}>+</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {tab === 'buy' && selectedBuyItem && (
            <span style={{ fontSize: 11, color: '#f1c40f' }}>
              Total: {selectedBuyItem.price * quantity}z
            </span>
          )}
          {tab === 'sell' && selectedSellItem && (
            <span style={{ fontSize: 11, color: '#f1c40f' }}>
              Total: {selectedSellItem.sellPrice * quantity}z
            </span>
          )}
          <button
            onClick={tab === 'buy' ? handleBuy : handleSell}
            disabled={tab === 'buy' ? selectedBuy === null : selectedSell === null}
            style={{
              ...actionBtnStyle,
              opacity: (tab === 'buy' ? selectedBuy === null : selectedSell === null) ? 0.5 : 1,
            }}
          >
            {tab === 'buy' ? 'Buy' : 'Sell'}
          </button>
        </div>

        <div style={{ fontSize: 11, color: '#f1c40f' }}>Zeny: {zeny}</div>
      </div>
    </div>
  );
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: 320, background: 'rgba(10,15,30,0.95)', borderRadius: 8,
  border: '1px solid #333', zIndex: 30, color: '#ddd',
  display: 'flex', flexDirection: 'column', maxHeight: '70vh',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 12px', borderBottom: '1px solid #333', fontSize: 14,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: 14, padding: '2px 6px',
};

const tabBtnStyle: React.CSSProperties = {
  padding: '3px 12px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11,
};

const listStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4,
  maxHeight: 250,
};

const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 8px', borderRadius: 4, background: 'rgba(0,0,0,0.2)',
  cursor: 'pointer', border: '1px solid transparent', transition: 'border-color 0.15s',
};

const footerStyle: React.CSSProperties = {
  padding: '8px 12px', borderTop: '1px solid #333',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6,
};

const qtyBtnStyle: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 3, border: '1px solid #555',
  background: '#2c3e50', color: '#eee', cursor: 'pointer', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '4px 16px', borderRadius: 4, border: '1px solid #555',
  background: '#2c3e50', color: '#eee', cursor: 'pointer', fontSize: 12,
};
