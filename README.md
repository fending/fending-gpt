# AI Chat Assistant

A modern, intelligent chat assistant powered by Claude AI, built with Next.js, Supabase, and TypeScript.

## Features

- 🤖 **Claude AI Integration** - Powered by Anthropic's Claude 3.5 Sonnet
- 🔐 **Email Authentication** - Secure user authentication with Supabase Auth
- 💬 **Real-time Chat** - Instant messaging with conversation history
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 👥 **Admin Dashboard** - Usage analytics and user management
- 🎨 **Modern UI** - Built with Tailwind CSS and Radix UI components
- 📊 **Usage Tracking** - Token usage and cost monitoring

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **TypeScript**: Full type safety
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- An Anthropic Claude API key

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd fending-gpt
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL commands in `schema.sql` in your Supabase SQL editor
   - Get your project URL and anon key from Settings > API

4. **Configure authentication**
   - In Supabase Dashboard > Authentication > URL Configuration
   - Add `http://localhost:3000/auth/callback` to redirect URLs
   - For production, add `https://your-domain.com/auth/callback`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Create admin user**
   - Sign up with the email you set as `ADMIN_EMAIL`
   - The user will automatically be granted admin privileges

### Environment Variables

Required environment variables (see `.env.local.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin functions)
- `CLAUDE_API_KEY` - Your Anthropic Claude API key
- `NEXTAUTH_SECRET` - Random secret for session encryption
- `ADMIN_EMAIL` - Email address for the admin user

## Deployment to Vercel

1. **Connect your repository to Vercel**
   - Import your GitHub repository in Vercel
   - Vercel will automatically detect Next.js

2. **Configure environment variables**
   - Add all required environment variables in Vercel Dashboard
   - Update `NEXT_PUBLIC_SITE_URL` to your production domain
   - Update `NEXTAUTH_URL` to your production domain

3. **Update Supabase redirect URLs**
   - Add your production URL to Supabase Auth settings
   - `https://your-domain.com/auth/callback`

4. **Deploy**
   - Vercel will automatically deploy on every push to main branch

## Database Schema

The application uses the following main tables:

- `users` - User profiles and admin status
- `conversations` - Chat conversation metadata
- `messages` - Individual chat messages
- `usage_logs` - Token usage and cost tracking

Row Level Security (RLS) is enabled to ensure users can only access their own data.

## Admin Features

Admin users (with `is_admin = true`) can access:

- `/admin` - Admin dashboard
- User management
- Usage statistics
- System analytics

## API Endpoints

- `POST /api/chat` - Send messages to Claude AI
- `GET /api/admin/stats` - Get usage statistics (admin only)
- `GET /api/admin/users` - Get user list (admin only)
- `PATCH /api/admin/users` - Update user admin status (admin only)

## Development

### Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── admin/          # Admin dashboard components
│   ├── auth/           # Authentication components
│   ├── chat/           # Chat interface components
│   ├── layout/         # Layout components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── claude/         # Claude AI integration
│   ├── supabase/       # Supabase client configuration
│   └── utils/          # General utilities
└── types/              # TypeScript type definitions
```

### Key Components

- `ChatInterface` - Main chat component with message handling
- `ConversationList` - Sidebar with conversation history
- `AdminDashboard` - Admin interface with analytics
- `Header` - Navigation with user menu
- `LoginForm` - Authentication form

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please email admin@brianfending.com or create an issue in the repository.