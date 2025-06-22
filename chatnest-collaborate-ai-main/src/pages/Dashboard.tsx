import React, { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Form, FormItem, FormLabel, FormControl, FormField, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { Loader2Icon, KeyRound, PlusCircle } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type RoomType = {
  id: string;
  name: string;
  members: number;
  youAre: string;
  passkey: string;
};

function generatePasskey(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let passkey = "";
  for (let i = 0; i < length; i++) {
    passkey += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return passkey;
}

export default function Dashboard() {
  const { session, profile, loading } = useSupabaseAuth();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(0);

  // Modal open states
  const [openCreate, setOpenCreate] = useState(false);
  const [openJoin, setOpenJoin] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/");
    }
  }, [session, loading, navigate]);

  useEffect(() => {
    async function fetchRooms() {
      if (!session) {
        setRooms([]);
        setLoadingRooms(false);
        return;
      }
      setLoadingRooms(true);

      const { data: memberships, error: membershipsError } = await supabase
        .from("chatroom_members")
        .select("chatroom_id")
        .eq("user_id", profile?.id);

      if (membershipsError) {
        toast({
          title: "Error loading rooms.",
          description: membershipsError.message,
          variant: "destructive",
        });
        setRooms([]);
        setLoadingRooms(false);
        return;
      }

      const chatroomIds = memberships?.map((m) => m.chatroom_id) ?? [];

      if (chatroomIds.length === 0) {
        setRooms([]);
        setLoadingRooms(false);
        return;
      }

      const { data: chatrooms, error: chatroomsError } = await supabase
        .from("chatrooms")
        .select("id, title, passkey, creator_id")
        .in("id", chatroomIds);

      if (chatroomsError) {
        toast({
          title: "Error loading chatrooms.",
          description: chatroomsError.message,
          variant: "destructive",
        });
        setRooms([]);
        setLoadingRooms(false);
        return;
      }

      const roomsWithCounts: RoomType[] = await Promise.all(
        chatrooms.map(async (room) => {
          const { count } = await supabase
            .from("chatroom_members")
            .select("*", { count: "exact", head: true })
            .eq("chatroom_id", room.id);
          return {
            id: room.id,
            name: room.title,
            members: count || 1,
            youAre: room.creator_id === profile?.id ? "Owner" : "Member",
            passkey: room.passkey,
          };
        })
      );

      setRooms(roomsWithCounts);
      setLoadingRooms(false);
    }
    if (profile?.id) fetchRooms();
  }, [session, profile?.id, refreshFlag]);

  const createForm = useForm<{ title: string }>({ defaultValues: { title: "" } });
  const [creating, setCreating] = useState(false);

  async function handleCreateRoom(data: { title: string }) {
    setCreating(true);
    try {
      const passkey = generatePasskey(8);

      const { data: newRoom, error: createError } = await supabase
        .from("chatrooms")
        .insert([{ title: data.title, passkey, creator_id: profile?.id }])
        .select()
        .maybeSingle();

      if (createError || !newRoom) {
        toast({
          title: "Error creating room.",
          description: createError?.message || "Room could not be created.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      const { error: memberError } = await supabase
        .from("chatroom_members")
        .insert([{ chatroom_id: newRoom.id, user_id: profile?.id }]);

      if (memberError) {
        toast({
          title: "Room created, but failed to add you as a member.",
          description: memberError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "New room created!",
          description: `Room "${data.title}" was created.`,
        });
      }
      setRefreshFlag((f) => f + 1);
      setOpenCreate(false);
      createForm.reset();
    } finally {
      setCreating(false);
    }
  }

  const joinForm = useForm<{ passkey: string }>({ defaultValues: { passkey: "" } });
  const [joining, setJoining] = useState(false);

  async function handleJoinRoom(data: { passkey: string }) {
    setJoining(true);
    try {
      const { data: room, error: lookupError } = await supabase
        .from("chatrooms")
        .select("id, title")
        .eq("passkey", data.passkey)
        .maybeSingle();

      if (lookupError || !room) {
        toast({
          title: "Not found",
          description: "No room matches that passkey.",
          variant: "destructive",
        });
        setJoining(false);
        return;
      }

      const { count } = await supabase
        .from("chatroom_members")
        .select("*", { head: true, count: "exact" })
        .eq("chatroom_id", room.id)
        .eq("user_id", profile?.id);

      if (count && count > 0) {
        toast({
          title: "You're already a member!",
          description: `You're already in "${room.title}".`,
        });
        setJoining(false);
        setOpenJoin(false);
        joinForm.reset();
        return;
      }

      const { error: joinError } = await supabase
        .from("chatroom_members")
        .insert([{ chatroom_id: room.id, user_id: profile?.id }]);

      if (joinError) {
        toast({
          title: "Join failed",
          description: joinError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Joined!",
          description: `You joined "${room.title}".`,
        });
      }
      setRefreshFlag((f) => f + 1);
      setOpenJoin(false);
      joinForm.reset();
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-[#1E0B0B] via-[#2A0D11] to-[#3B0F15] min-h-screen w-full flex flex-col transition-colors duration-300">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-start pt-10 px-2 max-w-3xl mx-auto w-full">
        {/* Title/Logo */}
        <div className="mb-6 flex flex-col items-center">
          <Logo size={44} />
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-[#F4D6D6] to-[#AD4D5B] bg-clip-text text-transparent mt-1 tracking-tight text-center">ChatNest</h1>
        </div>
        
        {/* User card */}
        <section className="bg-[#3B0F15] rounded-2xl shadow-lg p-7 mb-8 w-full max-w-lg flex flex-col gap-2 border border-[#611A1A]">
          <span className="text-lg md:text-xl font-semibold text-[#F4D6D6] mb-1">
            Welcome, <span className="text-[#AD4D5B]">{profile?.username || "Anonymous"}</span>
          </span>
          <p className="text-[#C86B6B] text-sm mb-2">{profile?.email || ""}</p>
        </section>
        
        {/* Room actions and list heading */}
        <section className="w-full max-w-lg mt-2 mb-2">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold text-[#F4D6D6] tracking-tight mb-1 md:mb-0">Your Chat Rooms</h3>
            <div className="flex gap-3 w-full md:w-auto">
              {/* NEW ROOM */}
              <Sheet open={openCreate} onOpenChange={setOpenCreate}>
                <SheetTrigger asChild>
                  <Button
                    className="bg-[#8E3A43] text-[#F4D6D6] hover:bg-[#A0414B] rounded-xl font-bold shadow-md flex-1 md:flex-none py-2 px-5 md:px-6 text-base"
                  >
                    <PlusCircle size={18} className="mr-2" />
                    New Room
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>
                      <span className="flex items-center gap-2">
                        <PlusCircle size={18} /> New Room
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  <Form {...createForm}>
                    <form
                      onSubmit={createForm.handleSubmit(handleCreateRoom)}
                      className="space-y-5 mt-7"
                    >
                      <FormField
                        control={createForm.control}
                        name="title"
                        rules={{
                          required: "Room title is required",
                          minLength: { value: 3, message: "At least 3 characters" },
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. Team Sync"
                                autoFocus
                                maxLength={32}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <SheetFooter>
                        <Button type="submit" className="w-full" disabled={creating}>
                          {creating ? (
                            <Loader2Icon className="animate-spin mr-2" />
                          ) : (
                            <PlusCircle className="mr-2" />
                          )}
                          Create Room
                        </Button>
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            className="w-full mt-2"
                            type="button"
                          >
                            Cancel
                          </Button>
                        </SheetClose>
                      </SheetFooter>
                    </form>
                  </Form>
                </SheetContent>
              </Sheet>
              
              {/* JOIN BY PASSKEY */}
              <Sheet open={openJoin} onOpenChange={setOpenJoin}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-[#8E3A43] text-[#8E3A43] hover:bg-[#8E3A43]/10 rounded-xl font-bold flex-1 md:flex-none py-2 px-5 md:px-6 text-base"
                  >
                    <KeyRound size={18} className="mr-2" />
                    Join by Passkey
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>
                      <span className="flex items-center gap-2">
                        <KeyRound size={18} /> Join a Room
                      </span>
                    </SheetTitle>
                  </SheetHeader>
                  <Form {...joinForm}>
                    <form
                      onSubmit={joinForm.handleSubmit(handleJoinRoom)}
                      className="space-y-5 mt-8"
                    >
                      <FormField
                        control={joinForm.control}
                        name="passkey"
                        rules={{
                          required: "Enter a passkey",
                          minLength: { value: 6, message: "Minimum 6 characters" },
                        }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Passkey</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. ALPHA123"
                                autoFocus
                                maxLength={12}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <SheetFooter>
                        <Button type="submit" className="w-full" disabled={joining}>
                          {joining ? (
                            <Loader2Icon className="animate-spin mr-2" />
                          ) : (
                            <KeyRound className="mr-2" />
                          )}
                          Join Room
                        </Button>
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            className="w-full mt-2"
                            type="button"
                          >
                            Cancel
                          </Button>
                        </SheetClose>
                      </SheetFooter>
                    </form>
                  </Form>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          {/* Room list */}
          <div className="flex flex-col gap-5">
            {loadingRooms ? (
              <div className="p-12 flex items-center justify-center text-[#C86B6B]">
                <Loader2Icon className="animate-spin mr-2 text-[#8E3A43]" /> Loading rooms...
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-12 text-center text-[#C86B6B] rounded-xl bg-[#3B0F15] border border-[#611A1A] mt-2">
                You have no rooms yet. <br />
                <span className="text-xs text-[#C86B6B]/70">Create or join a room to get started!</span>
              </div>
            ) : (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex flex-col md:flex-row items-stretch md:items-center justify-between px-6 py-5 rounded-xl bg-[#3B0F15] border border-[#611A1A] shadow-sm transition-colors duration-300 group hover:bg-[#4C1014]"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-[#AD4D5B] group-hover:underline">
                      {room.name}
                    </span>
                    <span className="text-xs text-[#C86B6B] mt-0.5">
                      {room.members} member{room.members === 1 ? "" : "s"}
                      &nbsp;·&nbsp;You: {room.youAre}
                      &nbsp;·&nbsp;
                      <span className="tracking-wider text-[#F4D6D6] font-mono font-semibold">{room.passkey}</span>
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4 md:mt-0">
                    <Button
                      variant="ghost"
                      className="text-[#AD4D5B] hover:text-[#F4D6D6] hover:bg-[#8E3A43]/20 font-semibold text-sm px-5 md:px-6 ml-auto md:ml-0"
                      onClick={() => navigate(`/room/${room.id}`)}
                    >
                      Enter
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
