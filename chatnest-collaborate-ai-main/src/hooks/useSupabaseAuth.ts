
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "@/hooks/use-toast";

export function useSupabaseAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ id: string; email: string | null; username: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth
  useEffect(() => {
    // CORRECT: Destructure with "data"
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0); // avoid event loop deadlock
      } else {
        setProfile(null);
      }
    });

    // Initial load
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    function fetchProfile(uid: string) {
      supabase
        .from("profiles")
        .select("id,email,username")
        .eq("id", uid)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) setProfile(data);
          setLoading(false);
        });
    }

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line
  }, []);

  // Login
  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) throw error;
    },
    []
  );

  // Logout
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  // Signup
  const signUp = useCallback(
    async (email: string, password: string, username?: string) => {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      setLoading(false);
      if (error) throw error;
    },
    []
  );

  return { session, user, profile, loading, signIn, signUp, signOut };
}
