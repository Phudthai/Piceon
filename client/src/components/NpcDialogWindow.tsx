'use client';

import type { NpcDialog, PlayerQuest } from '@ro-game/shared';

interface NpcDialogWindowProps {
  dialog: NpcDialog;
  quests: PlayerQuest[]; // player's quest list, to show objective details on accept choices
  onAcceptQuest: (questId: number) => void;
  onCompleteQuest: (questId: number) => void;
  onClose: () => void;
}

export function NpcDialogWindow({ dialog, quests, onAcceptQuest, onCompleteQuest, onClose }: NpcDialogWindowProps) {
  const questById = new Map(quests.map((q) => [q.questId, q]));

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold', color: '#f9e79f' }}>{dialog.npcName}</span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      <div style={{ padding: 12, fontSize: 13, color: '#ccc', lineHeight: 1.5 }}>
        {dialog.text}
      </div>

      {dialog.quests.length > 0 && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dialog.quests.map((info) => {
            const active = questById.get(info.questId);
            return (
              <div key={info.questId} style={questRowStyle}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold' }}>{info.questName}</div>
                  {active && active.status === 'IN_PROGRESS' && (
                    <div style={{ fontSize: 10, color: '#888' }}>
                      {active.objectives.map((o) => `${o.monsterName} ${o.current}/${o.count}`).join(', ')}
                    </div>
                  )}
                </div>
                {info.canAccept && (
                  <button onClick={() => onAcceptQuest(info.questId)} style={acceptBtnStyle}>
                    Accept
                  </button>
                )}
                {info.canComplete && (
                  <button onClick={() => onCompleteQuest(info.questId)} style={completeBtnStyle}>
                    Complete
                  </button>
                )}
                {!info.canAccept && !info.canComplete && (
                  <span style={{ fontSize: 10, color: '#666' }}>In progress</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', bottom: 220, left: '50%', transform: 'translateX(-50%)',
  width: 340, background: 'rgba(10,15,30,0.95)', borderRadius: 8,
  border: '1px solid #333', zIndex: 30, display: 'flex', flexDirection: 'column',
  color: '#ddd',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '6px 12px', borderBottom: '1px solid #333', fontSize: 14,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: 14, padding: '2px 6px',
};

const questRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 10px', borderRadius: 4, background: 'rgba(0,0,0,0.25)',
  border: '1px solid #2a2a3a',
};

const acceptBtnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 4, border: '1px solid #3498db',
  background: 'rgba(52,152,219,0.2)', color: '#3498db', cursor: 'pointer', fontSize: 11,
};

const completeBtnStyle: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 4, border: '1px solid #2ecc71',
  background: 'rgba(46,204,113,0.2)', color: '#2ecc71', cursor: 'pointer', fontSize: 11,
};
