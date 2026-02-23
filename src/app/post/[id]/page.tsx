"use client";
import React, { useEffect, useState } from "react";
import api from '@/lib/axios';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Tag, ArrowUp, MessageCircle, Hash, User, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdmin } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import CommentsSection from '@/components/CommentsSection';
import ReactMarkdown from 'react-markdown';
import { motion, useScroll, useSpring } from 'framer-motion';
import { TracingBeam } from '@/components/ui/tracing-beam';

interface Post {
    id: number;
    title: string;
    content: string;
    summary: string;
    createdAt: string;
    author: { username: string; avatar?: string };
    categories: { category: { name: string } }[];
    tags: { tag: { name: string } }[];
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { user } = useAuth();
    const router = useRouter();
    const [post, setPost] = useState<Post | null>(null);
    const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    useEffect(() => {
        params.then(setResolvedParams);
    }, [params]);

    useEffect(() => {
        if (!resolvedParams?.id) return;
        async function fetchPost() {
            try {
                const res = await api.get(`/posts/${resolvedParams!.id}`);
                setPost(res.data);
            } catch (error) {
                console.error('Failed to fetch post:', error);
            }
        }
        fetchPost();
    }, [resolvedParams?.id]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const calculateReadingTime = (content: string) => {
        return Math.ceil(content.length / 300);
    };

    const handleDelete = async () => {
        if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;
        try {
            await api.delete(`/posts/${post?.id}`);
            router.push('/');
        } catch (error) {
            alert('删除失败');
        }
    };

    if (!post) {
        return (
            <div className="min-h-screen pt-20 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary-dark pb-20">
            {/* Reading Progress */}
            <motion.div
                className="fixed top-16 left-0 right-0 h-0.5 bg-primary origin-left z-40"
                style={{ scaleX }}
            />

            {/* Main Layout */}
            <TracingBeam className="px-6 pt-4 md:pt-6">
                <div className="max-w-4xl mx-auto">

                    {/* Breadcrumb & Back */}
                    <div className="flex items-center gap-2 text-sm text-muted mb-8">
                        <Link href="/" className="hover:text-primary transition-colors">首页</Link>
                        <ChevronRight size={14} />
                        <Link href="/notes" className="hover:text-primary transition-colors">笔记</Link>
                        <ChevronRight size={14} />
                        <span className="text-foreground truncate max-w-[200px]">{post.title}</span>
                    </div>

                    {/* Article Card */}
                    <article className="bg-surface border border-border rounded-2xl p-8 md:p-12 shadow-sm mb-8">
                        {/* Header */}
                        <header className="mb-10 text-center">
                            <div className="flex items-center justify-center gap-3 mb-6">
                                {post.categories?.map(({ category }) => (
                                    <span
                                        key={category.name}
                                        className="px-3 py-1 bg-primary/5 text-primary border border-primary/10 rounded-full text-xs font-bold tracking-wide"
                                    >
                                        {category.name}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground leading-tight mb-8">
                                {post.title}
                            </h1>

                            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                        {post.author?.avatar ? (
                                            <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                    <span className="font-medium text-foreground">{post.author?.username}</span>
                                </div>
                                <span className="text-border">|</span>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    <span>{new Date(post.createdAt).toLocaleDateString('zh-CN')}</span>
                                </div>
                                <span className="text-border">|</span>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={14} />
                                    <span>{calculateReadingTime(post.content)} 分钟阅读</span>
                                </div>
                            </div>


                            {/* Admin Controls */}
                            {user && isAdmin(user.username) && (
                                <div className="flex justify-center gap-4 mt-6">
                                    <Link
                                        href={`/write?id=${post.id}&type=${post.categories?.[0]?.category.name === '项目记录' ? 'project' : 'note'}`}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
                                    >
                                        <Edit size={16} />
                                        编辑文章
                                    </Link>
                                    <button
                                        onClick={handleDelete}
                                        className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error rounded-lg text-sm font-bold hover:bg-error/20 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                        删除文章
                                    </button>
                                </div>
                            )}
                        </header>

                        {/* Divider */}
                        <hr className="border-border/50 mb-10" />

                        {/* Content */}
                        <div className="prose prose-lg prose-neutral max-w-none prose-headings:font-serif prose-headings:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl">
                            <ReactMarkdown>{post.content}</ReactMarkdown>
                        </div>

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-2">
                                {post.tags.map(({ tag }) => (
                                    <span
                                        key={tag.name}
                                        className="flex items-center gap-1 px-3 py-1 text-sm bg-surface-hover text-muted rounded-lg hover:text-primary transition-colors cursor-default"
                                    >
                                        <Hash size={12} />
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </article>

                    {/* Author Card Suggestion (Removed as per request) */}

                    {/* Comments */}
                    <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm" id="comments">
                        <div className="flex items-center gap-3 mb-8">
                            <MessageCircle className="text-primary" />
                            <h2 className="text-xl font-bold font-serif">评论交流</h2>
                        </div>
                        {resolvedParams?.id && <CommentsSection postId={resolvedParams.id} />}
                    </div>

                </div>
            </TracingBeam>

            {/* Float Button */}
            <button
                onClick={scrollToTop}
                className="fixed bottom-8 right-8 w-10 h-10 bg-surface border border-border rounded-full shadow-soft flex items-center justify-center text-muted hover:text-primary hover:-translate-y-1 transition-all z-40"
                aria-label="Back to top"
            >
                <ArrowUp size={18} />
            </button>
        </div >
    );
}
