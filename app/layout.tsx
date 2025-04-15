import type React from "react"
import "@/app/globals.css"
import { Toaster } from "@/components/ui/toaster"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Personal Finance Tracker",
  description: "Track your personal finances with expense categories and visualizations",
  manifest: "/manifest.json",
  themeColor: "#6E56CF",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Finance Tracker",
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <script src="/sw-register.js" defer />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}


import './globals.css'