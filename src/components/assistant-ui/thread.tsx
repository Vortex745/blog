import { ThreadPrimitive, MessagePrimitive, ComposerPrimitive, useMessage } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Bot, User, Send, Plus } from "lucide-react";
import { forwardRef, useEffect, useMemo, useRef, type CSSProperties } from "react";
import { cn } from "../../lib/utils";

// Streaming text (transitions.dev): split ASCII by whitespace runs, each CJK
// char separately (Chinese has no word spaces).
const STREAM_SPLIT = /(?<=[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff])|(\s+)/;

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

// rehype plugin: wrap each word/CJK char in a .t-stream-w span. Code/pre
// (incl. math) are skipped so KaTeX and syntax blocks stay intact.
function rehypeStreamWords() {
  return (tree: HastNode) => {
    const walk = (node: HastNode): void => {
      if (!node.children) return;
      if (node.tagName === "code" || node.tagName === "pre") return;
      const next: HastNode[] = [];
      for (const child of node.children) {
        if (child.type === "text" && child.value && /\S/.test(child.value)) {
          for (const token of child.value.split(STREAM_SPLIT)) {
            if (!token) continue;
            if (/^\s+$/.test(token)) {
              next.push({ type: "text", value: token });
            } else {
              next.push({
                type: "element",
                tagName: "span",
                properties: { className: ["t-stream-w"] },
                children: [{ type: "text", value: token }],
              });
            }
          }
        } else {
          walk(child);
          next.push(child);
        }
      }
      node.children = next;
    };
    walk(tree);
  };
}

// Matrix dot loader (transitions.dev, scan variant):
// 16 dots share one colour-pulse cycle, each column delayed by cycle/10.
const MatrixLoader = () => {
  const delays = useMemo(() => {
    const cycle =
      (typeof document !== "undefined" &&
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--matrix-cycle")
        )) ||
      1200;
    return Array.from({ length: 16 }, (_, idx) =>
      Math.round((idx % 4) * (cycle / 10))
    );
  }, []);

  return (
    <div className="t-matrix" data-variant="scan" aria-hidden="true">
      {delays.map((d, i) => (
        <i key={i} style={{ "--d": d } as CSSProperties} />
      ))}
    </div>
  );
};

export const MyThread = ({ onReset }: { onReset: () => void }) => {
  return (
    <ThreadPrimitive.Root className="w-full h-full flex flex-col bg-background text-foreground relative overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-background z-10 shrink-0">
         <h3 className="text-sm font-medium">AI 助手</h3>
         <button onClick={onReset} title="新建对话" className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors">
            <Plus className="w-4 h-4" />
         </button>
      </div>
      <ThreadPrimitive.Viewport className="ai-morph__viewport flex-1 px-4 py-4 flex flex-col gap-4">
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
            minRows={1}
            maxRows={1}
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

const MarkdownText = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { status } = useMessage();

  // Streaming text (transitions.dev): newly arrived words resolve one by one
  // through opacity + blur, staggered by --stream-gap; spans rest visible.
  // The words are rendered by the smooth animator's internal state (it
  // re-renders MarkdownTextPrimitive without re-rendering this wrapper), so
  // a MutationObserver is the only hook that sees every arrival.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Messages that were already complete on mount rest fully visible.
    if (status?.type === "complete") {
      root.querySelectorAll<HTMLElement>(".t-stream-w:not(.is-in)").forEach((el) =>
        el.classList.add("is-in")
      );
      return;
    }

    const gap =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--stream-gap")
      ) || 60;

    const staggerPending = () => {
      Array.from(root.querySelectorAll<HTMLElement>(".t-stream-w:not(.is-in)")).forEach(
        (el, i) => {
          setTimeout(() => el.classList.add("is-in"), i * gap);
        }
      );
    };

    const observer = new MutationObserver(staggerPending);
    observer.observe(root, { childList: true, subtree: true });
    staggerPending();
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="t-stream">
      <MarkdownTextPrimitive
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeStreamWords, rehypeKatex]}
      />
    </div>
  );
};

const MyAssistantMessage = forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <MessagePrimitive.Root
      ref={ref}
      className="flex self-start max-w-[85%]"
      {...props}
    >
      <AssistantMessageContent />
    </MessagePrimitive.Root>
  );
});
MyAssistantMessage.displayName = "MyAssistantMessage";

const AssistantMessageContent = () => {
  const { status, content } = useMessage();
  const hasText = content.some((p: any) => p.type === "text" && typeof p.text === "string" && p.text.trim().length > 0);
  const isThinking = !hasText && status?.type !== "complete";

  if (isThinking) {
    return (
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 text-blue-600/80 dark:text-blue-400/80">
          <MatrixLoader />
          <span className="text-sm font-medium t-shimmer-text">模型思考中</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl rounded-tl-sm px-4 py-2 prose prose-chat prose-apple dark:prose-invert w-full max-w-full overflow-x-auto">
      <MessagePrimitive.Content components={{ Text: MarkdownText }} />
    </div>
  );
};
