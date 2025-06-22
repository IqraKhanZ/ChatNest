import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/components/ui/use-toast";
import ChatRoomHeader from "@/components/ChatRoomHeader";
import ChatRoomMessages from "@/components/ChatRoomMessages";
import ChatRoomInput from "@/components/ChatRoomInput";

type MessageType = {
  id: string;
  author: string;
  content: string;
  isGPT: boolean;
};

export default function ChatRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const { profile, session } = useSupabaseAuth();
  useEffect(() => {
  if (session?.access_token && session?.refresh_token) {
    supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
  }
}, [session]);

  const [room, setRoom] = useState<{ title: string; passkey: string } | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (!session || !roomId) return;

      try {
        const { data: r } = await supabase
          .from("chatrooms")
          .select("title, passkey")
          .eq("id", roomId)
          .maybeSingle();
        setRoom(r);

        const { data: msgs, error: msgsError } = await supabase
          .from("messages")
          .select("id, content, is_gpt, user_id, created_at")
          .eq("chatroom_id", roomId)
          .order("created_at", { ascending: true })
          .limit(50);

        if (msgsError) {
          console.error("Error fetching messages:", msgsError);
          toast({ title: "Error loading messages", description: msgsError.message, variant: "destructive" });
          return;
        }

        const authorMap: Record<string, string> = {};
        if (msgs && msgs.length > 0) {
          const userIds = [...new Set(msgs.filter((msg) => !msg.is_gpt && msg.user_id).map((msg) => msg.user_id))].filter(Boolean);

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, username")
              .in("id", userIds);
            (profiles || []).forEach((p) => {
              authorMap[p.id] = p.username || "Anonymous";
            });
          }
        }

        setMessages(
          (msgs || []).map((msg) => ({
            id: msg.id,
            author: msg.is_gpt ? "GPT-4" : authorMap[msg.user_id] || "Anonymous",
            content: msg.content,
            isGPT: !!msg.is_gpt,
          }))
        );
      } catch (error) {
        console.error("Error in fetchData:", error);
        toast({ title: "Error", description: "Failed to load chat data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [roomId, session]);

  useEffect(() => {
    if (!roomId || !session) return;

    const channelName = `messages-${roomId}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chatroom_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new;
          let authorName = "Anonymous";

          if (!newMsg.is_gpt && newMsg.user_id) {
            const { data: authorProfile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", newMsg.user_id)
              .maybeSingle();
            authorName = authorProfile?.username || "Anonymous";
          } else if (newMsg.is_gpt) {
            authorName = "GPT-4";
          }

          const messageToAdd: MessageType = {
            id: newMsg.id,
            author: authorName,
            content: newMsg.content,
            isGPT: !!newMsg.is_gpt,
          };

          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === messageToAdd.id);
            if (!exists) {
              return [...prev, messageToAdd];
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, session]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !profile?.id || !roomId || sending) return;

    const messageContent = input.trim();
    setSending(true);
    setInput("");

    const optimisticMessage: MessageType = {
      id: `temp-${Date.now()}`,
      author: profile.username || "You",
      content: messageContent,
      isGPT: false,
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const { error } = await supabase.from("messages").insert({
        content: messageContent,
        user_id: profile.id,
        chatroom_id: roomId,
        is_gpt: false,
      });

      if (error) {
        throw error;
      }
    } catch (err: any) {
      toast({
        title: "Message send failed",
        description: err.message || "Could not send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-tr from-[#2A0D11] to-[#3E0F14] transition-colors duration-300">
      <ChatRoomHeader
        roomTitle={room?.title}
        roomPasskey={room?.passkey}
        loading={loading}
        onBack={() => navigate("/dashboard")}
        roomId={roomId}
      />
      <main className="flex-1 min-h-0 overflow-y-auto flex justify-center bg-card/80 relative">
        <ChatRoomMessages messages={messages} loading={loading} messagesEndRef={messagesEndRef} />
      </main>
      <ChatRoomInput
        input={input}
        onInputChange={setInput}
        onSend={handleSend}
        sending={sending}
        disabled={!profile}
        placeholder={profile ? "Type your message…" : "Log in to chat"}
      />
    </div>
  );
}
