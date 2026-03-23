Saheli AI companion app - design system, architecture, and feature decisions

## Design System
- Theme: Dark glassmorphism with animated mesh gradient background
- Primary: Pink (340 72% 62%), Accent: Lavender (280 50% 60%)
- Brand colors: saheli-pink, saheli-rose, saheli-lavender, saheli-teal, saheli-amber
- Fonts: Inter (body), Space Grotesk (display/headings)
- Glass classes: .glass, .glass-strong, .glass-subtle
- Gradient text: .saheli-gradient-text
- Glow effects: .saheli-glow, .saheli-glow-sm

## Architecture
- Lovable Cloud for auth, DB, AI (Gemini via edge functions)
- Browser Web Speech API for Hindi voice (Male/Female toggle in Settings)
- Sidebar navigation with glassmorphism styling
- AnimatedBackground (canvas mesh gradient) + GlowingCursor (elastic follower)
- AuthProvider wraps app, ProtectedRoute/PublicRoute for access control
- Auto-confirm email enabled for easy testing

## Database Tables
- profiles: id (FK auth.users), full_name, voice_preference, mood, created_at
- tasks: id, user_id (FK auth.users), title, completed, created_at
- Both have RLS: users can only CRUD their own rows
- Trigger: handle_new_user auto-creates profile on signup

## Edge Functions
- chat: Streaming Saheli AI chat via Lovable AI gateway (gemini-2.5-flash)
- vision: Image analysis for fit-check/skin/wellness via Gemini vision

## Routes
- / = Dashboard (protected)
- /auth = Login/Signup (public, redirects if logged in)
- /chat = AI Chat with streaming + voice (protected)
- /fit-check = Camera + Gemini Vision analysis (protected)
- /tasks = Persistent To-Do list (protected)
- /settings = Voice preference toggle (protected)
