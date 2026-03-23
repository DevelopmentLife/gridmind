import type { Metadata } from "next";
import "./globals.css";
import { GodModeWarningBanner } from "@/components/GodModeWarningBanner";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: "%s | GridMind SuperAdmin",
    default: "Platform Dashboard | GridMind SuperAdmin",
  },
  description:
    "GridMind platform administration — elevated privileges, all tenant management",
  robots: {
    index: false,
    follow: false,
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const environment =
    process.env["NEXT_PUBLIC_ENVIRONMENT"] ?? "development";
  const version = process.env["NEXT_PUBLIC_APP_VERSION"] ?? "0.1.0";

  return (
    <html lang="en" className="dark">
      <body className="bg-brand-midnight text-brand-text-primary antialiased">
        {/* God-mode warning — always visible, every page */}
        <div className="sticky top-0 z-50">
          <GodModeWarningBanner
            environment={environment}
            version={version}
          />
        </div>

        {/* App layout: sidebar + main content */}
        <div className="flex min-h-screen">
          <Sidebar />

          <main
            className="flex-1 flex flex-col min-w-0 overflow-auto"
            id="main-content"
          >
            <Providers>{children}</Providers>
          </main>
        </div>
      </body>
    </html>
  );
}
