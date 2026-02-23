"use client";
import Link from 'next/link';
import { Github, Twitter, Mail, Heart, ArrowUp } from 'lucide-react';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    const links = [
        { name: '首页', href: '/' },
        { name: '笔记', href: '/notes' },
        { name: '项目', href: '/projects' },
        { name: '踩坑', href: '/pitfalls' },
        { name: '归档', href: '/archive' },
        { name: '关于', href: '/about' },
    ];

    const socialLinks = [
        { icon: Github, href: '#', label: 'GitHub' },
        { icon: Twitter, href: '#', label: 'Twitter' },
        { icon: Mail, href: 'mailto:hello@example.com', label: '邮箱' },
    ];

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="relative bg-surface border-t border-border">
            {/* 噪点纹理装饰 */}
            <div className="absolute inset-0 bg-noise pointer-events-none" />

            <div className="relative container-blog py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
                    {/* 品牌区域 */}
                    <div className="md:col-span-1">
                        <Link href="/" className="inline-flex items-center gap-2.5 mb-5 group">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl shadow-warm group-hover:shadow-warm-lg transition-all object-cover" />
                            <span className="text-2xl font-serif font-bold text-foreground">
                                未完<span className="text-primary">稿</span>
                            </span>
                        </Link>
                        <p className="text-muted text-sm leading-relaxed max-w-xs">
                            用代码构建未来。
                            这是属于你的温暖角落。
                        </p>
                    </div>

                    {/* 快速链接 */}
                    <div className="md:col-span-1">
                        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-5">
                            快速导航
                        </h4>
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {links.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-muted hover:text-primary text-sm transition-colors inline-block py-1"
                                    >
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 社交链接 */}
                    <div className="md:col-span-1">
                        <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-5">
                            关注我
                        </h4>
                        <div className="flex gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-11 h-11 rounded-xl bg-background hover:bg-primary hover:text-white flex items-center justify-center text-muted transition-all duration-200 cursor-pointer border border-border hover:border-primary hover:shadow-warm"
                                    aria-label={social.label}
                                >
                                    <social.icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 分隔线和版权 */}
                <div className="mt-12 pt-8 border-t border-border">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-muted text-sm flex items-center gap-1.5">
                            © {currentYear} 未完稿 · 用
                            <Heart size={12} className="text-primary fill-primary animate-pulse-warm" />
                            构建
                        </p>
                        <div className="flex items-center gap-4">
                            <p className="text-muted-light text-xs">
                                Powered by Next.js & Aceternity UI
                            </p>
                            <button
                                onClick={scrollToTop}
                                className="w-9 h-9 rounded-xl bg-background border border-border hover:border-primary hover:text-primary flex items-center justify-center text-muted transition-all cursor-pointer hover:shadow-soft"
                                aria-label="返回顶部"
                            >
                                <ArrowUp size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
