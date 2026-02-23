"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { Calendar, ChevronRight, ChevronDown, Archive, FileText, FolderGit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TracingBeam } from '@/components/ui/tracing-beam';

type ArchiveItem = {
    id: number;
    title: string;
    createdAt: string;
    type: 'post' | 'project';
};

type MonthGroup = {
    month: string;
    monthNum: number;
    items: ArchiveItem[];
};

type YearGroup = {
    year: string;
    months: MonthGroup[];
    totalItems: number;
};

export default function ArchivePage() {
    const [archives, setArchives] = useState<YearGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchArchives() {
            try {
                const [postsRes, projectsRes] = await Promise.all([
                    api.get('/posts'),
                    api.get('/projects')
                ]);

                const posts = (postsRes.data.data || []).map((p: any) => ({ ...p, type: 'post' as const }));
                const projects = (projectsRes.data.data || []).map((p: any) => ({ ...p, type: 'project' as const }));

                const allItems: ArchiveItem[] = [...posts, ...projects];

                // 按年 -> 月分组
                const grouped: Record<string, Record<string, ArchiveItem[]>> = {};

                allItems.forEach((item) => {
                    const date = new Date(item.createdAt);
                    if (isNaN(date.getTime())) return;
                    const year = date.getFullYear().toString();
                    const month = (date.getMonth() + 1).toString();

                    if (!grouped[year]) grouped[year] = {};
                    if (!grouped[year][month]) grouped[year][month] = [];
                    grouped[year][month].push(item);
                });

                // 转换为数组结构并排序
                const result: YearGroup[] = Object.keys(grouped)
                    .sort((a, b) => parseInt(b) - parseInt(a))
                    .map(year => {
                        const months = Object.keys(grouped[year])
                            .sort((a, b) => parseInt(b) - parseInt(a))
                            .map(month => ({
                                month: `${month}月`,
                                monthNum: parseInt(month),
                                items: grouped[year][month].sort(
                                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                )
                            }));

                        return {
                            year,
                            months,
                            totalItems: months.reduce((sum, m) => sum + m.items.length, 0)
                        };
                    });

                setArchives(result);
                // 默认展开最近的年份
                if (result.length > 0) {
                    setExpandedYears(new Set([result[0].year]));
                }
            } catch (error) {
                console.error('Failed to fetch archives', error);
            } finally {
                setLoading(false);
            }
        }
        fetchArchives();
    }, []);

    const toggleYear = (year: string) => {
        setExpandedYears(prev => {
            const next = new Set(prev);
            if (next.has(year)) {
                next.delete(year);
            } else {
                next.add(year);
            }
            return next;
        });
    };

    const totalItems = archives.reduce((sum, y) => sum + y.totalItems, 0);

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary pb-20">
            <TracingBeam className="pt-4 md:pt-6">
                <main className="pt-0 pb-8 px-6 max-w-3xl mx-auto relative z-10">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary rounded-full text-sm font-bold mb-6 shadow-soft">
                            <Archive size={16} />
                            <span>时间轴</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-3">时光机</h1>
                        <p className="text-muted">记录思考与创造，共 <span className="text-primary font-bold">{totalItems}</span> 条内容</p>
                    </motion.div>

                    {loading ? (
                        <div className="space-y-8">
                            {[1, 2].map((i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="h-12 bg-surface-hover rounded-xl mb-4"></div>
                                    <div className="space-y-3 pl-6">
                                        {[1, 2, 3].map((j) => (
                                            <div key={j} className="h-14 bg-surface rounded-xl"></div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {archives.map((yearGroup, yearIndex) => (
                                <motion.div
                                    key={yearGroup.year}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: yearIndex * 0.1 }}
                                    className="bg-surface border border-border rounded-2xl overflow-hidden"
                                >
                                    {/* Year Header - Clickable */}
                                    <button
                                        onClick={() => toggleYear(yearGroup.year)}
                                        className="w-full flex items-center justify-between p-5 hover:bg-surface-hover transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <Calendar size={18} className="text-primary" />
                                            </div>
                                            <div className="text-left">
                                                <h2 className="text-2xl font-serif font-bold text-foreground">
                                                    {yearGroup.year}年
                                                </h2>
                                                <p className="text-sm text-muted">
                                                    {yearGroup.months.length} 个月 · {yearGroup.totalItems} 条内容
                                                </p>
                                            </div>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: expandedYears.has(yearGroup.year) ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-muted"
                                        >
                                            <ChevronDown size={18} />
                                        </motion.div>
                                    </button>

                                    {/* Months Accordion */}
                                    <AnimatePresence>
                                        {expandedYears.has(yearGroup.year) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-5 pb-5 space-y-4">
                                                    {yearGroup.months.map((monthGroup) => (
                                                        <div key={monthGroup.month} className="border-l-2 border-border pl-5">
                                                            {/* Month Label */}
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className="text-sm font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
                                                                    {monthGroup.month}
                                                                </span>
                                                                <span className="text-xs text-muted">
                                                                    {monthGroup.items.length} 条
                                                                </span>
                                                            </div>

                                                            {/* Items in Month */}
                                                            <div className="space-y-2">
                                                                {monthGroup.items.map((item) => (
                                                                    <Link
                                                                        href={item.type === 'project' ? `/projects/${item.id}` : `/post/${item.id}`}
                                                                        key={`${item.type}-${item.id}`}
                                                                    >
                                                                        <div className="group flex items-center justify-between p-3 rounded-xl hover:bg-surface-hover transition-colors">
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                {item.type === 'project' ? (
                                                                                    <FolderGit2 size={14} className="text-accent shrink-0" />
                                                                                ) : (
                                                                                    <FileText size={14} className="text-muted shrink-0" />
                                                                                )}
                                                                                <span className="text-foreground font-medium truncate group-hover:text-primary transition-colors">
                                                                                    {item.title}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 shrink-0">
                                                                                <span className="text-xs text-muted">
                                                                                    {new Date(item.createdAt).getDate()}日
                                                                                </span>
                                                                                <ChevronRight size={14} className="text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                                                            </div>
                                                                        </div>
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </main>
            </TracingBeam>
        </div>
    );
}
