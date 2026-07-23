'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import RegisterForm from '@/components/RegisterForm';
import { useAuthStore } from '@/stores/authStore';

export default function LandingPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated, loadFromStorage } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/character-select');
    }
  }, [isAuthenticated, router]);

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
      <h1 style={{ fontSize: 48, margin: 0 }}>RO Game</h1>
      <p style={{ color: '#aaa', margin: 0 }}>Ragnarok Online-Style Web MMO</p>

      {isLogin ? (
        <LoginForm onSwitch={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onSwitch={() => setIsLogin(true)} />
      )}
    </main>
  );
}
