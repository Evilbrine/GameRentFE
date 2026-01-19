import './globals.css'

export const metadata = {
  title: 'Game Random',
  description: 'Random game generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}