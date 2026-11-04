import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "코워커마켓",
  description: "동료와 나누고 거래하는 따뜻한 사내 중고마켓",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fffaf3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh">
        <div className="relative mx-auto min-h-dvh w-full max-w-md bg-cream shadow-[0_0_40px_rgba(120,90,50,0.12)]">
          <Suspense fallback={<div className="min-h-dvh" />}>
            <AuthProvider>
              <main className="pb-28">{children}</main>
              <BottomNav />
            </AuthProvider>
          </Suspense>
        </div>
      </body>
    </html>
  );
}
