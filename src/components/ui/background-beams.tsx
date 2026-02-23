"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const BackgroundBeams = ({ className }: { className?: string }) => {
    return (
        <div
            className={cn(
                "absolute h-full w-full inset-0 bg-neutral-950/[0.2] overflow-hidden", // changed opacity
                className
            )}
        >
            <div className="absolute h-full w-full inset-0 pointer-events-none">
                {/* Custom SVG Gradient Mesh */}
                <svg
                    className="h-full w-full opacity-[0.2]" // Lower opacity
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    <path d="M0 100 V 50 Q 50 0 100 50 V 100 z" fill="url(#gradient)" />
                    <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: "var(--primary)", stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: "var(--secondary)", stopOpacity: 0.2 }} />
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        </div>
    );
};
