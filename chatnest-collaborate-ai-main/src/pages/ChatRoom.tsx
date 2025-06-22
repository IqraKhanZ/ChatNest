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
      if (!session || !roomId) return;

      try {
        // 1. Get room info
        const { data: r } = await supabase
          .from("chatrooms")
          .select("title, passkey")
          .eq("id", roomId)
          .maybeSingle();
        setRoom(r);

        // 2. Fetch last 50 messages for this room (increased from 30)
        const { data: msgs, error: msgsError } = await supabase
          .from("messages")
          .select("id, content, is_gpt, user_id, created_at")
          .eq("chatroom_id", roomId)
          .order("created_at", { ascending: true })
          .limit(50);

        if (msgsError) {
          console.error("Error fetching messages:", msgsError);
          toast({
            title: "Error loading messages",
            description: msgsError.message,
            variant: "destructive"
          });
          return;
        }

        // 3. For each message, get author name
        const authorMap: Record<string, string> = {};
        if (msgs && msgs.length > 0) {
          const userIds = [
            ...new Set(msgs.filter((msg) => !msg.is_gpt && msg.user_id).map((msg) => msg.user_id)),
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
      } catch (error) {
        console.error("Error in fetchData:", error);
        toast({
          title: "Error",
          description: "Failed to load chat data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [roomId, session]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!roomId || !session) return;

    console.log(`[ChatRoom] Setting up real-time subscription for room: ${roomId}`);

    // Create a unique channel name to avoid conflicts
    const channelName = `messages-${roomId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
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

          // Add the message if it's not already in our local state
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
        if (status === 'SUBSCRIBED') {
          console.log('[ChatRoom] Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[ChatRoom] Real-time subscription error');
          toast({
            title: "Connection Error",
            description: "Real-time updates may not work properly",
            variant: "destructive"
          });
        }
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
    if (!input.trim() || !profile?.id || !roomId || sending) return;
    
    const messageContent = input.trim();
    setSending(true);
    setInput(""); // Clear input immediately for better UX

    try {
      // 1. Insert user message in Supabase
      const { data: userMsg, error: userError } = await supabase
        .from("messages")
        .insert({
          content: messageContent,
          user_id: profile.id,
          chatroom_id: roomId,
          is_gpt: false,
        })
        .select("id, created_at")
        .maybeSingle();

      if (userError) {
        console.error("Error inserting user message:", userError);
        toast({
          title: "Failed to send message",
          description: userError.message || "Could not save your message.",
          variant: "destructive"
        });
        setInput(messageContent); // Restore input on error
        setSending(false);
        return;
      }

      console.log("User message inserted successfully:", userMsg);

      // 2. Show AI typing indicator
      const typingId = `${Date.now()}-gpt-loading`;
      setMessages(prev => [
        ...prev,
        {
          id: typingId,
          author: "GPT-4",
          content: "🤖 AI is typing...",
          isGPT: true,
        },
      ]);

      // 3. Call GPT API
      const res = await fetch(
        "https://ecjxhtnpsvtkdiwlxext.supabase.co/functions/v1/ask-gpt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: messageContent }),
        }
      );

      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingId));

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("GPT API error:", errorData);
        toast({
          title: "AI Error",
          description: errorData.error || "Failed to get reply from AI.",
          variant: "destructive"
        });
        
        // Show error message in chat
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
      console.log("GPT reply received:", reply);

      // 4. Insert GPT reply in database
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
        console.error("Error inserting GPT message:", gptError);
        toast({
          title: "Failed to store AI reply",
          description: gptError.message,
          variant: "destructive"
        });
      } else {
        console.log("GPT message inserted successfully:", gptMsg);
      }

    } catch (err: any) {
      console.error("Error in handleSend:", err);
      setMessages(prev => prev.filter(msg => !msg.id.endsWith("-gpt-loading")));
      toast({
        title: "Server error",
        description: err.message || "Failed to connect to AI.",
        variant: "destructive"
      });
      
      // Show error message in chat
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-gpt-error`,
          author: "GPT-4 (error)",
          content: "⚠️ There was a problem getting a reply.",
          isGPT: true,
        },
      ]);
      setInput(messageContent); // Restore input on error
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
