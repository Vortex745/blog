"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, Layers, Bug, PenLine, Github, Mail, Calendar, ArrowRight, Eye, MessageCircle, Rss, Edit2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isAdmin } from '@/lib/permissions';
import { FlipWords } from '@/components/ui/flip-words';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';

interface Post {
    id: number;
    title: string;
    summary: string;
    createdAt: string;
    author: { username: string };
    categories: { category: { name: string } }[];
    type: string;
}

export default function HomePage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, updateProfile } = useAuth();

    // Tagline editing state
    const [isEditingTagline, setIsEditingTagline] = useState(false);
    const [taglineValue, setTaglineValue] = useState('');
    const [isSavingTagline, setIsSavingTagline] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const postsRes = await api.get('/posts');
                setPosts(postsRes.data.data || postsRes.data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSaveTagline = async () => {
        if (!taglineValue.trim()) return;
        setIsSavingTagline(true);
        try {
            // Need to preserve other user fields if the API requires full update? 
            // Our API at /auth/update handles partial updates mostly, but let's check.
            // Looking at route.ts: const { username, avatar, tagline } = body;
            // It expects username. Validation check: if (!username...) return error.
            // Ah, the validation in route.ts requires username to be present!
            // "if (!username || username.trim().length < 2) ..."
            // So we MUST send username.

            if (!user) return;

            const res = await api.put('/auth/update', {
                username: user.username, // Send current username
                tagline: taglineValue
                // avatar is optional in backend? "const { username, avatar, tagline } = body"
                // It updates avatar if passed. undefined is fine? 
                // DB update: username, avatar, tagline.
                // If avatar is undefined in body, Prisma usually ignores unless explicitly set to null.
                // However, let's be safe. But `user.avatar` might be null.
            });
            updateProfile(res.data);
            setIsEditingTagline(false);
        } catch (error) {
            console.error('Failed to update tagline:', error);
        } finally {
            setIsSavingTagline(false);
        }
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'note': return { icon: BookOpen, label: '笔记' };
            case 'project': return { icon: Layers, label: '项目' };
            case 'pitfall': return { icon: Bug, label: '踩坑' };
            default: return { icon: PenLine, label: '随笔' };
        }
    };

    const navItems = [
        { label: '笔记', href: '/notes', icon: BookOpen, desc: '学习记录' },
        { label: '项目', href: '/projects', icon: Layers, desc: '作品展示' },
        { label: '踩坑', href: '/pitfalls', icon: Bug, desc: '避坑指南' },
        { label: '归档', href: '/archive', icon: Calendar, desc: '时间线' },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* 简洁 Hero */}
            <header className="border-b border-border bg-surface">
                <div className="max-w-6xl mx-auto px-6 pt-4 md:pt-6 pb-8">
                    <p className="text-sm text-muted mb-2 font-mono">// Personal Blog</p>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-extrabold text-foreground tracking-tight mb-4">
                        有些梦并不遥远，用代码
                        <FlipWords words={["构建未来", "探索未知", "沉淀思考", "保持热爱"]} className="text-primary" />
                    </h1>
                    <p className="text-muted">记录学习、分享经验、沉淀思考</p>
                </div>
            </header>

            {/* 主内容 */}
            <main className="max-w-6xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* 左侧：文章列表 */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-foreground">最新文章</h2>
                            <Link href="/notes" className="text-sm text-primary hover:underline">
                                查看全部 →
                            </Link>
                        </div>

                        <BentoGrid className="w-full">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <div key={i} className={cn("p-5 bg-surface border border-border rounded-xl animate-pulse min-h-[14rem]", i === 0 || i === 3 ? "md:col-span-2" : "")}>
                                        <div className="h-1/2 w-full bg-border/50 rounded-lg mb-4" />
                                        <div className="h-5 bg-border rounded w-2/3 mb-3" />
                                        <div className="h-4 bg-border rounded w-full" />
                                    </div>
                                ))
                            ) : (
                                posts.slice(0, 4).map((post, i) => {
                                    const config = getTypeConfig(post.type);
                                    return (
                                        <motion.article
                                            key={post.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={i === 0 || i === 3 ? "md:col-span-2" : ""}
                                        >
                                            <Link href={`/post/${post.id}`} className="block h-full cursor-pointer">
                                                <BentoGridItem
                                                    title={post.title}
                                                    description={post.summary || '暂无摘要'}
                                                    icon={<config.icon size={16} className="text-muted group-hover/bento:text-primary transition-colors" />}
                                                    header={
                                                        <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 flex-col items-start justify-start p-4 border border-border/50">
                                                            <div className="flex items-center gap-2 text-xs text-muted font-mono">
                                                                <span className="flex items-center gap-1"><config.icon size={12} />{config.label}</span>
                                                                <span>{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                                                            </div>
                                                        </div>
                                                    }
                                                    className="h-full"
                                                />
                                            </Link>
                                        </motion.article>
                                    );
                                })
                            )}
                        </BentoGrid>
                    </div>

                    {/* 右侧边栏 */}
                    <aside className="space-y-6">

                        {/* 个人卡片 */}
                        <div className="p-6 bg-surface border border-border rounded-xl text-center">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.username || 'User'} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <img src="/logo.png" alt="Logo" className="w-full h-full rounded-full object-cover" />
                                )}
                            </div>
                            <h3 className="font-bold text-foreground mb-1">{user?.username || '未完稿'}</h3>

                            {user ? (
                                <div className="min-h-[28px] mb-4">
                                    {isEditingTagline ? (
                                        <div className="flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-200">
                                            <input
                                                value={taglineValue}
                                                onChange={(e) => setTaglineValue(e.target.value)}
                                                className="w-40 text-sm text-center bg-surface-hover border border-primary/30 rounded px-2 py-1 outline-none focus:border-primary text-foreground"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSaveTagline();
                                                    if (e.key === 'Escape') setIsEditingTagline(false);
                                                }}
                                            />
                                            <button
                                                onClick={handleSaveTagline}
                                                disabled={isSavingTagline}
                                                className="p-1 rounded-full hover:bg-primary/10 text-primary transition-colors"
                                            >
                                                {isSavingTagline ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                                            </button>
                                            <button
                                                onClick={() => setIsEditingTagline(false)}
                                                className="p-1 rounded-full hover:bg-error/10 text-muted hover:text-error transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            className={cn(
                                                "relative inline-block",
                                                isAdmin(user.username) ? "group cursor-pointer" : ""
                                            )}
                                            onClick={() => {
                                                if (isAdmin(user.username)) {
                                                    setTaglineValue(user.tagline || '全栈开发者 / 终身学习者');
                                                    setIsEditingTagline(true);
                                                }
                                            }}
                                        >
                                            <p className="text-sm text-muted group-hover:text-primary transition-colors">
                                                {user.tagline || '全栈开发者 / 终身学习者'}
                                            </p>
                                            {isAdmin(user.username) && (
                                                <div className="absolute -right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Edit2 size={12} className="text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-muted mb-4">全栈开发者 / 终身学习者</p>
                            )}

                            <div className="flex justify-center gap-3">
                                <a href="https://github.com" className="p-2 text-muted hover:text-primary transition-colors">
                                    <Github size={18} />
                                </a>
                                <a href="mailto:example@email.com" className="p-2 text-muted hover:text-primary transition-colors">
                                    <Mail size={18} />
                                </a>
                                <a href="/rss" className="p-2 text-muted hover:text-primary transition-colors">
                                    <Rss size={18} />
                                </a>
                            </div>
                        </div>

                        {/* 快捷导航 */}
                        <div className="p-6 bg-surface border border-border rounded-xl">
                            <h4 className="font-bold text-foreground mb-4">浏览分类</h4>
                            <div className="space-y-2">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={16} className="text-muted group-hover:text-primary transition-colors" />
                                            <span className="text-sm font-medium text-foreground">{item.label}</span>
                                        </div>
                                        <span className="text-xs text-muted-light">{item.desc}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* 统计信息 */}
                        <div className="p-6 bg-surface border border-border rounded-xl">
                            <h4 className="font-bold text-foreground mb-4">站点统计</h4>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-primary">{posts.length}</p>
                                    <p className="text-xs text-muted">文章</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-accent">{posts.filter(p => p.type === 'project').length}</p>
                                    <p className="text-xs text-muted">项目</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}
