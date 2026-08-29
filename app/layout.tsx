import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { InkBackground } from "@/components/layout/InkBackground";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { Providers } from "@/components/Providers";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SITE } from "@/lib/constants";
import { DISPLAY_PREHYDRATE_SCRIPT } from "@/lib/display";

// 展示字体：仅拉丁字符（标题里的英文/数字），中文回落系统字体栈
const spaceGrotesk = localFont({
  src: "../fonts/space-grotesk-latin.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

const geistMono = localFont({
  src: "../fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.name,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
  },
  alternates: {
    types: { "application/rss+xml": `${SITE.url}/feed.xml` },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning：next-themes 会在客户端往 <html> 写入主题 class
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        {/* 预水合：在 React 挂载前应用显示偏好（字体缩放/密度），避免 FOUC */}
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_PREHYDRATE_SCRIPT }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-xl focus:bg-accent focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-accent-foreground"
        >
          跳到内容
        </a>
        <Providers>
          <InkBackground />
          <SmoothScroll />
          <Header />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
          <ScrollToTop />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
