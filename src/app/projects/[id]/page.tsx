"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import Link from 'next/link';
import { ArrowLeft, Github, Globe, Calendar, FolderGit2, Layers, Edit, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/permissions';

interface Project {
    id: number;
    title: string;
    description: string;
    techStack?: string;
    repoUrl?: string;
    demoUrl?: string;
    createdAt: string;
    author: {
        username: string;
    };
}

export default function ProjectDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProject() {
            try {
                const res = await api.get(`/projects/${id}`);
                setProject(res.data);
            } catch (error) {
                console.error("Failed to fetch project:", error);
            } finally {
                setLoading(false);
            }
        }
        if (id) fetchProject();
    }, [id]);

    const handleDelete = async () => {
        if (!confirm('确定要删除这个项目吗？此操作不可恢复。')) return;
        try {
            await api.delete(`/projects/${id}`);
            router.push('/projects');
        } catch (error) {
            alert('删除失败');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!project) return (
        <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center text-muted">
            <p className="mb-4">项目不存在</p>
            <Link href="/projects" className="text-primary hover:underline">返回列表</Link>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FAFAFA] relative">
            {/* Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>

            {/* Nav */}
            <nav className="relative z-10 px-6 py-6">
                <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md border border-gray-200 rounded-full text-muted hover:text-foreground hover:bg-white transition-all shadow-sm font-medium text-sm"
                >
                    <ArrowLeft size={16} />
                    返回列表
                </Link>
            </nav>

            <main className="relative z-10 max-w-4xl mx-auto px-6 pb-24 pt-12">
                <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-12 shadow-2xl shadow-gray-200/50">

                    {/* Header */}
                    <header className="mb-8 border-b border-gray-100 pb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase tracking-wider">
                                Project
                            </div>
                            <span className="text-muted text-sm font-medium flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(project.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
                            {project.title}
                        </h1>

                        <div className="flex flex-wrap gap-4 mb-8">
                            {project.repoUrl && (
                                <a
                                    href={project.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#24292e] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-gray-900/20"
                                >
                                    <Github size={18} />
                                    查看源码
                                </a>
                            )}
                            {project.demoUrl && (
                                <a
                                    href={project.demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                >
                                    <Globe size={18} />
                                    在线演示
                                </a>
                            )}
                        </div>

                        {/* Admin Controls */}
                        {user && isAdmin(user.username) && (
                            <div className="flex justify-start gap-4 border-t border-gray-100 pt-6">
                                <Link
                                    href={`/write-project?id=${project.id}`}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
                                >
                                    <Edit size={16} />
                                    编辑项目
                                </Link>
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error rounded-lg text-sm font-bold hover:bg-error/20 transition-colors"
                                >
                                    <Trash2 size={16} />
                                    删除项目
                                </button>
                            </div>
                        )}
                    </header>

                    {/* Content */}
                    <div className="space-y-10">
                        <section>
                            <h2 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                                <FolderGit2 className="text-secondary" size={20} />
                                项目介绍
                            </h2>
                            <p className="text-lg text-gray-600 leading-8 whitespace-pre-wrap">
                                {project.description}
                            </p>
                        </section>

                        {project.techStack && (
                            <section>
                                <h2 className="text-xl font-serif font-bold text-foreground mb-4 flex items-center gap-2">
                                    <Layers className="text-accent" size={20} />
                                    技术栈
                                </h2>
                                <div className="flex flex-wrap gap-3">
                                    {project.techStack.split(',').map((tech, idx) => (
                                        <span key={idx} className="px-4 py-2 bg-gray-50 text-foreground text-sm font-medium rounded-xl border border-gray-100">
                                            {tech.trim()}
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
