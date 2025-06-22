
-- 1. Enable required extensions for UUID support if not existing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create 'profiles' table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Allow all users to SELECT all profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles: anyone can read" ON public.profiles
FOR SELECT
USING (true);

-- Only allow users to INSERT or UPDATE their own profile
CREATE POLICY "Profiles: users can insert own" ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: users can update own" ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- 3. Create 'chatrooms' table
CREATE TABLE public.chatrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  passkey TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.chatrooms ENABLE ROW LEVEL SECURITY;

-- Anyone can read chatrooms
CREATE POLICY "Chatrooms: anyone can read" ON public.chatrooms
FOR SELECT
USING (true);

-- Only creator can update or delete the room
CREATE POLICY "Chatrooms: only creator updates" ON public.chatrooms
FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Chatrooms: only creator deletes" ON public.chatrooms
FOR DELETE
USING (auth.uid() = creator_id);

-- Anyone logged in can create a chatroom
CREATE POLICY "Chatrooms: any logged in user inserts" ON public.chatrooms
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 4. Create 'chatroom_members' table
CREATE TABLE public.chatroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id UUID REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.chatroom_members ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own membership
CREATE POLICY "Chatroom members: user can read own" ON public.chatroom_members
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Chatroom members: user can insert own" ON public.chatroom_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chatroom members: user can update own" ON public.chatroom_members
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Chatroom members: user can delete own" ON public.chatroom_members
FOR DELETE
USING (auth.uid() = user_id);

-- 5. Create 'messages' table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatroom_id UUID REFERENCES public.chatrooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_gpt BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- All chatroom members can read messages (membership checked via join)
CREATE POLICY "Messages: chatroom members can read" ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chatroom_members
    WHERE chatroom_members.chatroom_id = messages.chatroom_id
    AND chatroom_members.user_id = auth.uid()
  )
);

-- Members can insert messages
CREATE POLICY "Messages: only members can insert" ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chatroom_members
    WHERE chatroom_members.chatroom_id = messages.chatroom_id
    AND chatroom_members.user_id = auth.uid()
  )
  OR is_gpt = true
);

-- 6. Function + trigger: populate 'profiles' at user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  reg_email text;
  reg_username text;
BEGIN
  IF NEW.raw_user_meta_data ? 'username' AND NEW.raw_user_meta_data->>'username' IS NOT NULL THEN
    reg_username := NEW.raw_user_meta_data->>'username';
  ELSE
    reg_username := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  reg_email := NEW.email;
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, reg_email, reg_username);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();

-- 7. (Optional) Update 'updated_at' on profile changes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
