
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

type AuthMode = "login" | "signup";

export default function AuthForm({
  onAuth,
  loading: externalLoading,
}: {
  onAuth?: (email: string, password: string, username?: string) => void;
  loading?: boolean;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const auth = useSupabaseAuth();

  const loading = externalLoading || localLoading || auth.loading;

  const handleSwitch = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || (mode === "signup" && !username)) {
      setError("All fields are required.");
      return;
    }

    setLocalLoading(true);
    try {
      if (mode === "signup") {
        await auth.signUp(email, password, username);
        toast({
          title: "Signup successful!",
          description: "Please check your email to confirm your account.",
        });
      } else {
        await auth.signIn(email, password);
        toast({ title: "Login successful!" });
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
    }
    setLocalLoading(false);
  };

  return (
    <Card 
      className="w-full max-w-sm rounded-xl shadow-2xl border"
      style={{ 
        backgroundColor: "#2C0F11",
        borderColor: "#5A2B2B",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }}
    >
      <form onSubmit={handleSubmit}>
        <CardContent className="flex flex-col gap-6 p-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: "#FBEAEA" }}>
              {mode === "login" ? "Welcome Back" : "Join ChatNest"}
            </h2>
            <p className="text-sm" style={{ color: "#DDBBBB" }}>
              {mode === "login" ? "Sign in to continue" : "Create your account"}
            </p>
          </div>

          <div className="space-y-4">
            {mode === "signup" && (
              <Input
                type="text"
                placeholder="Username"
                value={username}
                disabled={loading}
                autoComplete="username"
                onChange={e => setUsername(e.target.value)}
                className="h-11 rounded-md border transition-all duration-300 focus:ring-1 focus:ring-offset-0"
                style={{
                  backgroundColor: "#1E0B0B",
                  borderColor: "#5A2B2B",
                  color: "#F4D6D6",
                }}
              />
            )}
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              autoComplete="email"
              disabled={loading}
              onChange={e => setEmail(e.target.value)}
              className="h-11 rounded-md border transition-all duration-300 focus:ring-1 focus:ring-offset-0"
              style={{
                backgroundColor: "#1E0B0B",
                borderColor: "#5A2B2B",
                color: "#F4D6D6",
              }}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              disabled={loading}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={e => setPassword(e.target.value)}
              className="h-11 rounded-md border transition-all duration-300 focus:ring-1 focus:ring-offset-0"
              style={{
                backgroundColor: "#1E0B0B",
                borderColor: "#5A2B2B",
                color: "#F4D6D6",
              }}
            />
          </div>

          {error && (
            <div 
              className="text-sm rounded-md p-3 border"
              style={{
                color: "#D47272",
                backgroundColor: "rgba(212, 114, 114, 0.1)",
                borderColor: "rgba(212, 114, 114, 0.2)"
              }}
            >
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 p-6 pt-0">
          <Button
            type="submit"
            className="w-full font-semibold h-11 rounded-md transition-all duration-300 shadow-lg"
            disabled={loading}
            style={{
              backgroundColor: "#8E3A43",
              color: "#FFECEC",
              boxShadow: "0 4px 14px 0 rgba(142, 58, 67, 0.3)"
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "#B94F58";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "#8E3A43";
              }
            }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </Button>

          <button
            type="button"
            className="text-sm transition-colors duration-300 underline-offset-4 hover:underline"
            onClick={handleSwitch}
            disabled={loading}
            style={{ 
              color: "#AA6E6E",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.color = "#D47272";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.color = "#AA6E6E";
              }
            }}
          >
            {mode === "login"
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </CardFooter>
      </form>
    </Card>
  );
}
