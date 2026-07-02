import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useMemo, useState } from "react";
import { AssistantModal } from "./assistant-modal";

export const AIChat = () => {
  const [chatKey, setChatKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AIChatInner 
      key={chatKey} 
      onReset={() => setChatKey((k) => k + 1)} 
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    />
  );
};

const AIChatInner = ({ onReset, isOpen, setIsOpen }: { onReset: () => void, isOpen: boolean, setIsOpen: (o: boolean) => void }) => {
  const transport = useMemo(
    () => new AssistantChatTransport({ api: "/api/ai/chat" }),
    [],
  );
  const runtime = useChatRuntime({ transport });
  
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantModal onReset={onReset} isOpen={isOpen} setIsOpen={setIsOpen} />
    </AssistantRuntimeProvider>
  );
};
