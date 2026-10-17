import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "@fontsource/dm-serif-display/400.css";
import "@fontsource/dm-serif-display/400-italic.css";
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = { title: { default: "School Platform", template: "%s · School Platform" }, description: "School management for D.A.S Public School and St Mary's High School." };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#173B75" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-school="das">
      <body className="min-h-dvh">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
