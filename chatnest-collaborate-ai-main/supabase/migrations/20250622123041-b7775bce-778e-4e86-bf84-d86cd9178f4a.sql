
-- Enable real-time functionality for the messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add the messages table to the realtime publication so changes are broadcast
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
