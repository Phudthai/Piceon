import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RO Game',
  description: 'Ragnarok Online-Style Web MMO',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#1a1a2e', color: '#eee', fontFamily: 'sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
