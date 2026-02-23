"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageUploaderProps {
    value?: string;
    onChange: (url: string | null) => void;
    label?: string;
    className?: string;
    dropzoneClassName?: string;
    variant?: 'default' | 'avatar';
}

export default function ImageUploader({
    value,
    onChange,
    label = "上传封面",
    className = "",
    dropzoneClassName = "",
    variant = "default"
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [imgError, setImgError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync preview when value prop changes (critical for edit mode where data loads async)
    useEffect(() => {
        if (value !== undefined) {
            setPreview(value || null);
            setImgError(false);
        }
    }, [value]);

    const isAvatar = variant === 'avatar';

    const compressAndUpload = useCallback(async (file: File) => {
        setUploading(true);
        setUploadProgress(10);

        try {
            // 压缩选项
            const options = {
                maxSizeMB: 0.5,           // 最大 500KB
                maxWidthOrHeight: isAvatar ? 400 : 1200,   // 头像尺寸更小
                useWebWorker: true,
                onProgress: (progress: number) => {
                    setUploadProgress(Math.min(10 + progress * 0.4, 50));
                }
            };

            // 压缩图片
            const compressedFile = await imageCompression(file, options);
            setUploadProgress(60);

            // 直接使用 Base64（跳过服务器上传，因为 Vercel 文件系统只读）
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setPreview(result);
                onChange(result); // 直接把 Base64 传给父组件
                setUploadProgress(100);
            };
            reader.readAsDataURL(compressedFile);

        } catch (error) {
            console.error('Compression error:', error);
            // 降级：如果压缩失败，使用原图 Base64
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setPreview(result);
                onChange(result);
            };
            reader.readAsDataURL(file);

        } finally {
            setUploading(false);
            setTimeout(() => setUploadProgress(0), 1000);
        }
    }, [onChange, isAvatar]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                compressAndUpload(file);
            }
        }
    }, [compressAndUpload]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            compressAndUpload(e.target.files[0]);
        }
    }, [compressAndUpload]);

    const handleRemove = useCallback(() => {
        setPreview(null);
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }, [onChange]);

    return (
        <div className={`space-y-2 ${className}`}>
            {label && !isAvatar && (
                <label className="flex items-center gap-2 text-sm font-bold text-foreground pl-1">
                    <ImageIcon size={16} className="text-accent" />
                    {label}
                    <span className="text-muted-light font-normal text-xs">(选填，自动压缩)</span>
                </label>
            )}

            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !preview && inputRef.current?.click()}
                className={`
                    relative overflow-hidden border-2 border-dashed transition-all duration-300 cursor-pointer
                    ${isAvatar ? 'rounded-full aspect-square w-full' : 'rounded-2xl'}
                    ${!isAvatar && !dropzoneClassName.includes('h-') ? 'aspect-video' : ''}
                    ${dragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border hover:border-primary/50'}
                    ${preview ? 'border-solid border-primary/20' : ''}
                    ${dropzoneClassName}
                `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChange}
                    className="hidden"
                />

                <AnimatePresence mode="wait">
                    {preview && !imgError ? (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative w-full h-full"
                        >
                            <img
                                src={preview}
                                alt="Preview"
                                loading="lazy"
                                className="w-full h-full object-cover"
                                onError={() => setImgError(true)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        inputRef.current?.click();
                                    }}
                                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    更换图片
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove();
                                    }}
                                    className="p-2 bg-white/20 hover:bg-error/80 text-white rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ) : preview && imgError ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#f0f0f0]"
                        >
                            <ImageIcon size={32} className="text-muted-light mb-2" />
                            <p className="text-sm font-medium text-muted mb-1">图片加载失败</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setImgError(false);
                                    }}
                                    className="text-xs text-primary hover:underline"
                                >
                                    重试
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove();
                                    }}
                                    className="text-xs text-error hover:underline"
                                >
                                    移除
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                        >
                            {uploading ? (
                                <div className="text-center w-full">
                                    <Loader2 size={isAvatar ? 24 : 32} className="mx-auto mb-2 text-primary animate-spin" />
                                    {!isAvatar && <p className="text-sm font-medium text-muted">上传中...</p>}
                                    {isAvatar && <span className="text-xs text-primary">{uploadProgress}%</span>}
                                </div>
                            ) : (
                                <>
                                    <div className={`rounded-xl bg-primary/10 flex items-center justify-center ${isAvatar ? 'w-10 h-10 mb-2' : 'w-14 h-14 mb-4'}`}>
                                        <Upload size={isAvatar ? 20 : 24} className="text-primary" />
                                    </div>
                                    {!isAvatar && (
                                        <>
                                            <p className="text-foreground font-medium mb-1 text-sm">
                                                点击或拖拽上传
                                            </p>
                                            <p className="text-xs text-muted">
                                                支持 JPG/PNG
                                            </p>
                                        </>
                                    )}
                                    {isAvatar && (
                                        <p className="text-xs text-muted font-bold">更换头像</p>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {isAvatar && label && (
                <div className="text-center">
                    <p className="text-xs text-muted">{label}</p>
                </div>
            )}
        </div>
    );
}
