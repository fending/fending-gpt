import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

// Initialize background jobs on server startup
if (typeof window === 'undefined') {
  import('@/lib/background/init')
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brian's AI Assistant",
  description: "Get instant answers about Brian Fending's background, experience, and skills. Perfect for recruiters and potential collaborators.",
  keywords: "Brian Fending, AI assistant, recruiter, software engineer, technical leadership",
  authors: [{ name: "Brian Fending" }],
  icons: {
    icon: '/favicon/favicon.ico',
    shortcut: '/favicon/favicon.ico',
    apple: '/favicon/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        url: '/favicon/favicon-16x16.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        url: '/favicon/favicon-32x32.png',
      },
    ],
  },
  manifest: '/favicon/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
