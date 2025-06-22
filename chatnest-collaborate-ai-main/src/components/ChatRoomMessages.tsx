
import React, { RefObject } from "react";

type MessageType = {
  id: string;
  author: string;
  content: string;
  isGPT: boolean;
};

type Props = {
  messages: MessageType[];
  loading: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
};

const ChatRoomMessages: React.FC<Props> = ({ messages, loading, messagesEndRef }) => (
  <div className="w-full max-w-xl flex flex-col gap-7 md:gap-9 xl:gap-10 mx-auto px-1 md:px-6 flex-1 min-h-0">
    {loading ? (
      <div className="text-center text-muted-foreground py-12">
        <span className="inline-flex items-center">
          <svg className="animate-spin mr-2 text-accent" width={20} height={20} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading chat...
        </span>
      </div>
    ) : (
      <>
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`rounded-2xl px-4 md:px-6 py-3 shadow-md flex flex-col gap-1 max-w-[90%] md:max-w-[75%] xl:max-w-[68%]
              ${msg.isGPT
                ? "self-start bg-accent text-accent-foreground animate-fade-in"
                : "self-end bg-sidebar text-sidebar-foreground animate-fade-in"
              }
              transition-colors duration-300
            `}
            style={{
              marginTop: i === 0 ? 0 : 8,
              marginBottom: i === messages.length - 1 ? 0 : 8,
            }}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-muted-foreground tracking-tight">
                {msg.author}
              </span>
              {msg.isGPT && (
                <span className="ml-2 text-[10px] text-destructive bg-destructive-foreground/10 px-2 py-0.5 rounded-full font-medium">
                  AI
                </span>
              )}
            </div>
            <span className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </>
    )}
  </div>
);

export default ChatRoomMessages;
