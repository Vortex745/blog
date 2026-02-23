import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { Inter, Noto_Serif_SC, JetBrains_Mono } from "next/font/google";

// next/font: self-hosted, no render-blocking @import, automatic subsetting
const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-inter",
});

const notoSerifSC = Noto_Serif_SC({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
    variable: "--font-noto-serif",
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["400", "500"],
    display: "swap",
    variable: "--font-jetbrains",
});

export const metadata: Metadata = {
    title: "未完稿",
    description: "一个简洁优雅的个人博客，记录灵感、分享故事。",
    keywords: ["博客", "个人博客", "写作", "未完稿", "blog", "draft"],
    authors: [{ name: "未完稿" }],
    openGraph: {
        title: "未完稿",
        description: "一个简洁优雅的个人博客，记录灵感、分享故事。",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN" className={`${inter.variable} ${notoSerifSC.variable} ${jetbrainsMono.variable}`}>
            <head>
                {/* Preconnect to Neon DB for faster API responses */}
                <link rel="preconnect" href="https://ep-sweet-dawn-a11b4pi6-pooler.ap-southeast-1.aws.neon.tech" />
                <link rel="dns-prefetch" href="https://ep-sweet-dawn-a11b4pi6-pooler.ap-southeast-1.aws.neon.tech" />
            </head>
            <body className="font-sans min-h-screen antialiased bg-background text-foreground">
                <AuthProvider>
                    <Navbar />
                    <main className="relative pt-14">
                        {children}
                    </main>
                </AuthProvider>
            </body>
        </html>
    );
}
