"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axios';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ArrowRight, Calendar, HelpCircle, Lightbulb, Wrench, Search, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface Post {
    id: number;
    title: string;
    summary: string;
    content: string;
    createdAt: string;
    author: {
        username: string;
    };
    categories: {
        category: {
            name: string;
        };
    }[];
}

// 从Markdown内容中提取结构化信息
function extractPitfallStructure(content: string) {
    const sections = {
        problem: '',
        cause: '',
        solution: '',
        summary: ''
    };

    const problemMatch = content.match(/##\s*😱?\s*问题描述[\s\S]*?(?=##|$)/i);
    const causeMatch = content.match(/##\s*🧐?\s*原因分析[\s\S]*?(?=##|$)/i);
    const solutionMatch = content.match(/##\s*🛠️?\s*解决方案[\s\S]*?(?=##|$)/i);
    const summaryMatch = content.match(/##\s*💡?\s*避坑指南[\s\S]*?(?=##|$)/i);

    if (problemMatch) sections.problem = problemMatch[0].replace(/##\s*😱?\s*问题描述/i, '').trim().slice(0, 100);
    if (causeMatch) sections.cause = causeMatch[0].replace(/##\s*🧐?\s*原因分析/i, '').trim().slice(0, 80);
    if (solutionMatch) sections.solution = solutionMatch[0].replace(/##\s*🛠️?\s*解决方案/i, '').trim().slice(0, 80);
    if (summaryMatch) sections.summary = summaryMatch[0].replace(/##\s*💡?\s*避坑指南/i, '').trim().slice(0, 80);

    return sections;
}

export default function PitfallsPage() {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPitfalls = async () => {
            try {
                const res = await api.get('/posts?type=pitfall');
                const allPosts = res.data.data || res.data;
                const filtered = Array.isArray(allPosts) ? allPosts.filter((p: any) => p.type === 'pitfall') : [];
                setPosts(filtered);
            } catch (error) {
                console.error("Failed to fetch pitfalls:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPitfalls();
    }, []);

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background relative selection:bg-warning/20 selection:text-warning pb-20">
            {/* Header */}
            <header className="relative z-10 pt-4 md:pt-6 pb-6 px-6 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-warning/10 to-warning/5 border border-warning/20 text-warning rounded-full text-sm font-bold mb-6 shadow-soft">
                        <AlertTriangle size={16} />
                        <span>踩坑总结</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-3">
                        故障 <span className="text-warning">档案</span>
                    </h1>
                    <p className="text-muted max-w-2xl">
                        记录开发路上的那些坑。有模板的技术总结文章，包含问题描述、原因分析、解决方案和避坑指南。
                    </p>
                </motion.div>

                {/* Search */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative"
                >
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        placeholder="搜索踩坑记录..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-warning/20 focus:border-warning transition-all"
                    />
                </motion.div>
            </header>

            {/* List */}
            <main className="relative z-10 px-6 max-w-4xl mx-auto">
                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse bg-surface border border-border rounded-2xl p-6">
                                <div className="h-6 w-3/4 bg-surface-hover rounded mb-4"></div>
                                <div className="space-y-2">
                                    <div className="h-4 w-full bg-surface-hover rounded"></div>
                                    <div className="h-4 w-2/3 bg-surface-hover rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredPosts.length > 0 ? (
                    <div className="space-y-6">
                        {filteredPosts.map((post, idx) => {
                            const structure = extractPitfallStructure(post.content);

                            return (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                                >
                                    <Link href={`/post/${post.id}`}>
                                        <article className="group bg-surface border border-border rounded-2xl p-6 hover:border-warning/40 hover:shadow-lg transition-all duration-300">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-4 mb-5">
                                                <div className="flex-1 min-w-0">
                                                    <h2 className="text-xl font-bold text-foreground group-hover:text-warning transition-colors mb-2 line-clamp-2">
                                                        {post.title}
                                                    </h2>
                                                    <div className="flex items-center gap-3 text-sm text-muted">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                                                        </span>
                                                        {post.categories.map((c, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-surface-hover text-xs rounded">
                                                                {c.category.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 px-3 py-1.5 rounded-full">
                                                        <CheckCircle2 size={12} />
                                                        已解决
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Structure Preview */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                                                {structure.problem && (
                                                    <div className="flex items-start gap-2 p-3 bg-error/5 border border-error/10 rounded-xl">
                                                        <HelpCircle size={14} className="text-error shrink-0 mt-0.5" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-error mb-1">问题</p>
                                                            <p className="text-xs text-muted line-clamp-2">{structure.problem.replace(/```[\s\S]*?```/g, '').replace(/[`#*]/g, '').trim()}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {structure.solution && (
                                                    <div className="flex items-start gap-2 p-3 bg-success/5 border border-success/10 rounded-xl">
                                                        <Wrench size={14} className="text-success shrink-0 mt-0.5" />
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-bold text-success mb-1">解决方案</p>
                                                            <p className="text-xs text-muted line-clamp-2">{structure.solution.replace(/```[\s\S]*?```/g, '').replace(/[`#*]/g, '').trim()}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Summary if exists */}
                                            {post.summary && (
                                                <p className="text-sm text-muted line-clamp-2 mb-4">
                                                    {post.summary}
                                                </p>
                                            )}

                                            {/* Footer */}
                                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                                {structure.summary && (
                                                    <div className="flex items-center gap-2 text-xs text-muted">
                                                        <Lightbulb size={12} className="text-warning" />
                                                        <span className="line-clamp-1">{structure.summary.replace(/[`#*]/g, '').slice(0, 40)}...</span>
                                                    </div>
                                                )}
                                                <span className="flex items-center gap-1 text-sm font-bold text-foreground group-hover:text-warning transition-colors ml-auto">
                                                    查看详情 <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                                </span>
                                            </div>
                                        </article>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-surface border border-dashed border-border rounded-2xl">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-foreground mb-2">
                            {searchTerm ? '未找到相关记录' : '暂无踩坑记录'}
                        </h3>
                        <p className="text-muted">
                            {searchTerm ? '试试其他关键词' : '目前的开发之路畅通无阻，或者...Bug还没被发现。'}
                        </p>
                    </div>
                )}
            </main>
            <div className="fixed bottom-10 right-10 z-[999]">
                <Link
                    href="/write?type=pitfall"
                    className="flex items-center gap-2 px-6 py-3 bg-warning text-white rounded-full shadow-warm-lg hover:scale-105 hover:bg-warning-dark transition-all duration-200 font-bold"
                >
                    <Plus size={18} />
                    <span>记录新坑</span>
                </Link>
            </div>
        </div>
    );
}
