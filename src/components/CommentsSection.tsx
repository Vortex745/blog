"use client";
import React, { useState, useEffect } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { Send, LogIn, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Comment {
    id: number;
    content: string;
    createdAt: string;
    author: { username: string };
}

export default function CommentsSection({ postId }: { postId: string }) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            const res = await api.get(`/posts/${postId}/comments`);
            setComments(res.data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setLoading(true);
        try {
            await api.post(`/posts/${postId}/comments`, { content });
            setContent('');
            fetchComments();
        } catch (error) {
            console.error('Failed to post comment:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10">
            {/* Comment Form */}
            {user ? (
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    onSubmit={handleSubmit}
                    className="relative z-10 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                            {user.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 space-y-4">
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="分享你的见解..."
                                rows={4}
                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none font-sans text-sm"
                            />
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-light">支持 Markdown 格式</p>
                                <button
                                    type="submit"
                                    disabled={loading || !content.trim()}
                                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-full font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-105 active:scale-95"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>发送中</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={14} />
                                            <span>发表评论</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.form>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="p-10 bg-gradient-to-br from-gray-50 to-white border border-dashed border-gray-200 rounded-2xl text-center"
                >
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                        <UserIcon className="text-primary/60" size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">加入讨论</h3>
                    <p className="text-muted mb-6">登录后即可发表评论，与大家交流想法。</p>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 px-8 py-3 bg-foreground text-white rounded-full font-bold text-sm hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                    >
                        <LogIn size={16} />
                        <span>去登录</span>
                    </Link>
                </motion.div>
            )}

            {/* Comments List */}
            <div className="space-y-8">
                {comments.length > 0 ? (
                    comments.map((comment, index) => (
                        <motion.div
                            key={comment.id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative pl-4"
                        >
                            {/* Decorative Line connection */}
                            {index < comments.length - 1 && (
                                <div className="absolute left-9 top-12 bottom-0 w-0.5 bg-gray-100 group-hover:bg-primary/20 transition-colors"></div>
                            )}

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 shrink-0 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-secondary font-bold text-sm z-10 group-hover:border-primary/30 transition-colors">
                                    {comment.author?.username?.[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 bg-white p-5 rounded-2xl border border-gray-50 shadow-sm group-hover:shadow-md transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-foreground text-sm">{comment.author?.username}</span>
                                        <span className="text-xs text-muted-light font-mono">
                                            {new Date(comment.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="text-center py-16">
                        <p className="text-muted italic">还没有评论，来做第一个发言的人吧~</p>
                    </div>
                )}
            </div>
        </div>
    );
}
