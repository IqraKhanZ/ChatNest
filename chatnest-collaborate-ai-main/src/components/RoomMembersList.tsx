
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Profile = {
  id: string;
  username: string | null;
  email: string | null;
};

type RoomMembersListProps = {
  roomId: string;
};

const RoomMembersList: React.FC<RoomMembersListProps> = ({ roomId }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      const { data: members } = await supabase
        .from("chatroom_members")
        .select("user_id")
        .eq("chatroom_id", roomId);

      if (!members || members.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }
      const userIds = members.map((m) => m.user_id).filter(Boolean);

      if (userIds.length) {
        const { data: memberProfiles } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", userIds);

        setProfiles(memberProfiles || []);
      } else {
        setProfiles([]);
      }
      setLoading(false);
    }
    fetchMembers();
  }, [roomId]);

  return (
    <section className="px-4 py-3 bg-transparent w-full">
      <h4 className="font-bold text-[#FBEAEA] text-lg mb-2">People in this room</h4>
      <div className="flex flex-col gap-3">
        {loading ? (
          <span className="text-[#D47272] text-sm">Loading...</span>
        ) : profiles.length === 0 ? (
          <span className="text-[#D47272] text-sm">
            No one here yet.
          </span>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center gap-3 bg-[#3B0F15] border border-[#611A1A] rounded-xl p-2 pr-4"
            >
              <Avatar className="w-9 h-9 bg-[#8E3A43] border border-[#611A1A] text-[#FFECEC]">
                <AvatarFallback>
                  {profile.username?.slice(0, 2).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-[#FBEAEA] text-sm truncate max-w-xs">
                  {profile.username || "Anonymous"}
                </span>
                <span className="text-xs text-[#D47272] truncate">{profile.email || ""}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default RoomMembersList;

