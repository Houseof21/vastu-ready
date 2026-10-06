import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/full-italic.css";
import { brand } from "@/config/brand";
import { UserStateProvider } from "@/components/providers/user-state";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description: brand.oneLiner,
  applicationName: brand.name,
  openGraph: {
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.oneLiner,
    url: appUrl,
    siteName: brand.name,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#1f4a39",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <UserStateProvider>{children}</UserStateProvider>
      </body>
    </html>
  );
}
