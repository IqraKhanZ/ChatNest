
-- 1. Invitations table: tracks invitations to join a chatroom by email
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  chatroom_id UUID REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS: Inviter can see their sent invites
CREATE POLICY "Inviter can view own invites"
  ON public.invitations FOR SELECT
  USING (inviter_id = auth.uid());

-- RLS: Invitee can see invites sent to their email
CREATE POLICY "Invitee can see if email matches theirs"
  ON public.invitations FOR SELECT
  USING (invitee_email = auth.email());

-- RLS: Inviter can insert invites
CREATE POLICY "Inviter can insert invite"
  ON public.invitations FOR INSERT
  WITH CHECK (inviter_id = auth.uid());

-- Allow updating status if you are inviter or the invited email
CREATE POLICY "Inviter or invitee can update status"
  ON public.invitations FOR UPDATE
  USING (inviter_id = auth.uid() OR invitee_email = auth.email());

-- Optionally, if you want explicit join requests (users request to join, owners approve):
CREATE TABLE public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  chatroom_id UUID REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Requester can view/request their own join requests
CREATE POLICY "Requester can view own join requests"
  ON public.join_requests FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "Requester can insert join request"
  ON public.join_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- Room creator can see/pick up join requests for their rooms
CREATE POLICY "Room owner can see join requests"
  ON public.join_requests FOR SELECT
  USING (
    chatroom_id IN (SELECT id FROM public.chatrooms WHERE creator_id = auth.uid())
  );

-- Room owner can update join requests for their rooms (approve/reject)
CREATE POLICY "Room owner can update join requests"
  ON public.join_requests FOR UPDATE
  USING (
    chatroom_id IN (SELECT id FROM public.chatrooms WHERE creator_id = auth.uid())
  );
