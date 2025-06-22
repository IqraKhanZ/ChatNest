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
      if (!session) return;

      // 1. Get room info
      const { data: r } = await supabase
        .from("chatrooms")
        .select("title, passkey")
        .eq("id", roomId)
        .maybeSingle();
      setRoom(r);

      // 2. Fetch last 30 messages for this room
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, content, is_gpt, user_id, created_at")
        .eq("chatroom_id", roomId)
        .order("created_at", { ascending: true })
        .limit(30);

      // 3. For each message, get author name
      const authorMap: Record<string, string> = {};
      if (msgs && msgs.length > 0) {
        const userIds = [
          ...new Set(msgs.filter((msg) => !msg.is_gpt).map((msg) => msg.user_id)),
        ].filter(Boolean);
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
      setLoading(false);
    }
    fetchData();
  }, [roomId, session]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!roomId || !session) return;

    console.log(`[ChatRoom] Setting up real-time subscription for room: ${roomId}`);

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chatroom_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('[ChatRoom] New message received via real-time:', payload);
          
          const newMsg = payload.new;
          let authorName = "Anonymous";
          
          // Get author name for non-GPT messages
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

          // Only add the message if it's not already in our local state
          // (to prevent duplicates when user sends their own message)
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === messageToAdd.id);
            if (exists) {
              console.log('[ChatRoom] Message already exists, skipping duplicate');
              return prev;
            }
            console.log('[ChatRoom] Adding new message to UI:', messageToAdd);
            return [...prev, messageToAdd];
          });
        }
      )
      .subscribe((status) => {
        console.log('[ChatRoom] Real-time subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[ChatRoom] Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [roomId, session]);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !profile?.id || !roomId) return;
    setSending(true);

    // 1. Insert user message in Supabase
    const { data: userMsg, error: userError } = await supabase
      .from("messages")
      .insert({
        content: input,
        user_id: profile.id,
        chatroom_id: roomId,
        is_gpt: false,
      })
      .select("id, created_at")
      .maybeSingle();

    if (userError) {
      toast({
        title: "Failed to send message",
        description: userError.message || "Could not save your message.",
        variant: "destructive"
      });
      setSending(false);
      return;
    }

    // Note: We don't manually add the message to state here anymore
    // because the real-time subscription will handle it
    setInput("");

    // 2. Ask GPT (using ask-gpt function) and show reply
    try {
      // Show a loader "AI is typing..." message
      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-gpt-loading`,
          author: "GPT-4",
          content: "🤖 AI is typing...",
          isGPT: true,
        },
      ]);

      // Call edge function (backend endpoint)
      const res = await fetch(
        "https://ecjxhtnpsvtkdiwlxext.supabase.co/functions/v1/ask-gpt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: input }),
        }
      );

      // Remove loader message
      setMessages(prev => prev.filter(msg => !msg.id.endsWith("-gpt-loading")));

      if (!res.ok) {
        const errorData = await res.json();
        toast({
          title: "AI Error",
          description: errorData.error || "Failed to get reply from AI.",
          variant: "destructive"
        });
        setMessages(prev => [
          ...prev,
          {
            id: `${Date.now()}-gpt-error`,
            author: "GPT-4 (error)",
            content: "⚠️ There was a problem getting a reply.",
            isGPT: true,
          },
        ]);
        setSending(false);
        return;
      }

      const { reply } = await res.json();

      // Insert GPT reply in database
      const { data: gptMsg, error: gptError } = await supabase
        .from("messages")
        .insert({
          content: reply,
          user_id: null,
          chatroom_id: roomId,
          is_gpt: true,
        })
        .select("id, created_at")
        .maybeSingle();

      if (gptError) {
        toast({
          title: "Failed to store AI reply",
          description: gptError.message,
          variant: "destructive"
        });
      }

      // Note: We don't manually add the GPT message to state here anymore
      // because the real-time subscription will handle it
    } catch (err: any) {
      setMessages(prev => prev.filter(msg => !msg.id.endsWith("-gpt-loading")));
      toast({
        title: "Server error",
        description: err.message || "Failed to connect to AI.",
        variant: "destructive"
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-gpt-error`,
          author: "GPT-4 (error)",
          content: "⚠️ There was a problem getting a reply.",
          isGPT: true,
        },
      ]);
    }
    setSending(false);
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
      {/* Message list (scrollable area) */}
      <main className="flex-1 min-h-0 overflow-y-auto flex justify-center bg-card/80 relative">
        <ChatRoomMessages
          messages={messages}
          loading={loading}
          messagesEndRef={messagesEndRef}
        />
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
