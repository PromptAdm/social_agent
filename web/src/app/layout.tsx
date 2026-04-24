import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider }   from '@/components/providers/QueryProvider'
import { SessionProvider } from '@/components/providers/SessionProvider'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import { SentryProvider }  from '@/components/providers/SentryProvider'
import { Toaster }         from '@/components/shared/Toaster'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nezora',
  description: 'Plataforma de marketing com inteligência artificial para marcas',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className={inter.className}>
        <SentryProvider>
          <PostHogProvider>
            <QueryProvider>
              <SessionProvider>
                {children}
                <Toaster />
              </SessionProvider>
            </QueryProvider>
          </PostHogProvider>
        </SentryProvider>
      </body>
    </html>
  )
}
