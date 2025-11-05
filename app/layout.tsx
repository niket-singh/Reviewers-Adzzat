import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AdzzatXperts - Task Submission Platform',
  description: 'Scalable platform for task submission and review',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
