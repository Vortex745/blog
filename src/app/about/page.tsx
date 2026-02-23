"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { ArrowLeft, Edit3, Save, X, Github, Twitter, Globe, Sparkles, User, Coffee, Image as ImageIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { isAdmin } from '@/lib/permissions';

interface AboutData {
    content: string;
    user: {
        username: string;
        email: string;
        avatar?: string;
    };
}

export default function AboutPage() {
    const { user } = useAuth();
    const [data, setData] = useState<AboutData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchAbout() {
            try {
                const res = await api.get('/about');
                setData(res.data);
                setContent(res.data?.content || '');
            } catch (error) {
                console.error('Failed to fetch about:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchAbout();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/about', { content });
            setData(prev => prev ? { ...prev, content } : null);
            setEditing(false);
        } catch (error) {
            console.error('Failed to save about:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1200,
                useWebWorker: true,
            };
            const compressedFile = await imageCompression(file, options);

            const formData = new FormData();
            formData.append('file', compressedFile);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const { url } = await res.json();
                const imageMarkdown = `\n![Image](${url})\n`;
                setContent(prev => prev + imageMarkdown);
            } else {
                alert('Image upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        }
    };

    // Use isAdmin to check permissions
    const isOwner = isAdmin(user?.username);

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* 噪点纹理背景 */}
            <div className="fixed inset-0 bg-noise pointer-events-none z-0" />

            {/* Header */}
            <header className="pt-4 md:pt-6 pb-8 px-6 max-w-3xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row items-start md:items-center gap-8"
                >
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                        <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center text-white text-5xl font-serif font-bold shadow-2xl shadow-primary/20 relative z-10 border-4 border-white overflow-hidden">
                            {data?.user?.avatar ? (
                                <img src={data.user.avatar} alt={data.user.username} className="w-full h-full object-cover" />
                            ) : (
                                <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                            )}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg z-20 border border-gray-100">
                            <Sparkles size={18} className="text-primary fill-current" />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 text-primary rounded-full text-sm font-bold mb-6 border border-primary/20 shadow-soft">
                            <Coffee size={16} />
                            <span>博主</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-2 tracking-tight">
                            {loading ? '加载中...' : data?.user?.username || '匿名用户'}
                        </h1>
                        <p className="text-muted text-lg font-medium mb-6">
                            {data?.user?.email}
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-4">
                            {[Github, Twitter, Globe].map((Icon, i) => (
                                <a key={i} href="#" className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:border-primary hover:text-primary hover:shadow-lg hover:shadow-primary/10 flex items-center justify-center text-muted transition-all">
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Edit Button */}
                    {isOwner && !editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-foreground rounded-2xl font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
                        >
                            <Edit3 size={16} />
                            编辑简介
                        </button>
                    )}
                </motion.div>
            </header>

            {/* Content */}
            <main className="px-6 pb-24 max-w-3xl mx-auto relative z-10">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                ) : editing ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-xl shadow-gray-200/50">
                            <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center backdrop-blur-sm">
                                <span className="font-bold text-foreground flex items-center gap-2">
                                    <Edit3 size={16} className="text-primary" />
                                    编辑简介
                                </span>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-primary cursor-pointer hover:bg-primary/10 px-2 py-1 rounded transition-colors">
                                        <ImageIcon size={14} />
                                        插入图片
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                    <span className="text-xs text-muted font-mono bg-gray-100 px-2 py-1 rounded">Markdown Supported</span>
                                </div>
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="介绍一下你自己吧..."
                                rows={15}
                                className="w-full p-8 bg-white text-foreground placeholder:text-muted-light focus:outline-none resize-none font-sans leading-relaxed text-lg"
                            />
                        </div>
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => {
                                    setEditing(false);
                                    setContent(data?.content || '');
                                }}
                                className="px-6 py-3 text-muted hover:text-foreground font-bold transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        保存中
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        保存更改
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                ) : data?.content ? (
                    <motion.article
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-[2rem] p-8 md:p-12 shadow-xl shadow-gray-200/40"
                    >
                        <div
                            className="prose prose-lg max-w-none
                                prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground
                                prose-p:text-muted prose-p:leading-8
                                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                                prose-strong:text-foreground
                                prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic
                                prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono
                                prose-li:marker:text-primary
                            "
                        >
                            <ReactMarkdown>{data.content}</ReactMarkdown>
                        </div>
                    </motion.article>
                ) : (
                    <div className="text-center py-20 bg-white border border-dashed border-gray-300 rounded-[2rem]">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-50 flex items-center justify-center">
                            <User className="text-muted-light" size={40} />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-foreground mb-2">还没有简介</h3>
                        <p className="text-muted mb-8">向大家介绍一下你自己吧...</p>
                        {isOwner && (
                            <button
                                onClick={() => setEditing(true)}
                                className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:-translate-y-1"
                            >
                                <Edit3 size={18} />
                                添加简介
                            </button>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-10 px-6 text-center text-muted text-sm bg-gray-50/50">
                <p>© 2024 <Link href="/" className="text-primary font-bold hover:underline">未完稿</Link> · 用心记录每一刻</p>
            </footer>
        </div>
    );
}
