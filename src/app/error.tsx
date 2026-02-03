"use client";
import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-6 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="text-red-500" size={40} />
            </div>

            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
                出了一点小问题
            </h2>

            <p className="text-muted max-w-md mb-8">
                应用遇到了一些意料之外的错误。这通常不是你的问题，请尝试刷新页面。
            </p>

            <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-white rounded-full font-bold hover:bg-foreground/80 transition-all hover:scale-105 shadow-lg"
            >
                <RotateCcw size={18} />
                尝试恢复
            </button>
        </div>
    );
}
