import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
    title: "未完稿 · 用文字记录生活",
    description: "一个简洁优雅的个人博客，记录灵感、分享故事。",
    keywords: ["博客", "个人博客", "写作", "未完稿", "blog", "draft"],
    authors: [{ name: "未完稿" }],
    openGraph: {
        title: "未完稿 · 用文字记录生活",
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
        <html lang="zh-CN">
            <body className="font-sans min-h-screen bg-[#FAFAFA] text-[#1a1a1a] antialiased">
                <AuthProvider>
                    <Navbar />
                    <main className="relative pt-16">
                        {children}
                    </main>
                </AuthProvider>
            </body>
        </html>
    );
}
