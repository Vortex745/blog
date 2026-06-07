import { ThreadPrimitive, MessagePrimitive, ComposerPrimitive, useMessage } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Bot, User, Send } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../lib/utils";

export const MyThread = () => {
  return (
    <ThreadPrimitive.Root className="h-full flex flex-col bg-background text-foreground relative overflow-hidden">
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
        <ThreadPrimitive.Empty>
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center mt-12">
            {/* Gemini glow effect */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-100/50 via-transparent to-transparent dark:from-blue-900/20" />
            
            <h2 className="text-xl font-medium z-10 mt-6">你好，我是你的 AI 助手</h2>
            <p className="text-muted-foreground z-10 max-w-[280px]">今天有什么我可以帮你的吗？</p>
          </div>
        </ThreadPrimitive.Empty>
        
        <ThreadPrimitive.Messages
          components={{
            UserMessage: MyUserMessage,
            AssistantMessage: MyAssistantMessage,
          }}
        />
      </ThreadPrimitive.Viewport>

      <div className="p-4 bg-background/80 backdrop-blur-md sticky bottom-0 border-t border-border">
        <ComposerPrimitive.Root className="flex items-end gap-2 bg-muted/50 p-2 rounded-2xl border border-border focus-within:ring-2 focus-within:ring-blue-500/50">
          <ComposerPrimitive.Input
            name="assistant-message"
            aria-label="聊天输入"
            placeholder="问我任何问题..."
            className="flex-1 bg-transparent px-3 py-2 outline-none max-h-32 min-h-10 resize-none text-[15px]"
            autoFocus
          />
          <ComposerPrimitive.Send asChild>
            <button
              aria-label="发送消息"
              className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
            >
              <Send className="w-5 h-5" />
            </button>
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </div>
    </ThreadPrimitive.Root>
  );
};

const MyUserMessage = forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <MessagePrimitive.Root
      ref={ref}
      className="flex self-end flex-row-reverse max-w-[85%]"
      {...props}
    >
      <div className="bg-muted rounded-2xl rounded-tr-sm px-4 py-2.5 chat-bubble-text">
        <MessagePrimitive.Content />
      </div>
    </MessagePrimitive.Root>
  );
});
MyUserMessage.displayName = "MyUserMessage";

const MarkdownText = () => (
  <MarkdownTextPrimitive remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} />
);

const MyAssistantMessage = forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <MessagePrimitive.Root
      ref={ref}
      className="flex self-start max-w-[85%]"
      {...props}
    >
      <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl rounded-tl-sm px-4 py-2 prose prose-chat prose-apple dark:prose-invert w-full max-w-full overflow-x-auto">
        <ThinkingIndicator />
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
      </div>
    </MessagePrimitive.Root>
  );
});
MyAssistantMessage.displayName = "MyAssistantMessage";

const ThinkingIndicator = () => {
  const { status, content } = useMessage();
  const hasText = content.some((p: any) => p.type === "text" && typeof p.text === "string" && p.text.trim().length > 0);
  
  const isThinking = !hasText && status?.type !== "complete";

  // When there is text, don't show the thinking indicator anymore.
  // Exception: you might want to show reasoning, but we hide it for now.
  if (hasText) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Temporary DEBUG line to see what state assistant-ui reports */}
      {/* <div className="text-xs text-red-500 font-mono">DEBUG: status={String(status)}, hasText={String(hasText)}, contentLen={content.length}</div> */}
      
      {isThinking && (
        <div className="flex items-center gap-2 text-blue-600/80 dark:text-blue-400/80">
          <span className="text-sm font-medium t-shimmer-text">模型思考中</span>
        </div>
      )}
    </div>
  );
};
