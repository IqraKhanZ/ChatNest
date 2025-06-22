
-- Allow any user to view all members of a chatroom they belong to
CREATE POLICY "Members can see other members in the same room"
  ON public.chatroom_members
  FOR SELECT
  USING (
    chatroom_id IN (
      SELECT chatroom_id FROM public.chatroom_members WHERE user_id = auth.uid()
    )
  );
