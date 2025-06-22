
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (typeof message !== "string" || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        // You may optionally add:
        // "HTTP-Referer": "<your-site-url>", // for rate-limiting/tracking
        // "X-Title": "ChatNest", // optional, a friendly name
      },
      body: JSON.stringify({
        model: "openai/gpt-4o", // Default to gpt-4o; change as needed
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: message }
        ],
        max_tokens: 800,
      }),
    });

    if (!openRouterRes.ok) {
      const err = await openRouterRes.text();
      return new Response(JSON.stringify({ error: err }), {
        status: openRouterRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { choices } = await openRouterRes.json();
    const reply = choices?.[0]?.message?.content?.trim();

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
