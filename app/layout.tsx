import type React from "react";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Poppins, Playfair_Display } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "SumSnap - 모든 콘텐츠, 단 10초 요약",
  description:
    "링크, 문서, 영상까지 AI가 핵심만 추출해 드립니다. 시간은 절약하고, 정보는 더 많이. SumSnap으로 효율적인 콘텐츠 소비를 시작하세요.",
  keywords: [
    "AI 요약",
    "콘텐츠 요약",
    "문서 요약",
    "영상 요약",
    "링크 요약",
    "SumSnap",
    "AI 도구",
    "생산성",
    "시간 절약",
  ],
  authors: [{ name: "SumSnap Team" }],
  creator: "SumSnap",
  publisher: "SumSnap",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://sumsnap.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SumSnap - 모든 콘텐츠, 단 10초 요약",
    description:
      "링크, 문서, 영상까지 AI가 핵심만 추출해 드립니다. 시간은 절약하고, 정보는 더 많이.",
    url: "https://sumsnap.com",
    siteName: "SumSnap",
    images: [
      {
        url: "/sumsnap.png",
        width: 1200,
        height: 630,
        alt: "SumSnap - AI 콘텐츠 요약 서비스",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SumSnap - 모든 콘텐츠, 단 10초 요약",
    description:
      "링크, 문서, 영상까지 AI가 핵심만 추출해 드립니다. 시간은 절약하고, 정보는 더 많이.",
    images: ["/sumsnap.png"],
    creator: "@sumsnap",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${poppins.variable} ${playfairDisplay.variable} antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
