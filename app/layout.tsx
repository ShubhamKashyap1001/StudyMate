import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"
import SessionProvider from "@/components/providers/SessionProvider"

export const metadata: Metadata = {
  title: "StudyMate - AI Academic Assistant",
  description:
    "Conversational academic assistant for students, researchers, and teachers. Upload PDFs, ask questions, generate flashcards, and collaborate.",
  generator: "StudyMate",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <SessionProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </SessionProvider>
        <Analytics />
      </body>
    </html>
  )
}
