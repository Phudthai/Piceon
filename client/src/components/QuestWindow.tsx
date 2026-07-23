'use client';

import type { PlayerQuest } from '@ro-game/shared';

interface QuestWindowProps {
  quests: PlayerQuest[];
  onClose: () => void;
}

export function QuestWindow({ quests, onClose }: QuestWindowProps) {
  const inProgress = quests.filter((q) => q.status === 'IN_PROGRESS');
  const completed = quests.filter((q) => q.status === 'COMPLETED');

  return (
    <div style={windowStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold' }}>Quests</span>
        <span style={{ fontSize: 11, color: '#f39c12' }}>{inProgress.length} active</span>
        <button onClick={onClose} style={closeBtnStyle}>X</button>
      </div>

      <div style={listStyle}>
        {quests.length === 0 && (
          <div style={{ fontSize: 12, color: '#888', textAlign: 'center', padding: 12 }}>
            No quests yet. Talk to NPCs in town to find work.
          </div>
        )}

        {inProgress.map((quest) => (
          <div key={quest.questId} style={rowStyle}>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#f9e79f' }}>{quest.name}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>{quest.description}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
              {quest.objectives.map((obj, i) => {
                const done = obj.current >= obj.count;
                return (
                  <div key={i} style={{ fontSize: 11, color: done ? '#2ecc71' : '#ccc' }}>
                    {done ? '✓ ' : '• '}Defeat {obj.monsterName}: {obj.current}/{obj.count}
                  </div>
                );
              })}
            </div>
            {quest.objectives.every((o) => o.current >= o.count) && (
              <div style={{ fontSize: 11, color: '#f39c12', marginTop: 2 }}>
                Return to the quest giver to claim rewards
              </div>
            )}
          </div>
        ))}

        {completed.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Completed</div>
            {completed.map((quest) => (
              <div key={quest.questId} style={{ ...rowStyle, opacity: 0.5 }}>
                <div style={{ fontSize: 12, color: '#2ecc71' }}>✓ {quest.name}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

const windowStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)',
  width: 280, background: 'rgba(10,15,30,0.95)', borderRadius: 8,
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
  flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
  maxHeight: 400,
};

const rowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 2,
  padding: '8px 10px', borderRadius: 4, background: 'rgba(0,0,0,0.25)',
  border: '1px solid #2a2a3a',
};
