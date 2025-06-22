# 💬 ChatNest — Collaborative AI Chatrooms

ChatNest is a real-time collaborative chatroom platform where multiple authenticated users can join private rooms and interact directly with an AI (ChatGPT) together — just like editing a shared Google Doc, but for AI conversations. Users can create an account, log in, create or join chatrooms using passkeys, and chat with GPT collaboratively. Each chatroom is private, and only accessible to users who are invited. Messages appear in real-time, and each user sees only the chatrooms they are part of. The design uses a dark emerald green color scheme with gradient effects on the login page and a modern UI layout with white and amber accents.

The app uses React and Tailwind CSS for the frontend, Supabase for backend services including authentication, real-time messaging, and data storage, and the OpenAI API to enable GPT-powered responses. Once a user logs in, they remain signed in until they manually log out via the profile section. The chatroom experience is seamless, with optimistic UI updates and real-time synchronization so that no user needs to refresh the page to see their own or others' messages.

## Tech Stack

- Frontend: React + Tailwind CSS
- Backend: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- AI: OpenAI GPT API
- Deployment: Can be hosted on Vercel, Netlify, or Supabase Hosting

## How to Run Locally

1. Clone the repository:
```bash
git clone https://github.com/<your-username>/ChatNest.git
cd ChatNest

