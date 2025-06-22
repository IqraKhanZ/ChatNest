
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const sendEmail = async (to: string, inviter: string, passkey: string, roomName: string) => {
  if (!RESEND_API_KEY) throw new Error("No RESEND_API_KEY (environment variable)");
  const url = "https://api.resend.com/emails";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ChatNest <onboarding@resend.dev>",
      to,
      subject: `You've been invited to join ${roomName} on ChatNest!`,
      html: `
        <h1>You've been invited by ${inviter}</h1>
        <p>To join the chatroom "<strong>${roomName}</strong>", open ChatNest and use this passkey:</p>
        <div style="font-family: monospace; font-size: 1.5em;">${passkey}</div>
        <br/>
        <p>Or just paste this key when you click "Join by Passkey".</p>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[send-invite] Failed to send email. Status:", res.status, "Response:", err);
    throw new Error("Failed to send email: " + err);
  }
  const emailJson = await res.json();
  console.log("[send-invite] Email sent successfully to", to, "result:", emailJson);
  return emailJson;
};

serve(async (req: Request) => {
  console.log("[send-invite] Incoming request method:", req.method, "url:", req.url);

  if (req.method === "OPTIONS") {
    console.log("[send-invite] Responding to OPTIONS.");
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.log("[send-invite] Method not allowed:", req.method);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const bodyText = await req.text();
    let body = {};
    try {
      body = JSON.parse(bodyText);
      console.log("[send-invite] Parsed JSON body:", body);
    } catch (err) {
      console.error("[send-invite] Invalid JSON received. Raw body:", bodyText);
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { to, inviter, passkey, roomName } = body as any;

    if (!to || !inviter || !passkey || !roomName) {
      console.error("[send-invite] Missing fields", { to, inviter, passkey, roomName });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await sendEmail(to, inviter, passkey, roomName);
    console.log("[send-invite] Email process complete, result:", result);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error("[send-invite] Catch error:", err.message || err);
    return new Response(JSON.stringify({ error: err.message || "Unknown internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
