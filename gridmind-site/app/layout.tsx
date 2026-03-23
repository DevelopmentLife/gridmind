import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "GridMind — AI-Native Database Operations",
  description:
    "24 autonomous AI agents that monitor, optimize, scale, heal, and secure your database deployments. Replace expensive manual DBA work with always-on intelligence.",
  openGraph: {
    title: "GridMind — AI-Native Database Operations",
    description:
      "24 AI Agents. Zero DBAs. Your databases, fully autonomous.",
    siteName: "GridMind",
    type: "website",
    url: "https://gridmindai.dev",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GridMind — AI-Native Database Operations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GridMind — AI-Native Database Operations",
    description:
      "24 AI Agents. Zero DBAs. Your databases, fully autonomous.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-white antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
