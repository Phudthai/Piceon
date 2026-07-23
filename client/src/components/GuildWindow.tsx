'use client';

import { useState } from 'react';
import type { GuildState } from '@ro-game/shared';

interface GuildWindowProps {
  guild: GuildState | null;
  myId: string;
  pendingInvite: { from: string; guildName: string } | null;
  onCreate: (name: string) => void;
  onInvite: (name: string) => void;
  onAccept: () => void;
  onDecline: () => void;
  onLeave: () => void;
  onClose: () => void;
}

export function GuildWindow({
  guild, myId, pendingInvite,
  onCreate, onInvite, onAccept, onDecline, onLeave, onClose,
}: GuildWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'view' | 'create'>('view');

  const isLeader = guild?.leaderId === myId;

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>{guild ? guild.guildName : 'Guild'}</span>
        {guild && <span style={{ fontSize: 10, color: '#888' }}>Lv.{guild.level}</span>}
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      {/* Pending invite */}
      {pendingInvite && (
        <div style={inviteBannerStyle}>
          <span style={{ fontSize: 12 }}>{pendingInvite.from} invited you to {pendingInvite.guildName}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onAccept} style={{ ...actionBtn, borderColor: '#2ecc71' }}>Accept</button>
            <button onClick={onDecline} style={{ ...actionBtn, borderColor: '#e74c3c' }}>Decline</button>
          </div>
        </div>
      )}

      {guild ? (
        <>
          <div style={listStyle}>
            {guild.members.map((m) => (
              <div key={m.characterId} style={memberRow}>
                <div style={{
                  width: 6, height: 6, borderRadius: 3,
                  background: m.online ? '#2ecc71' : '#555',
                }} />
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 12,
                    color: m.rank === 'LEADER' ? '#f39c12' : m.rank === 'OFFICER' ? '#3498db' : '#eee',
                  }}>
                    {m.name}
                  </span>
                  <div style={{ fontSize: 10, color: '#888' }}>
                    Lv.{m.baseLevel} {m.class} — {m.rank}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={footerStyle}>
            {isLeader && (
              <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) { onInvite(inputValue.trim()); setInputValue(''); } }} style={{ display: 'flex', gap: 4, flex: 1 }}>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Invite player..."
                  style={inputStyle}
                />
                <button type="submit" style={actionBtn}>Invite</button>
              </form>
            )}
            <button onClick={onLeave} style={{ ...actionBtn, borderColor: '#e74c3c', color: '#e74c3c' }}>Leave</button>
          </div>
        </>
      ) : (
        <div style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Not in a guild</div>
          {mode === 'view' ? (
            <button onClick={() => setMode('create')} style={actionBtn}>Create Guild</button>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (inputValue.trim()) { onCreate(inputValue.trim()); setInputValue(''); setMode('view'); } }} style={{ display: 'flex', gap: 4 }}>
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Guild name..."
                style={inputStyle}
                autoFocus
              />
              <button type="submit" style={actionBtn}>Create</button>
              <button onClick={() => setMode('view')} style={actionBtn}>Cancel</button>
            </form>
          )}
        </div>
      )}
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
  padding: '6px 12px', borderBottom: '1px solid #333', fontSize: 14, gap: 6,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14,
};

const inviteBannerStyle: React.CSSProperties = {
  padding: 8, background: 'rgba(46,204,113,0.1)', borderBottom: '1px solid #333',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const listStyle: React.CSSProperties = {
  padding: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 250, overflowY: 'auto',
};

const memberRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px',
  background: 'rgba(0,0,0,0.2)', borderRadius: 4,
};

const footerStyle: React.CSSProperties = {
  padding: 8, borderTop: '1px solid #333', display: 'flex', gap: 4,
};

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #444',
  background: '#16213e', color: '#eee', fontSize: 11,
};

const actionBtn: React.CSSProperties = {
  padding: '3px 10px', borderRadius: 4, border: '1px solid #555',
  background: 'transparent', color: '#eee', cursor: 'pointer', fontSize: 11,
};
