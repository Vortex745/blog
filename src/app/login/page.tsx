"use client";
import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.error || '登录失败，请检查邮箱和密码');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-background">
            <AuroraBackground>
                <div className="relative flex flex-col items-center justify-center min-h-screen w-full p-4">
                    {/* Nav */}
                    <div className="absolute top-6 left-6 z-50">
                        <Link href="/" className="inline-flex items-center gap-2 text-muted hover:text-primary transition-colors font-bold text-sm bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20 shadow-sm hover:bg-white hover:shadow-md">
                            <ArrowLeft size={16} />
                            返回首页
                        </Link>
                    </div>

                    <motion.div
                        initial={{ opacity: 0.0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            duration: 0.5,
                            ease: "easeInOut",
                        }}
                        className="w-full max-w-[400px] bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] p-8 shadow-2xl shadow-primary/5"
                    >
                        {/* Header */}
                        <div className="text-center mb-6">
                            <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-xl mb-4 shadow-lg shadow-primary/20 rotate-3 transform hover:rotate-6 transition-transform object-cover" />
                            <h1 className="text-2xl font-serif font-bold text-foreground mb-1">欢迎回来</h1>
                            <p className="text-muted text-sm">登录你的账号，继续写作之旅</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-error/5 border border-error/10 rounded-xl text-error text-xs font-bold flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0"></div>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-foreground pl-1">邮箱</label>
                                <div className="relative group">
                                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-light group-focus-within:text-primary transition-colors z-10" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="your@email.com"
                                        className="w-full h-10 pl-10 pr-4 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/5 transition-all placeholder:text-muted-light/70 text-foreground font-medium text-sm"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                    <label className="block text-xs font-bold text-foreground">密码</label>
                                    <a href="#" className="text-xs text-primary font-bold hover:underline">忘记密码?</a>
                                </div>
                                <div className="relative group">
                                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-light group-focus-within:text-primary transition-colors z-10" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        placeholder="••••••••"
                                        className="w-full h-10 pl-10 pr-10 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/5 transition-all placeholder:text-muted-light/70 text-foreground font-medium text-sm"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-light hover:text-foreground transition-colors z-10 p-1"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2 text-sm"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        登录中...
                                    </>
                                ) : (
                                    '登录'
                                )}
                            </button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                            <p className="text-muted text-xs">
                                还没有账号？{' '}
                                <Link href="/register" className="text-primary font-bold hover:underline">
                                    立即注册
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </AuroraBackground>
        </div>
    );
}
