"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const FlipWords = ({
    words,
    duration = 3000,
    className,
}: {
    words: string[];
    duration?: number;
    className?: string;
}) => {
    const [currentWord, setCurrentWord] = useState(words[0]);

    useEffect(() => {
        const interval = setInterval(() => {
            const nextIdx = (words.indexOf(currentWord) + 1) % words.length;
            setCurrentWord(words[nextIdx]);
        }, duration);
        return () => clearInterval(interval);
    }, [currentWord, duration, words]);

    return (
        <AnimatePresence mode="wait">
            <motion.span
                key={currentWord}
                initial={{
                    opacity: 0,
                    y: 10,
                    filter: "blur(8px)",
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                }}
                exit={{
                    opacity: 0,
                    y: -10,
                    filter: "blur(8px)",
                }}
                transition={{
                    duration: 0.4,
                    ease: "easeOut",
                }}
                className={cn("inline-block relative text-left", className)}
            >
                {currentWord}
            </motion.span>
        </AnimatePresence>
    );
};
