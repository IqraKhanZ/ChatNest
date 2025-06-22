
import React, { useEffect } from "react";
import Logo from "@/components/Logo";
import AuthForm from "@/components/AuthForm";
import { motion } from "framer-motion";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { session, loading } = useSupabaseAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate("/dashboard");
    }
  }, [session, loading, navigate]);

  return (
    <div
      className="min-h-screen relative flex justify-center items-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1A0A0A 0%, #140505 30%, #2C0F11 70%, #1A0A0A 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Subtle radial light effect for depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-red-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-pink-900/8 rounded-full blur-3xl" />
      </div>

      <main className="z-10 relative w-full max-w-xl flex flex-col items-center px-6">
        <motion.div
          className="mb-10"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 90, damping: 14 }}
        >
          <Logo size={56} />
        </motion.div>

        <motion.h1
          className="text-4xl md:text-5xl font-bold mb-3 text-center tracking-tight"
          style={{ color: "#FBEAEA" }}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
        >
          ChatNest: Collaborate with <span style={{ color: "#D47272" }}>AI</span>
        </motion.h1>

        <motion.p
          className="mb-10 mt-2 text-lg text-center max-w-lg leading-relaxed"
          style={{ color: "#DDBBBB" }}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
        >
          The multiplayer ChatGPT for teams — Start or join shared chat rooms for real-time, collaborative conversations with AI.
        </motion.p>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="w-full max-w-sm"
        >
          <AuthForm />
        </motion.div>

        <motion.div 
          className="mt-12 text-xs text-center"
          style={{ color: "#AA6E6E" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          Built with Supabase, GPT-4, and Tailwind CSS
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
