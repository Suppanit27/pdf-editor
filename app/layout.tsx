import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PDF Editor',
  description: 'PDF Editor Application',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen flex-col">
          <h5 className="text-base font-medium text-gray-900 text-center text-[18px] py-2">เอกสาร</h5>          
          <div className="flex flex-1 flex-col">
            <div className="min-h-0 flex-1">{children}</div>
          </div>
        </div>
      </body>
    </html>
  )
}
