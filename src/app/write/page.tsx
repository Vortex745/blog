"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { ArrowLeft, Send, Sparkles, FileText, Hash, AlignLeft, Layers, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import ImageUploader from '@/components/ImageUploader';
import { useAuth } from '@/context/AuthContext';


const PITFALL_TEMPLATE = `## 😱 问题描述
(请贴上报错日志或截图，描述异常行为)

\`\`\`bash
Error: ...
\`\`\`

## 🧐 原因分析
(分析问题产生的根源，是版本不兼容？配置错误？还是逻辑漏洞？)

## 🛠️ 解决方案
(你最终是如何解决的？贴上修复的代码或配置)

\`\`\`typescript
// Fix logic here
\`\`\`

## 💡 避坑指南
(下次如何避免？有什么经验教训？)
`;

export default function WritePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();

    // Get params directly from the hook
    const initialType = searchParams.get('type') || 'note';
    const postId = searchParams.get('id');

    const [formData, setFormData] = useState({
        title: '',
        content: initialType === 'pitfall' ? PITFALL_TEMPLATE : '',
        summary: '',
        type: initialType,
        cover: '',
    });
    const [loading, setLoading] = useState(false);

    // Fetch post if editing
    // Fetch post if editing, or reset if creating
    useEffect(() => {
        if (postId) {
            setLoading(true);
            api.get(`/posts/${postId}`)
                .then(res => {
                    const post = res.data;
                    setFormData({
                        title: post.title,
                        content: post.content,
                        summary: post.summary || '',
                        type: post.type,
                        cover: post.cover || '',
                    });
                })
                .catch(err => {
                    console.error(err);
                    alert('加载文章失败');
                })
                .finally(() => setLoading(false));
        } else {
            // Reset form when not editing (e.g. switching from edit to create, or changing type via URL)
            setFormData({
                title: '',
                content: initialType === 'pitfall' ? PITFALL_TEMPLATE : '',
                summary: '',
                type: initialType,
                cover: '',
            });
        }
    }, [postId, initialType]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (postId) {
                await api.put(`/posts/${postId}`, formData);
            } else {
                await api.post('/posts', formData);
            }
            router.push('/');
        } catch (error) {
            alert('发布失败，权限不足或服务器错误');
        } finally {
            setLoading(false);
        }
    };

    const insertImageToContent = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const url = res.data.url;
            const imageMarkdown = `\n![image](${url})\n`;
            setFormData(prev => ({ ...prev, content: prev.content + imageMarkdown }));
        } catch (error) {
            alert('图片上传失败');
        }
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value;
        let newContent = formData.content;

        if (newType === 'pitfall' && !formData.content.trim()) {
            newContent = PITFALL_TEMPLATE;
        }

        setFormData({ ...formData, type: newType, content: newContent });
    };

    const wordCount = formData.content.length;
    const readingTime = Math.ceil(wordCount / 300);

    return (
        <ProtectedRoute>
            <div className="min-h-screen w-full bg-background relative selection:bg-primary/20 selection:text-primary">
                {/* Fixed Navigation */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border/50">
                    <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                        <Link href="/profile" className="flex items-center gap-2 text-muted hover:text-primary transition-colors font-bold text-sm bg-surface-hover/50 px-3 py-1.5 rounded-full hover:bg-surface border border-transparent hover:border-border">
                            <ArrowLeft size={16} />
                            返回个人中心
                        </Link>

                        <div className="flex items-center gap-4 text-xs font-medium text-muted-light hidden sm:flex">
                            <div className="flex items-center gap-1.5">
                                <FileText size={12} />
                                <span>{wordCount} 字</span>
                            </div>
                            <span className="w-1 h-1 rounded-full bg-border"></span>
                            <div className="flex items-center gap-1.5">
                                <span>约 {readingTime} 分钟阅读</span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            form="write-form"
                            disabled={loading || !formData.title.trim() || !formData.content.trim()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-warm hover:shadow-warm-lg hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    发布中
                                </>
                            ) : (
                                <>
                                    <Send size={14} className="fill-current" />
                                    发布
                                </>
                            )}
                        </button>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="max-w-2xl mx-auto px-6 pt-32 pb-24 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/10 text-primary rounded-full text-xs font-bold mb-4 shadow-soft">
                            <Sparkles size={12} />
                            创作中心
                        </div>
                        <h1 className="text-4xl font-serif font-bold text-foreground">{postId ? '编辑文章' : '开始写作'}</h1>
                        <p className="text-muted mt-2">分享你的知识、经验和见解</p>
                    </motion.div>

                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        id="write-form"
                        onSubmit={handleSubmit}
                        className="space-y-8 bg-surface/50 backdrop-blur-sm p-8 rounded-[2rem] border border-border shadow-soft-xl"
                    >
                        {/* Cover Image Upload */}
                        <ImageUploader
                            value={formData.cover}
                            onChange={(url) => setFormData({ ...formData, cover: url || '' })}
                            label="文章封面"
                            dropzoneClassName="h-48"
                        />

                        {/* Title */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground pl-1">
                                <FileText size={16} className="text-primary" />
                                文章标题
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="给文章起个响亮的标题..."
                                className="w-full px-4 py-4 bg-surface/80 border border-border rounded-xl text-foreground text-2xl font-serif font-bold placeholder:text-muted-light placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        {/* Type & Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Type Selector */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground pl-1">
                                    <Layers size={16} className="text-accent" />
                                    分类
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-4 bg-surface/80 border border-border rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all appearance-none cursor-pointer shadow-soft"
                                        value={formData.type}
                                        onChange={handleTypeChange}
                                    >
                                        <option value="note">📝 学习笔记</option>
                                        <option value="project">📽️ 项目记录</option>
                                        <option value="life">🌿 生活随笔</option>
                                        <option value="pitfall">🚧 踩坑总结</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-light">
                                        <Layers size={16} />
                                    </div>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="md:col-span-2 space-y-3">
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground pl-1">
                                    <Hash size={16} className="text-primary" />
                                    摘要
                                    <span className="text-muted-light font-normal text-xs">(选填)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="一句话概括文章核心内容..."
                                    className="w-full px-4 py-4 bg-surface/80 border border-border rounded-xl text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
                                    value={formData.summary}
                                    onChange={e => setFormData({ ...formData, summary: e.target.value })}
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground pl-1 w-full">
                                <AlignLeft size={16} className="text-muted" />
                                正文内容
                                <div className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">Markdown 支持</div>
                                <label className="cursor-pointer ml-auto flex items-center gap-1 text-xs text-primary hover:bg-primary/5 px-2 py-1 rounded transition-colors">
                                    <ImageIcon size={14} />
                                    插入图片
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) insertImageToContent(file);
                                        }}
                                    />
                                </label>
                            </label>
                            <div className="relative group">
                                <textarea
                                    required
                                    rows={20}
                                    placeholder={`开始尽情创作吧...

Markdown 快捷指南：
- **粗体** 强调重点
- \`代码\` 展示技术细节
- > 引用
- # 标题
- - 列表`}
                                    className="w-full p-6 bg-surface border border-border rounded-2xl text-foreground font-mono text-base placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y leading-8"
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                        </div>
                    </motion.form>
                </main>
            </div>
        </ProtectedRoute>
    );
}
