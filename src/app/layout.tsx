import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import Script from 'next/script'
import Footer from '@/components/Footer'
import CookieBanner from '@/components/CookieBanner'
import BetaBanner from '@/components/BetaBanner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#0c1b33',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: 'Soar by LifeLaunchr',
    template: '%s | Soar',
  },
  description:
    'Built by a counselor. Powered by AI. The college planning advisor that knows your student, remembers everything, and gets smarter over time.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://lifelaunchr-next.vercel.app'),
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL ?? 'https://lifelaunchr-next.vercel.app',
  },
  keywords: [
    'college planning',
    'college counseling',
    'AI college advisor',
    'college admissions',
    'LifeLaunchr',
    'Soar',
  ],
  openGraph: {
    title: 'Soar by LifeLaunchr',
    description:
      'Built by a counselor. Powered by AI. The college planning advisor that knows your student, remembers everything, and gets smarter over time.',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://lifelaunchr-next.vercel.app',
    siteName: 'Soar by LifeLaunchr',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Soar by LifeLaunchr',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soar by LifeLaunchr',
    description:
      'Built by a counselor. Powered by AI. The college planning advisor that knows your student, remembers everything, and gets smarter over time.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16' },
      { url: '/favicon-32.png', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Soar',
  },
  robots: {
    index: true,
    follow: true,
  },
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider afterSignOutUrl="/chat">
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <BetaBanner />
          {children}
          <Footer />
          <CookieBanner />

          {GA_ID && (
            <>
              <Script
                id="ga"
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              />
              <Script
                id="ga-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                    gtag('config', '${GA_ID}');
                  `,
                }}
              />
            </>
          )}

          {FB_PIXEL_ID && (
            <Script
              id="fb-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${FB_PIXEL_ID}');
                  fbq('track', 'PageView');
                `,
              }}
            />
          )}
        </body>
      </html>
    </ClerkProvider>
  )
}
