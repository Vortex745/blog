import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useMemo } from "react";
import { AssistantModal } from "./assistant-modal";

export const AIChat = () => {
  const transport = useMemo(
    () => new AssistantChatTransport({ api: "/api/ai/chat" }),
    [],
  );
  const runtime = useChatRuntime({ transport });
  
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantModal />
    </AssistantRuntimeProvider>
  );
};
