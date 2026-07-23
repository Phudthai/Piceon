'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/utils/api';

const STARTING_CLASSES = [
  { value: 'SWORDSMAN', label: 'Swordsman', blurb: 'Melee fighter — high ATK and HP, close-range combat.' },
  { value: 'MAGE', label: 'Mage', blurb: 'Spellcaster — elemental bolts, high MATK, low HP.' },
  { value: 'ARCHER', label: 'Archer', blurb: 'Ranged fighter — attacks from a distance with a bow.' },
  { value: 'THIEF', label: 'Thief', blurb: 'Agile fighter — fast attacks, high dodge and crit.' },
  { value: 'ACOLYTE', label: 'Acolyte', blurb: 'Support/healer — restores HP, buffs allies.' },
  { value: 'MERCHANT', label: 'Merchant', blurb: 'Trader/brawler — better shop deals, sturdy melee.' },
] as const;

type StartingClass = (typeof STARTING_CLASSES)[number]['value'];

export default function CharacterCreatePage() {
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<StartingClass | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) {
      setError('Choose a starting class');
      return;
    }
    setError(null);
    setIsCreating(true);

    try {
      await apiFetch('/characters', {
        method: 'POST',
        body: JSON.stringify({ name, class: selectedClass }),
      });
      router.push('/character-select');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 24,
      }}
    >
      <h1>Create Character</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 480 }}>
        {error && <div style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center' }}>{error}</div>}

        <input
          type="text"
          placeholder="Character Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={3}
          maxLength={24}
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid #444',
            background: '#16213e',
            color: '#eee',
            fontSize: 14,
          }}
        />

        <div style={{ fontSize: 13, color: '#aaa', marginTop: 4 }}>Choose your class:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {STARTING_CLASSES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setSelectedClass(c.value)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 6,
                border: selectedClass === c.value ? '2px solid #e94560' : '1px solid #444',
                background: selectedClass === c.value ? 'rgba(233,69,96,0.15)' : '#16213e',
                color: '#eee',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 'bold' }}>{c.label}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{c.blurb}</div>
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={isCreating}
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            border: 'none',
            background: '#e94560',
            color: '#fff',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          {isCreating ? 'Creating...' : 'Create Character'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/character-select')}
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            border: '1px solid #444',
            background: 'transparent',
            color: '#aaa',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      </form>
    </main>
  );
}
