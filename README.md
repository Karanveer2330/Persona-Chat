# Hub - 3D Avatar Chat Platform

A modern web application featuring 3D avatar-based video calls, real-time chat, and immersive communication experiences.

## Features

- 🌍 **Global Chat** - Real-time messaging with users worldwide
- 💬 **Private Messaging** - Secure one-on-one conversations
- 🎭 **3D Avatar Video Calls** - Immersive video calls with customizable 3D avatars
- 📱 **Mobile Optimized** - Responsive design for all devices
- 🔐 **User Authentication** - Secure login and user management
- 📁 **File Sharing** - Share images, documents, and media files
- 🎨 **Customizable Avatars** - Multiple VRM avatar models to choose from

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **3D Graphics**: Three.js, @pixiv/three-vrm
- **Styling**: Tailwind CSS, Radix UI
- **Real-time**: Socket.IO
- **Video Calls**: WebRTC, PeerJS
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT, bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB database

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd hub
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEXTAUTH_SECRET=your_nextauth_secret
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Deploy to Other Platforms

The app is compatible with:
- Vercel (recommended)
- Netlify
- Railway
- Heroku
- Any Node.js hosting platform

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js | Yes |
| `NEXTAUTH_URL` | Your app's URL | Yes |

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── chat/           # Chat-related components
│   ├── video-call/     # Video call components
│   └── ui/             # Reusable UI components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
└── types/              # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@yourdomain.com or create an issue in the GitHub repository.