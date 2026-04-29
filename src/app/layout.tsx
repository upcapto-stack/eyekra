import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#fe5001',
};

export const metadata: Metadata = {
  title: 'eyekra – Eyewear made for your eyes',
  description: 'Try frames at home, book eye tests, find your perfect fit.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png' }],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'eyekra' },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sourceSans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=typeof localStorage!=='undefined'&&localStorage.getItem('eyekra-settings');var t=s?JSON.parse(s).theme:null;var r=document.documentElement;if(t==='dark')r.classList.add('dark');else if(t==='light')r.classList.remove('dark');else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)r.classList.add('dark');else r.classList.remove('dark');})();`,
          }}
        />
      </head>
      <body className="antialiased min-h-screen font-sans" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
