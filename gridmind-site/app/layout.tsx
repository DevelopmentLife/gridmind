import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "GridMind — Agentic Infrastructure Platform",
  description:
    "Deploy, scale, and observe AI agent teams from a single config. GridMind is the infrastructure platform for AI-first startups.",
  openGraph: {
    title: "GridMind — Agentic Infrastructure Platform",
    description:
      "Deploy, scale, and observe AI agent teams from a single config. GridMind is the infrastructure platform for AI-first startups.",
    siteName: "GridMind",
    type: "website",
    url: "https://gridmindai.dev",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GridMind — Agentic Infrastructure Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GridMind — Agentic Infrastructure Platform",
    description:
      "Deploy, scale, and observe AI agent teams from a single config. GridMind is the infrastructure platform for AI-first startups.",
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
