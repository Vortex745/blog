"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { CardBody, CardContainer, CardItem } from '@/components/ui/3d-card';
import Link from 'next/link';
import { Github, Globe, Pin, FolderGit2, Plus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Project {
    id: number;
    title: string;
    description: string;
    techStack: string;
    repoUrl?: string;
    demoUrl?: string;
    isPinned: boolean;
    author: {
        username: string;
    };
    cover?: string;
}

export default function ProjectsPage() {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await api.get('/projects');
                setProjects(res.data.data);
            } catch (error) {
                console.error("Failed to fetch projects:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    // 焦糖色调渐变背景
    const gradients = [
        "bg-gradient-to-br from-primary/20 to-accent/30 text-primary",
        "bg-gradient-to-br from-accent/20 to-primary/10 text-accent-alt",
        "bg-gradient-to-br from-warning/20 to-accent/20 text-warning",
        "bg-gradient-to-br from-success/20 to-primary/10 text-success",
    ];

    const getGradient = (id: number) => gradients[id % gradients.length];

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
            {/* 噪点纹理背景 */}
            <div className="fixed inset-0 bg-noise pointer-events-none z-0" />

            {/* 装饰光斑 */}
            <div className="fixed top-40 right-0 w-[500px] h-[400px] bg-accent/10 blur-[100px] rounded-full pointer-events-none z-0" />

            <main className="relative z-10 max-w-6xl mx-auto px-6 pt-36 pb-20">
                <header className="max-w-4xl mb-14">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border text-accent-alt rounded-full text-xs font-bold mb-6 shadow-soft"
                    >
                        <FolderGit2 size={12} />
                        <span>项目展示</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 tracking-tight"
                    >
                        构建 <span className="gradient-text">未来</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-muted max-w-xl leading-relaxed"
                    >
                        这里展示了一些个人项目、开源贡献和实验性作品。
                        每一个项目都是一次对未知的探索。
                    </motion.p>
                </header>

                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-[26rem] bg-surface rounded-2xl border border-border animate-pulse"></div>
                            ))}
                        </div>
                    ) : projects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {projects.map((project) => (
                                <CardContainer key={project.id} className="inter-var w-full h-full">
                                    <CardBody className="bg-surface relative group/card hover:shadow-warm-lg hover:border-primary/30 border-border border w-full h-auto rounded-2xl p-6 transition-all duration-300">

                                        <div className="flex justify-between items-start mb-5">
                                            <CardItem
                                                translateZ="30"
                                                className="text-xl font-serif font-bold text-foreground group-hover/card:text-primary transition-colors"
                                            >
                                                {project.title}
                                            </CardItem>
                                            {project.isPinned && (
                                                <CardItem translateZ="20">
                                                    <Pin size={18} className="text-accent fill-accent rotate-45" />
                                                </CardItem>
                                            )}
                                        </div>

                                        <CardItem translateZ="60" className="w-full mb-5">
                                            {project.cover ? (
                                                <div className="w-full h-36 rounded-xl overflow-hidden relative group-hover/card:shadow-md transition-shadow">
                                                    <img
                                                        src={project.cover}
                                                        alt={project.title}
                                                        className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-500"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={`w-full h-36 rounded-xl flex items-center justify-center ${getGradient(project.id)}`}>
                                                    <FolderGit2 className="w-14 h-14 opacity-60" />
                                                </div>
                                            )}
                                        </CardItem>

                                        <CardItem
                                            as="p"
                                            translateZ="40"
                                            className="text-muted text-sm leading-relaxed line-clamp-3 min-h-[4rem] mb-5"
                                        >
                                            {project.description}
                                        </CardItem>

                                        {/* Tech Stack Chips */}
                                        {project.techStack && (
                                            <CardItem translateZ="30" className="flex flex-wrap gap-2 mb-5">
                                                {project.techStack.split(',').slice(0, 3).map((tech, idx) => (
                                                    <span key={idx} className="text-[10px] uppercase tracking-wider font-bold text-muted bg-background px-2 py-1 rounded-lg border border-border">
                                                        {tech.trim()}
                                                    </span>
                                                ))}
                                            </CardItem>
                                        )}

                                        <div className="flex justify-between items-center mt-auto pt-4 border-t border-border">
                                            <div className="flex gap-2">
                                                {project.repoUrl && (
                                                    <CardItem
                                                        translateZ={20}
                                                        as="a"
                                                        href={project.repoUrl}
                                                        target="_blank"
                                                        className="p-2.5 rounded-xl text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                        title="查看源码"
                                                    >
                                                        <Github size={18} />
                                                    </CardItem>
                                                )}
                                                {project.demoUrl && (
                                                    <CardItem
                                                        translateZ={20}
                                                        as="a"
                                                        href={project.demoUrl}
                                                        target="_blank"
                                                        className="p-2.5 rounded-xl text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                        title="在线演示"
                                                    >
                                                        <Globe size={18} />
                                                    </CardItem>
                                                )}
                                            </div>
                                            <CardItem
                                                translateZ={30}
                                                as={Link}
                                                href={`/projects/${project.id}`}
                                                className="flex items-center gap-1 text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                                            >
                                                详情 <ArrowRight size={14} />
                                            </CardItem>
                                        </div>
                                    </CardBody>
                                </CardContainer>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 bg-surface rounded-3xl border border-dashed border-border">
                            <FolderGit2 size={48} className="mx-auto text-muted-light mb-4" />
                            <h3 className="text-xl font-serif font-bold text-foreground mb-2">暂无项目</h3>
                            <p className="text-muted">正在构建下一个伟大的idea...</p>
                        </div>
                    )}
                </div>
            </main>

            <div className="fixed bottom-10 right-10 z-[999]">
                <Link
                    href="/write-project"
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full shadow-warm-lg hover:scale-105 hover:bg-primary-dark transition-all duration-200 font-bold"
                >
                    <Plus size={18} />
                    <span>发布项目</span>
                </Link>
            </div>
        </div>
    );
}
