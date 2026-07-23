'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import CharacterCard from '@/components/CharacterCard';
import type { CharacterSummary } from '@ro-game/shared';
import { MAX_CHARACTERS } from '@ro-game/shared';

export default function CharacterSelectPage() {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, loadFromStorage, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!isAuthenticated && !loading) {
      router.push('/');
      return;
    }

    apiFetch<CharacterSummary[]>('/characters')
      .then(setCharacters)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, loading, router]);

  const handleSelect = (id: string) => {
    router.push(`/game?characterId=${id}`);
  };

  if (loading) {
    return (
      <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: 24,
      }}
    >
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 16px',
          borderRadius: 6,
          border: '1px solid #444',
          background: 'transparent',
          color: '#aaa',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        Logout
      </button>

      <h1>Select Character</h1>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {characters.map((char) => (
          <CharacterCard key={char.id} character={char} onSelect={handleSelect} />
        ))}
      </div>

      {characters.length < MAX_CHARACTERS && (
        <button
          onClick={() => router.push('/character-create')}
          style={{
            padding: '12px 24px',
            borderRadius: 6,
            border: '1px dashed #666',
            background: 'transparent',
            color: '#aaa',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          + Create New Character
        </button>
      )}
    </main>
  );
}
