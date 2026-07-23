'use client';

import type { CharacterSummary } from '@ro-game/shared';

interface CharacterCardProps {
  character: CharacterSummary;
  onSelect: (id: string) => void;
}

export default function CharacterCard({ character, onSelect }: CharacterCardProps) {
  return (
    <div
      onClick={() => onSelect(character.id)}
      style={{
        padding: 20,
        borderRadius: 8,
        border: '1px solid #444',
        background: '#16213e',
        cursor: 'pointer',
        width: 240,
        textAlign: 'center',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#e94560')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#444')}
    >
      <h3 style={{ margin: '0 0 8px 0' }}>{character.name}</h3>
      <p style={{ margin: '4px 0', color: '#aaa', fontSize: 14 }}>
        {character.class}
      </p>
      <p style={{ margin: '4px 0', fontSize: 13, color: '#888' }}>
        Base Lv. {character.baseLevel} / Job Lv. {character.jobLevel}
      </p>
    </div>
  );
}
