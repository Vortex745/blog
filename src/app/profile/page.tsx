"use client";
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Mail, Shield, User, PenLine, Settings, Sparkles, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import ImageUploader from '@/components/ImageUploader';
import api from '@/lib/axios';

export default function ProfilePage() {
    const { user, updateProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        avatar: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                avatar: user.avatar || '',
            });
        }
    }, [user]);

    if (!user) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await api.put('/auth/update', formData);
            updateProfile(res.data);
            setIsEditing(false);
            alert('保存成功');
        } catch (error: any) {
            alert(error.response?.data?.error || '无法更新资料');
        } finally {
            setLoading(false);
        }
    };

    // Stat Items
    const stats = [
        {
            label: "邮箱地址",
            value: user.email,
            icon: <Mail className="text-primary" size={20} />,
            bg: "bg-primary/10",
        },
        {
            label: "账号权限",
            value: user.role === 'admin' ? "认证作者" : "普通用户",
            icon: <Shield className="text-accent" size={20} />,
            bg: "bg-accent/10",
        },
        {
            label: "UID",
            value: `#${user.id.toString().padStart(4, '0')}`,
            icon: <User className="text-muted" size={20} />,
            bg: "bg-muted/10",
        }
    ];

    return (
        <ProtectedRoute>
            <div className="min-h-screen w-full bg-background relative selection:bg-primary/20 selection:text-primary pb-20">
                <main className="max-w-5xl mx-auto px-6 pt-12 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row items-center gap-10 mb-16"
                    >
                        {/* Avatar */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="relative group cursor-pointer"
                            onClick={() => setIsEditing(true)}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent blur-2xl opacity-40 rounded-full"></div>
                            {/* Avatar Image or Initial */}
                            <div className="w-32 h-32 relative rounded-[2rem] bg-gradient-to-br from-primary via-primary-light to-accent flex items-center justify-center shadow-warm border-4 border-surface overflow-hidden">
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white text-5xl font-serif font-bold">
                                        {user.username.charAt(0).toUpperCase()}
                                    </span>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <PenLine className="text-white" size={24} />
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-surface p-1.5 rounded-xl shadow-soft">
                                <div className="bg-primary text-white p-1 rounded-lg">
                                    <Sparkles size={14} fill="currentColor" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Info */}
                        <div className="text-center md:text-left flex-1">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-primary rounded-full text-sm font-bold mb-6 shadow-soft"
                            >
                                <Sparkles size={16} className="text-primary" />
                                <span>{user.role === 'admin' ? '认证作者' : '普通用户'}</span>
                            </motion.div>
                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <motion.h1
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-2"
                                >
                                    {user.username}
                                </motion.h1>
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 text-muted hover:text-primary hover:bg-surface-hover rounded-full transition-all"
                                >
                                    <PenLine size={18} />
                                </motion.button>
                            </div>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-muted text-lg"
                            >
                                欢迎回到你的创作空间
                            </motion.p>
                        </div>
                    </motion.div>

                    {/* Dashboard Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        {stats.map((stat, idx) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + idx * 0.1 }}
                                className="p-6 bg-surface border border-border rounded-3xl shadow-soft hover:shadow-soft-lg transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-muted-light uppercase tracking-wider mb-1">{stat.label}</p>
                                        <p className="text-foreground font-bold truncate max-w-[150px]" title={stat.value}>{stat.value}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Action Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Link href="/write" className="group">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 }}
                                className="h-full p-8 bg-gradient-to-br from-primary via-primary-light to-accent text-white rounded-3xl shadow-warm hover:shadow-warm-lg transition-all border border-primary/20 relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        <PenLine className="text-white" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-serif font-bold mb-2">发布新文章</h3>
                                        <p className="text-white/80 font-medium">记录灵感，分享知识</p>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Link href="/write-project" className="group p-6 bg-surface border border-dashed border-border rounded-3xl hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center justify-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-surface-hover group-hover:bg-surface group-hover:shadow-soft flex items-center justify-center transition-all">
                                    <Sparkles className="text-muted group-hover:text-primary transition-colors" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">发布项目</h4>
                                    <p className="text-xs text-muted mt-1">展示作品集</p>
                                </div>
                            </Link>

                            <button
                                onClick={() => setIsEditing(true)}
                                className="group p-6 bg-surface border border-border rounded-3xl hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center justify-center gap-4"
                            >
                                <div className="w-12 h-12 rounded-full bg-surface-hover group-hover:bg-surface group-hover:shadow-soft border border-transparent group-hover:border-primary/20 flex items-center justify-center transition-all">
                                    <Settings className="text-muted group-hover:text-primary transition-colors" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">编辑资料</h4>
                                    <p className="text-xs text-muted mt-1">修改头像与昵称</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </main>

                {/* Edit Modal */}
                <AnimatePresence>
                    {isEditing && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                onClick={() => setIsEditing(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className="bg-surface rounded-3xl shadow-soft-xl max-w-md w-full p-8 relative z-10 border border-border"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-2xl font-serif font-bold text-foreground">编辑资料</h3>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="p-2 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="flex justify-center mb-6">
                                        <div className="w-32">
                                            <ImageUploader
                                                value={formData.avatar}
                                                onChange={(url) => setFormData({ ...formData, avatar: url || '' })}
                                                label="点击更换头像"
                                                variant="avatar"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-foreground block">
                                            昵称
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="w-full px-4 py-3 bg-surface-hover border border-border rounded-xl text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                            placeholder="请输入你的昵称"
                                            minLength={2}
                                            required
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 px-4 py-3 bg-surface-hover text-muted hover:text-foreground hover:bg-muted/10 rounded-xl font-bold transition-all"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? '保存中...' : (
                                                <>
                                                    <Save size={16} /> 保存
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}
