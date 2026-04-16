import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AuthProvider } from "@/contexts/auth-context";
import { RedirectController } from "@/components/redirect-controller";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proposal Management System",
  description: "Manage, send, track, and sign proposals with Firebase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          <AuthProvider>
            <RedirectController>{children}</RedirectController>
          </AuthProvider>
        </body>
    </html>
  );
}
