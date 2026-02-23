"use client";
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { PenTool, User, LogOut, BookOpen, FolderGit2, Bug, Info, Home, Archive, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { name: '首页', href: '/', icon: Home },
        { name: '笔记', href: '/notes', icon: BookOpen },
        { name: '项目', href: '/projects', icon: FolderGit2 },
        { name: '踩坑', href: '/pitfalls', icon: Bug },
        { name: '归档', href: '/archive', icon: Archive },
        { name: '关于', href: '/about', icon: Info },
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-lg border-b border-border h-14 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

                {/* Logo Area */}
                <Link
                    href="/"
                    className="flex items-center gap-2 font-serif font-bold text-xl text-foreground hover:text-primary transition-colors group"
                >
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="rounded-lg shadow-blue group-hover:scale-110 transition-transform object-cover"
                        priority
                    />
                    <span>未完稿</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                isActive(item.href)
                                    ? "text-primary bg-primary/10"
                                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                            )}
                        >
                            <span className="relative z-10 flex items-center gap-1.5">
                                <item.icon size={15} />
                                {item.name}
                            </span>
                        </Link>
                    ))}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/write"
                        className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary-dark transition-all shadow-blue hover:shadow-blue-lg hover:-translate-y-0.5"
                    >
                        <PenTool size={14} />
                        <span>创作</span>
                    </Link>

                    {user ? (
                        <div className="relative group">
                            <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-white overflow-hidden">
                                    {user.avatar ? (
                                        <Image
                                            src={user.avatar}
                                            alt={user.username}
                                            width={32}
                                            height={32}
                                            className="w-full h-full rounded-full object-cover"
                                            unoptimized
                                        />
                                    ) : (
                                        user.username?.[0]?.toUpperCase()
                                    )}
                                </div>
                                <span className="hidden lg:block text-sm font-semibold text-muted-dark max-w-[100px] truncate">
                                    {user.username}
                                </span>
                            </button>

                            {/* Dropdown */}
                            <div className="absolute right-0 top-full mt-2 w-48 bg-surface rounded-xl border border-border shadow-soft-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                                <Link
                                    href="/profile"
                                    className="block px-4 py-2.5 text-sm text-muted hover:text-primary hover:bg-surface-hover rounded-t-xl transition-colors"
                                >
                                    个人资料
                                </Link>
                                <button
                                    onClick={logout}
                                    className="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-error hover:bg-error/5 rounded-b-xl transition-colors"
                                >
                                    退出登录
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-sm font-medium">
                            <Link href="/login" className="text-muted hover:text-foreground transition-colors">登录</Link>
                            <span className="text-border">|</span>
                            <Link href="/register" className="text-primary hover:text-primary-dark transition-colors">注册</Link>
                        </div>
                    )}

                    {/* Mobile Toggle */}
                    <button
                        className="md:hidden p-2 text-muted hover:text-foreground"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu — CSS transition to avoid framer-motion in critical path */}
            <div
                className={cn(
                    "md:hidden border-t border-border bg-surface overflow-hidden transition-all duration-300 ease-in-out",
                    mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <div className="px-4 py-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                                isActive(item.href)
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "text-muted hover:bg-surface-hover"
                            )}
                        >
                            <item.icon size={18} />
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>
        </header>
    );
}
