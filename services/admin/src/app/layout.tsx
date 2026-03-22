// =============================================================================
// GridMind Admin — Root Layout
// =============================================================================

import type { Metadata } from "next";
import "./globals.css";

import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: "%s | GridMind Admin",
    default: "GridMind Admin Console",
  },
  description:
    "GridMind Operator Dashboard — manage tenants, monitor AI agents, handle incidents and approvals.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
