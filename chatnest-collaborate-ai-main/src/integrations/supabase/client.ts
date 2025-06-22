import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ecjxhtnpsvtkdiwlxext.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjanhodG5wc3Z0a2Rpd2x4ZXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4OTE2ODAsImV4cCI6MjA2NTQ2NzY4MH0.0L0uy2QqYAYhqZiMkjvjIMyBN9OODFLQKcv-OFsLirU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
