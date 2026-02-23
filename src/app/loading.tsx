"use client";
import { motion } from 'framer-motion';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                    <motion.span
                        className="absolute inset-0 border-4 border-gray-200 rounded-full"
                    />
                    <motion.span
                        className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                </div>
                <p className="text-muted font-serif font-bold text-sm tracking-widest animate-pulse">
                    LOADING...
                </p>
            </div>
        </div>
    );
}
