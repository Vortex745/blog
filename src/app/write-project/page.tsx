"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { ArrowLeft, Save, FolderGit2, Link as LinkIcon, Layers, FileText, Sparkles, Pin, Globe, Smartphone, Monitor, Terminal, Package, Gamepad2, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import ImageUploader from '@/components/ImageUploader';

import { useAuth } from '@/context/AuthContext';


export default function WriteProjectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const projectId = searchParams.get('id');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        techStack: '',
        repoUrl: '',
        demoUrl: '',
        projectType: 'web',
        isPinned: false,
        cover: '',
    });
    const [loading, setLoading] = useState(false);

    // Fetch project if editing, or reset if creating new
    useEffect(() => {
        if (projectId) {
            setLoading(true);
            api.get(`/projects/${projectId}`)
                .then(res => {
                    const project = res.data;
                    setFormData({
                        title: project.title,
                        description: project.description,
                        techStack: project.techStack || '',
                        repoUrl: project.repoUrl || '',
                        demoUrl: project.demoUrl || '',
                        projectType: project.projectType || 'web',
                        isPinned: project.isPinned,
                        cover: project.cover || '',
                    });
                })
                .catch(err => {
                    console.error(err);
                    alert('加载项目失败');
                })
                .finally(() => setLoading(false));
        } else {
            // Reset form when creating new project
            setFormData({
                title: '',
                description: '',
                techStack: '',
                repoUrl: '',
                demoUrl: '',
                projectType: 'web',
                isPinned: false,
                cover: '',
            });
        }
    }, [projectId]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (projectId) {
                await api.put(`/projects/${projectId}`, formData);
            } else {
                await api.post('/projects', formData);
            }
            router.push('/projects');
        } catch (error) {
            alert('发布失败，请稍后再试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary">
                {/* Nav */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border/50">
                    <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
                        <Link href="/projects" className="flex items-center gap-2 text-muted hover:text-primary transition-colors font-bold text-sm bg-surface-hover/50 px-3 py-1.5 rounded-full hover:bg-surface border border-transparent hover:border-border">
                            <ArrowLeft size={16} />
                            返回项目列表
                        </Link>

                        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                            <Sparkles size={16} className="text-primary" />
                            <span>{projectId ? '编辑项目' : '发布项目'}</span>
                        </div>

                        <button
                            type="submit"
                            form="project-form"
                            disabled={loading || !formData.title.trim()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-warm hover:shadow-warm-lg hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    发布中
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    发布
                                </>
                            )}
                        </button>
                    </div>
                </nav>

                <main className="pt-32 pb-24 px-6 max-w-3xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10 text-center"
                    >
                        <h1 className="text-3xl font-serif font-bold text-foreground">{projectId ? '编辑项目' : '分享你的杰作'}</h1>
                        <p className="text-muted mt-2">让世界看到你的创造力</p>
                    </motion.div>

                    <motion.form
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        id="project-form"
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-[5px] bg-border/20 backdrop-blur-md p-[5px] rounded-[24px] border border-border/50 shadow-soft-xl"
                    >
                        {/* Cover Image Upload */}
                        <div className="bg-surface rounded-[20px] p-6 shadow-sm">
                            <ImageUploader
                                value={formData.cover}
                                onChange={(url) => setFormData({ ...formData, cover: url || '' })}
                                label="项目封面"
                            />
                        </div>

                        {/* Title */}
                        <div className="bg-surface rounded-[20px] p-6 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                                <FolderGit2 size={16} className="text-primary" />
                                项目名称
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full px-5 py-4 bg-surface-hover border border-border/50 rounded-xl text-foreground placeholder:text-muted-light placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-serif font-bold text-lg"
                                placeholder="我的酷炫项目 App"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        {/* Project Type */}
                        <div className="bg-surface rounded-[20px] p-6 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                                <Layers size={16} className="text-accent" />
                                项目类型
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { value: 'web', label: 'Web 应用', icon: Globe },
                                    { value: 'mobile', label: '移动端', icon: Smartphone },
                                    { value: 'desktop', label: '桌面端', icon: Monitor },
                                    { value: 'cli', label: '命令行', icon: Terminal },
                                    { value: 'library', label: '开源库', icon: Package },
                                    { value: 'game', label: '游戏', icon: Gamepad2 },
                                    { value: 'other', label: '其他', icon: MoreHorizontal },
                                ].map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, projectType: value })}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${formData.projectType === value
                                            ? 'bg-primary text-white border-primary shadow-warm'
                                            : 'bg-surface-hover text-muted border-border/50 hover:border-primary/50 hover:text-foreground'
                                            }`}
                                    >
                                        <Icon size={16} />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="bg-surface rounded-[20px] p-6 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                                <FileText size={16} className="text-accent" />
                                项目描述
                            </label>
                            <textarea
                                required
                                rows={6}
                                className="w-full p-5 bg-surface-hover border border-border/50 rounded-xl text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none leading-relaxed"
                                placeholder="这个项目解决了什么问题？使用了什么技术？..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Tech Stack */}
                        <div className="bg-surface rounded-[20px] p-6 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                                <Layers size={16} className="text-primary" />
                                技术栈
                            </label>
                            <input
                                type="text"
                                className="w-full px-5 py-4 bg-surface-hover border border-border/50 rounded-xl text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                placeholder="React, Next.js, Tailwind CSS (用逗号分隔)"
                                value={formData.techStack}
                                onChange={e => setFormData({ ...formData, techStack: e.target.value })}
                            />
                        </div>

                        {/* Links */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[5px]">
                            <div className="bg-surface rounded-[20px] p-6 shadow-sm h-full flex flex-col">
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                                    <LinkIcon size={16} className="text-muted" />
                                    Github 仓库
                                </label>
                                <input
                                    type="url"
                                    className="w-full px-5 py-4 bg-surface-hover border border-border/50 rounded-xl text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground transition-all font-mono text-sm"
                                    placeholder="https://github.com/username/repo"
                                    value={formData.repoUrl}
                                    onChange={e => setFormData({ ...formData, repoUrl: e.target.value })}
                                />
                            </div>
                            <div className="bg-surface rounded-[20px] p-6 shadow-sm h-full flex flex-col">
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-3">
                                    <LinkIcon size={16} className="text-muted" />
                                    演示地址 (Demo)
                                </label>
                                <input
                                    type="url"
                                    className="w-full px-5 py-4 bg-surface-hover border border-border/50 rounded-xl text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground transition-all font-mono text-sm"
                                    placeholder="https://my-project.com"
                                    value={formData.demoUrl}
                                    onChange={e => setFormData({ ...formData, demoUrl: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Pinned Toggle */}
                        <div className="bg-surface rounded-[20px] p-6 shadow-sm flex items-center gap-5">
                            <div className="p-3 bg-accent/10 text-accent rounded-xl">
                                <Pin size={20} className="rotate-45" />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="isPinned" className="block text-base font-bold text-foreground cursor-pointer select-none">
                                    置顶项目
                                </label>
                                <p className="text-sm text-muted mt-1">在个人主页优先展示此项目</p>
                            </div>
                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in mt-1">
                                <input
                                    type="checkbox"
                                    id="isPinned"
                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-surface border-4 appearance-none cursor-pointer peer checked:right-0 right-6 checked:border-primary"
                                    checked={formData.isPinned}
                                    onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                                />
                                <label htmlFor="isPinned" className="toggle-label block overflow-hidden h-6 rounded-full bg-border cursor-pointer peer-checked:bg-primary transition-colors"></label>
                            </div>
                        </div>
                    </motion.form>
                </main>
            </div>
        </ProtectedRoute>
    );
}
