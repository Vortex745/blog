"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { ArrowLeft, Send, Sparkles, FileText, Hash, AlignLeft, Layers, Image as ImageIcon, Wand2, Undo2, CheckCircle, X, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
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

    // AI Polish states
    const [polishing, setPolishing] = useState(false);
    const [polishReport, setPolishReport] = useState<{
        grammar: string;
        clarity: string;
        coherence: string;
        readability: string;
        vocabulary: string;
        engagement: string;
        summary: string;
    } | null>(null);
    const [originalContent, setOriginalContent] = useState<string | null>(null);
    const [showReport, setShowReport] = useState(false);

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

    // AI Polish handler
    const handlePolish = async () => {
        if (!formData.content.trim() || formData.content.trim().length < 10) {
            alert('请先输入至少10个字符的正文内容');
            return;
        }
        setPolishing(true);
        setPolishReport(null);
        setShowReport(false);
        try {
            const res = await fetch('/api/polish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: formData.content }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || '润色失败，请稍后再试');
                return;
            }
            // Save original for undo
            setOriginalContent(formData.content);
            // Replace content
            setFormData(prev => ({ ...prev, content: data.polishedContent }));
            // Show report
            setPolishReport(data.report);
            setShowReport(true);
        } catch (err: any) {
            alert('网络错误，请检查连接后重试');
        } finally {
            setPolishing(false);
        }
    };

    const handleUndoPolish = () => {
        if (originalContent !== null) {
            setFormData(prev => ({ ...prev, content: originalContent }));
            setOriginalContent(null);
            setPolishReport(null);
            setShowReport(false);
        }
    };

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

                        <div className="hidden sm:flex items-center gap-4 text-xs font-medium text-muted-light">
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
                <main className="max-w-3xl mx-auto px-6 pt-20 pb-24 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-5"
                    >
                        <h1 className="text-2xl font-serif font-bold text-foreground">{postId ? '编辑文章' : '开始写作'}</h1>
                        <p className="text-muted mt-1 text-sm">分享你的知识、经验和见解</p>
                    </motion.div>

                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        id="write-form"
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        {/* Cover Image Upload */}
                        <ImageUploader
                            value={formData.cover}
                            onChange={(url) => setFormData({ ...formData, cover: url || '' })}
                            label="文章封面"
                            dropzoneClassName="h-44"
                        />

                        {/* Title */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                <FileText size={16} className="text-primary" />
                                文章标题
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="给文章起个响亮的标题..."
                                className="w-full px-4 py-3.5 bg-surface border border-border rounded-xl text-foreground text-xl font-serif font-bold placeholder:text-muted-light placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        {/* Type & Summary Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Type Selector */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                    <Layers size={16} className="text-accent" />
                                    分类
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full px-4 py-3.5 bg-surface border border-border rounded-xl text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all appearance-none cursor-pointer"
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
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-foreground mb-2">
                                    <Hash size={16} className="text-primary" />
                                    摘要
                                    <span className="text-muted-light font-normal text-xs">(选填)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="一句话概括文章核心内容..."
                                    className="w-full px-4 py-3.5 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={formData.summary}
                                    onChange={e => setFormData({ ...formData, summary: e.target.value })}
                                    maxLength={100}
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <div className="flex items-center gap-2 text-sm font-bold text-foreground w-full mb-2 flex-wrap">
                                <AlignLeft size={16} className="text-muted" />
                                正文内容
                                <div className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">Markdown 支持</div>

                                <div className="ml-auto flex items-center gap-2">
                                    {/* Undo Polish Button */}
                                    {originalContent !== null && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            type="button"
                                            onClick={handleUndoPolish}
                                            className="flex items-center gap-1.5 text-xs font-bold text-warning hover:bg-warning/10 px-3 py-1.5 rounded-lg border border-warning/30 transition-all"
                                        >
                                            <Undo2 size={13} />
                                            撤销润色
                                        </motion.button>
                                    )}

                                    {/* AI Polish Button */}
                                    <button
                                        type="button"
                                        onClick={handlePolish}
                                        disabled={polishing || !formData.content.trim()}
                                        className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] hover:bg-right px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                    >
                                        {polishing ? (
                                            <>
                                                <Loader2 size={13} className="animate-spin" />
                                                润色中...
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 size={13} />
                                                智能润色
                                            </>
                                        )}
                                    </button>

                                    {/* Insert Image */}
                                    <label className="cursor-pointer flex items-center gap-1 text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20 transition-colors">
                                        <ImageIcon size={13} />
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
                                </div>
                            </div>

                            {/* Polish Report Banner */}
                            <AnimatePresence>
                                {showReport && polishReport && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/15 rounded-xl p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <CheckCircle size={15} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">润色完成</p>
                                                        <p className="text-xs text-muted">{polishReport.summary}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowReport(false)}
                                                    className="p-1 text-muted hover:text-foreground rounded transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {[
                                                    { label: '语法准确', value: polishReport.grammar, color: 'text-green-600' },
                                                    { label: '简洁清晰', value: polishReport.clarity, color: 'text-blue-600' },
                                                    { label: '一致连贯', value: polishReport.coherence, color: 'text-purple-600' },
                                                    { label: '流畅可读', value: polishReport.readability, color: 'text-cyan-600' },
                                                    { label: '词汇多样', value: polishReport.vocabulary, color: 'text-amber-600' },
                                                    { label: '吸引力', value: polishReport.engagement, color: 'text-rose-600' },
                                                ].map((item) => (
                                                    <div key={item.label} className="bg-surface/80 rounded-lg px-3 py-2">
                                                        <p className={`text-[10px] font-bold tracking-wider ${item.color} mb-0.5`}>{item.label}</p>
                                                        <p className="text-xs text-foreground leading-snug">{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <textarea
                                required
                                rows={22}
                                placeholder={`开始尽情创作吧...\n\nMarkdown 快捷指南:\n- **粗体** 强调重点\n- \`代码\` 展示技术细节\n- > 引用\n- # 标题\n- - 列表`}
                                className="w-full p-5 bg-surface border border-border rounded-xl text-foreground font-mono text-base placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y leading-8"
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            />
                        </div>
                    </motion.form>
                </main>
            </div>
        </ProtectedRoute>
    );
}
