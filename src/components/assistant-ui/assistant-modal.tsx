"use client";

import { AssistantModalPrimitive } from "@assistant-ui/react";
import { MessageCircle, X } from "lucide-react";
import { MyThread } from "./thread";
import { useState, useRef } from "react";

export const AssistantModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsMounted(true);
      // Use requestAnimationFrame to ensure the ref is populated if Radix delays render slightly
      requestAnimationFrame(() => requestAnimationFrame(() => setIsOpen(true)));
    } else {
      setIsOpen(false);
      // Matches --panel-close-dur in globals.css (350ms)
      setTimeout(() => setIsMounted(false), 350);
    }
  };

  return (
    <div ref={containerRef}>
      <AssistantModalPrimitive.Root open={isMounted} onOpenChange={handleOpenChange}>
        <AssistantModalPrimitive.Anchor className="fixed bottom-6 right-8 md:right-12 z-50">
          <AssistantModalPrimitive.Trigger asChild>
            <button
              aria-label={isOpen ? "关闭 AI 助手" : "打开 AI 助手"}
              data-state={isOpen ? "b" : "a"}
              className="t-icon-swap w-14 h-14 rounded-full bg-[#0059b5] text-white flex items-center justify-center shadow-[0_8px_30px_rgba(0,89,181,0.25)] hover:scale-105 active:scale-90 transition-transform duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#0059b5] focus-visible:ring-offset-2"
            >
              <MessageCircle className="t-icon w-6 h-6" data-icon="a" />
              <X className="t-icon w-6 h-6" data-icon="b" />
            </button>
          </AssistantModalPrimitive.Trigger>

          <AssistantModalPrimitive.Content 
            dissmissOnInteractOutside={true}
            data-open={isOpen ? "true" : "false"}
            className="t-panel-slide fixed bottom-10 right-4 md:right-12 w-[360px] h-[520px] max-h-[calc(100vh-120px)] max-w-[calc(100vw-48px)] bg-background text-foreground rounded-3xl shadow-2xl overflow-hidden border border-border origin-bottom-right"
          >
            <MyThread />
          </AssistantModalPrimitive.Content>
        </AssistantModalPrimitive.Anchor>
      </AssistantModalPrimitive.Root>
    </div>
  );
};


