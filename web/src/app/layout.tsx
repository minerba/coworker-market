import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthProvider from "@/components/AuthProvider";
import ConsentGate from "@/components/ConsentGate";
import NotificationProvider from "@/components/NotificationProvider";
import NativeShell from "@/components/NativeShell";
import PwaRegister from "@/components/PwaRegister";
import SwrProvider from "@/components/SwrProvider";

export const metadata: Metadata = {
  title: "우리끼리 중고마켓",
  description: "동료와 나누고 거래하는 따뜻한 사내 중고마켓",
  applicationName: "우리끼리 중고마켓",
  appleWebApp: { capable: true, title: "우리끼리", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffaf3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh">
        <div className="relative mx-auto min-h-dvh w-full max-w-md bg-cream shadow-[0_0_40px_rgba(120,90,50,0.12)]">
          <Suspense fallback={<div className="min-h-dvh" />}>
            <SwrProvider>
              <AuthProvider>
                <NotificationProvider>
                  <ConsentGate>
                    <main className="pb-28">{children}</main>
                    <BottomNav />
                  </ConsentGate>
                </NotificationProvider>
              </AuthProvider>
            </SwrProvider>
          </Suspense>
        </div>
        <PwaRegister />
        <NativeShell />
      </body>
    </html>
  );
}
