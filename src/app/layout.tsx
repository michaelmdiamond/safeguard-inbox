import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SafeGuard Inbox — Product Recall Safety Hub for Parents",
    template: "%s — SafeGuard Inbox",
  },
  description:
    "Automatically monitor your purchases for product recalls. Forward receipts, get instant alerts from CPSC, FDA, USDA, and NHTSA.",
  metadataBase: (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL || "https://safeguard-inbox-production.up.railway.app");
    } catch {
      return new URL("https://safeguard-inbox-production.up.railway.app");
    }
  })(),
  openGraph: {
    title: "SafeGuard Inbox — Product Recall Safety Hub for Parents",
    description:
      "Automatically monitor your purchases for product recalls. Forward receipts, get instant alerts from CPSC, FDA, USDA, and NHTSA.",
    type: "website",
    siteName: "SafeGuard Inbox",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeGuard Inbox — Product Recall Safety Hub for Parents",
    description:
      "Automatically monitor your purchases for product recalls. Forward receipts, get instant alerts.",
  },
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
        {children}
      </body>
    </html>
  );
}
