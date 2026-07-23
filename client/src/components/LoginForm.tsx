'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
      <h2 style={{ margin: 0, textAlign: 'center' }}>Login</h2>

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
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        style={inputStyle}
      />
      <button type="submit" disabled={isLoading} style={buttonStyle}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 14, margin: 0 }}>
        Don&apos;t have an account?{' '}
        <button type="button" onClick={onSwitch} style={linkStyle}>
          Register
        </button>
      </p>

      {process.env.NODE_ENV !== 'production' && (
        <button
          type="button"
          disabled={isLoading}
          onClick={() => login('test@test.com', 'test1234')}
          style={quickLoginStyle}
        >
          Quick Login (dev)
        </button>
      )}
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

const quickLoginStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 6,
  border: '1px dashed #666',
  background: 'transparent',
  color: '#aaa',
  fontSize: 13,
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
