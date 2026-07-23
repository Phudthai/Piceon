'use client';

import { useState } from 'react';
import type { PartyState } from '@ro-game/shared';

interface PartyWindowProps {
  party: PartyState | null;
  myId: string;
  pendingInvite: string | null; // inviter name
  onInvite: (name: string) => void;
  onAccept: () => void;
  onDecline: () => void;
  onLeave: () => void;
  onKick: (targetId: string) => void;
  onClose: () => void;
}

export function PartyWindow({
  party, myId, pendingInvite,
  onInvite, onAccept, onDecline, onLeave, onKick, onClose,
}: PartyWindowProps) {
  const [inviteName, setInviteName] = useState('');

  const isLeader = party?.leaderId === myId;

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>Party</span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      {/* Pending invite */}
      {pendingInvite && (
        <div style={inviteBannerStyle}>
          <span style={{ fontSize: 12 }}>{pendingInvite} invited you to a party</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={onAccept} style={{ ...actionBtn, borderColor: '#2ecc71' }}>Accept</button>
            <button onClick={onDecline} style={{ ...actionBtn, borderColor: '#e74c3c' }}>Decline</button>
          </div>
        </div>
      )}

      {party ? (
        <>
          <div style={listStyle}>
            {party.members.map((m) => (
              <div key={m.characterId} style={memberRow}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: m.characterId === party.leaderId ? '#f39c12' : '#eee' }}>
                    {m.name}
                    {m.characterId === party.leaderId ? ' ★' : ''}
                  </span>
                  <div style={{ fontSize: 10, color: '#888' }}>
                    Lv.{m.baseLevel} {m.class} — {m.mapName}
                  </div>
                </div>
                {/* HP bar */}
                <div style={{ width: 50 }}>
                  <div style={{ height: 4, background: '#333', borderRadius: 2 }}>
                    <div style={{
                      height: 4, borderRadius: 2,
                      width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%`,
                      background: m.hp / m.maxHp > 0.5 ? '#2ecc71' : m.hp / m.maxHp > 0.25 ? '#f1c40f' : '#e74c3c',
                    }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#888', textAlign: 'center' }}>{m.hp}/{m.maxHp}</div>
                </div>
                {isLeader && m.characterId !== myId && (
                  <button onClick={() => onKick(m.characterId)} style={kickBtn}>X</button>
                )}
              </div>
            ))}
          </div>
          <div style={footerStyle}>
            {isLeader && (
              <form onSubmit={(e) => { e.preventDefault(); if (inviteName.trim()) { onInvite(inviteName.trim()); setInviteName(''); } }} style={{ display: 'flex', gap: 4, flex: 1 }}>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
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
          <div style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>Not in a party</div>
          <form onSubmit={(e) => { e.preventDefault(); if (inviteName.trim()) { onInvite(inviteName.trim()); setInviteName(''); } }} style={{ display: 'flex', gap: 4 }}>
            <input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Invite player..."
              style={inputStyle}
            />
            <button type="submit" style={actionBtn}>Invite</button>
          </form>
        </div>
      )}
    </div>
  );
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', top: 80, right: 16,
  width: 260, background: 'rgba(10,15,30,0.95)', borderRadius: 8,
  border: '1px solid #333', zIndex: 30, color: '#ddd',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 12px', borderBottom: '1px solid #333', fontSize: 14,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: 14,
};

const inviteBannerStyle: React.CSSProperties = {
  padding: 8, background: 'rgba(46,204,113,0.1)', borderBottom: '1px solid #333',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const listStyle: React.CSSProperties = {
  padding: 8, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto',
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

const kickBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid #555', borderRadius: 3,
  color: '#e74c3c', cursor: 'pointer', fontSize: 10, padding: '1px 5px',
};
