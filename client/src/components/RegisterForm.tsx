'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(email, username, password);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
      <h2 style={{ margin: 0, textAlign: 'center' }}>Register</h2>

      {error && <div style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center' }}>{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        minLength={3}
        maxLength={20}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Password (min 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={8}
        style={inputStyle}
      />
      <button type="submit" disabled={isLoading} style={buttonStyle}>
        {isLoading ? 'Creating account...' : 'Register'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 14, margin: 0 }}>
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} style={linkStyle}>
          Login
        </button>
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 6,
  border: '1px solid #444',
  background: '#16213e',
  color: '#eee',
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 6,
  border: 'none',
  background: '#e94560',
  color: '#fff',
  fontSize: 14,
  fontWeight: 'bold',
  cursor: 'pointer',
};

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#e94560',
  cursor: 'pointer',
  textDecoration: 'underline',
  fontSize: 14,
};
