import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'Smokies Hamburger - Order smart. Eat smart.',
  description: 'Gourmet American Hamburgers ordering service',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-montserrat min-h-screen bg-primary">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}