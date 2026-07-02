"use client";

import { useEffect, useRef, useState } from "react";
import { useAui } from "@assistant-ui/react";
import { MessageCircle, X } from "lucide-react";
import { MyThread } from "./thread";

// Styles have been moved to src/styles/globals.css to fix Astro View Transitions bug

export const AssistantModal = ({ onReset, isOpen, setIsOpen }: { onReset: () => void, isOpen: boolean, setIsOpen: (o: boolean) => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  const aui = useAui();

  useEffect(() => {
    return aui.on("thread.runStart", () => {
      setIsOpen(true);
    });
  }, [aui]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (isOpen) handleClose();
    else handleOpen();
  };

  return (
    <div ref={ref} className="ai-morph" data-open={isOpen ? "true" : "false"}>
      <div className="ai-morph__panel">
        <MyThread onReset={onReset} />
      </div>
      <button
        type="button"
        className="ai-morph__trigger"
        aria-label={isOpen ? "关闭 AI 助手" : "打开 AI 助手"}
        aria-expanded={isOpen ? "true" : "false"}
        onClick={handleToggle}
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </div>
  );
};
