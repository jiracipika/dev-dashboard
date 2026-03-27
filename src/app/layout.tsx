import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dev Dashboard',
  description: 'Private coding progress dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
