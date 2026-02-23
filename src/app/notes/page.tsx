"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { HoverEffect } from '@/components/ui/card-hover-effect';
import { BookOpen, Calendar, Sparkles, ArrowRight, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Note {
    id: number;
    title: string;
    summary: string;
    createdAt: string;
    type: string;
}

export default function NotesPage() {
    const { user } = useAuth();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const res = await api.get('/posts?type=note');
                const allPosts = res.data.data || res.data;
                const filteredNotes = Array.isArray(allPosts)
                    ? allPosts.filter((p: any) => p.type === 'note' || !p.type)
                    : [];
                setNotes(filteredNotes);
            } catch (error) {
                console.error("Failed to fetch notes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchNotes();
    }, []);

    const noteItems = notes.map(note => ({
        title: note.title,
        description: note.summary || "暂无简介...",
        link: `/post/${note.id}`,
        icon: <BookOpen size={24} className="text-primary" />,
        meta: (
            <div className="flex items-center justify-between text-xs text-muted font-bold">
                <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(note.createdAt).toLocaleDateString('zh-CN')}
                </span>
                <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
                    阅读更多
                    <ArrowRight size={12} />
                </span>
            </div>
        )
    }));

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
            {/* 噪点纹理背景 */}
            <div className="fixed inset-0 bg-noise pointer-events-none z-0" />

            {/* 装饰光斑 */}
            <div className="fixed top-20 left-0 w-[400px] h-[300px] bg-primary/8 blur-[100px] rounded-full pointer-events-none z-0" />

            <main className="relative z-10 max-w-6xl mx-auto px-6 pt-4 md:pt-6 pb-20">
                <div className="max-w-3xl mb-14">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary rounded-full text-sm font-bold mb-6 shadow-soft"
                    >
                        <Sparkles size={16} />
                        <span>碎片思考</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6"
                    >
                        笔记 & <span className="gradient-text">随想</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted max-w-2xl leading-relaxed"
                    >
                        这里记录了学习过程中的点滴思考、阅读摘录以及一些不成熟的想法。
                        就像是一个数字花园，通过写作来整理思维。
                    </motion.p>
                </div>

                <div className="min-h-[50vh]">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-10">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-64 bg-surface rounded-2xl border border-border p-6 flex flex-col justify-between animate-pulse">
                                    <div className="space-y-4">
                                        <div className="w-8 h-8 bg-border rounded-xl"></div>
                                        <div className="h-6 bg-border rounded w-3/4"></div>
                                        <div className="space-y-2">
                                            <div className="h-4 bg-border rounded w-full"></div>
                                            <div className="h-4 bg-border rounded w-5/6"></div>
                                        </div>
                                    </div>
                                    <div className="h-4 bg-border rounded w-1/3"></div>
                                </div>
                            ))}
                        </div>
                    ) : noteItems.length > 0 ? (
                        <HoverEffect items={noteItems} />
                    ) : (
                        <div className="text-center py-32 bg-surface rounded-3xl border border-dashed border-border">
                            <BookOpen size={48} className="mx-auto text-muted-light mb-4" />
                            <h3 className="text-xl font-serif font-bold text-foreground mb-2">暂无笔记</h3>
                            <p className="text-muted">博主正在整理思绪，敬请期待...</p>
                        </div>
                    )}
                </div>
            </main>

            <div className="fixed bottom-10 right-10 z-[999]">
                <Link
                    href="/write?type=note"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full shadow-warm-lg hover:scale-105 hover:bg-primary-dark transition-all duration-200 font-bold"
                >
                    <Plus size={18} />
                    <span>发布笔记</span>
                </Link>
            </div>
        </div>
    );
}
