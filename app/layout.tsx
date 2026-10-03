import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yogalaurent CRM",
  description: "CRM for Yogalaurent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body className="min-h-full">
          <Nav />
          <div className="md:ml-[240px] pb-20 md:pb-0 min-h-screen">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-6">
              {children}
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
