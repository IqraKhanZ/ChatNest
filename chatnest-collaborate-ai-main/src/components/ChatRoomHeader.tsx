
import React from "react";
import { ArrowLeft, MessageSquare, Users, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import RoomMembersList from "@/components/RoomMembersList";

type Props = {
  roomTitle?: string;
  roomPasskey?: string;
  loading: boolean;
  onBack: () => void;
  roomId?: string; // pass the room id to the header so member list works
};

const ChatRoomHeader: React.FC<Props> = ({
  roomTitle,
  roomPasskey,
  loading,
  onBack,
  roomId, // optional, but needed for the popover to work
}) => {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 px-4 md:px-8 py-4 bg-sidebar border-b border-sidebar-border shadow-lg transition-colors duration-300">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-accent hover:bg-accent/10 mr-2"
        aria-label="Back to dashboard"
        onClick={onBack}
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <MessageSquare className="w-6 h-6 text-accent" />
      <span className="text-foreground text-lg font-bold truncate max-w-[30vw]">
        Room:{" "}
        {loading ? <Loader2Icon className="animate-spin inline ml-2 text-muted-foreground" /> : roomTitle}
      </span>
      {roomPasskey ? (
        <span className="bg-sidebar-accent text-sidebar-accent-foreground text-xs rounded-lg px-2 py-1 ml-3 font-mono">
          {roomPasskey}
        </span>
      ) : null}
      {/* Popover for room members */}
      <div className="ml-auto">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-accent hover:bg-accent/10"
              aria-label="Show room members"
              type="button"
            >
              <Users className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="bg-[#2C0F11] border-[#7A2E2E] p-0 w-80 sm:w-96 shadow-2xl"
          >
            {roomId ? (
              <RoomMembersList roomId={roomId} />
            ) : (
              <div className="text-[#FBEAEA] px-4 py-3 text-sm">No room information.</div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default ChatRoomHeader;
