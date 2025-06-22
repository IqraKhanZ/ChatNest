
-- 1. Security definer function to get a user's chatrooms
CREATE OR REPLACE FUNCTION public.chatrooms_for_user(uid uuid)
RETURNS TABLE(chatroom_id uuid)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT chatroom_id FROM public.chatroom_members WHERE user_id = uid
$$;

-- 2. Drop faulty recursive policy (if present)
DROP POLICY IF EXISTS "Members can see other members in the same room" ON public.chatroom_members;

-- 3. Create new policy using the function
CREATE POLICY "Members can see other members in the same room"
  ON public.chatroom_members
  FOR SELECT
  USING (
    chatroom_id IN (
      SELECT chatroom_id FROM public.chatrooms_for_user(auth.uid())
    )
  );
