"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Ghost, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden">
            <div className="fixed inset-0 bg-noise opacity-50 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 flex flex-col items-center text-center p-8"
            >
                <div className="relative">
                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="text-primary/20"
                    >
                        <Ghost size={180} />
                    </motion.div>
                    <h1 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl font-serif font-black text-foreground mix-blend-overlay opacity-50">
                        404
                    </h1>
                </div>

                <div className="space-y-4 mt-8">
                    <h2 className="text-3xl font-serif font-bold text-foreground">页面走丢了</h2>
                    <p className="text-muted max-w-md mx-auto">
                        看起来你访问的页面不存在，或者已经被移动到了其他的维度。
                    </p>
                </div>

                <div className="mt-10">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-dark transition-all hover:scale-105 shadow-lg shadow-primary/20"
                    >
                        <Home size={18} />
                        回到首页
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
