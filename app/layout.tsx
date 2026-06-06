import type { Metadata } from 'next';
import '@fontsource/noto-serif-tc';
import '@fontsource/ibm-plex-mono';
import '@fontsource/noto-sans-tc';
import './globals.css';
import { ToastProvider } from '../components/ui/Toast';

export const metadata: Metadata = {
  title: '路名記憶 | Streetlight',
  description: '記憶並點亮台灣城市街道的遊戲',
  openGraph: {
    title: '路名記憶 | Streetlight',
    description: '記憶並點亮台灣城市街道的遊戲',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className="h-full antialiased font-sans">
      <body className="min-h-full h-full flex flex-col bg-bg text-text-primary overflow-x-hidden font-sans pt-0 m-0">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
