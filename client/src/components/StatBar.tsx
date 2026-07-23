'use client';

interface StatBarProps {
  label: string;
  text: string;
  pct: number; // 0-1
  color: string;
  width?: number;
}

/** Small labeled progress bar used in the HUD for HP/SP/EXP */
export function StatBar({ label, text, pct, color, width = 160 }: StatBarProps) {
  const clamped = Math.max(0, Math.min(1, pct));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 28, fontSize: 10, color: '#999' }}>{label}</span>
      <div style={{ ...trackStyle, width }}>
        <div style={{ ...fillStyle, width: `${clamped * 100}%`, background: color }} />
        <span style={textStyle}>{text}</span>
      </div>
    </div>
  );
}

const trackStyle: React.CSSProperties = {
  position: 'relative', height: 14, borderRadius: 3,
  background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.15)',
};

const fillStyle: React.CSSProperties = {
  position: 'absolute', top: 0, left: 0, height: '100%',
  transition: 'width 0.2s ease-out',
};

const textStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  fontSize: 9, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)',
};
