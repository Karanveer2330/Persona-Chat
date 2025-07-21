# Hub

Hub is a real-time communication and collaboration platform built with Next.js, featuring global chat rooms, private messaging, and media sharing capabilities.

## Features

- **Global Chat**: Join the main chat room and communicate with all users
- **Private Messaging**: Send direct messages to other users
- **Media Sharing**: Share images, videos, documents, and other files
- **Real-time Updates**: Instant message delivery with Socket.IO
- **User Authentication**: Secure login and user management
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the application.

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Radix UI components
- **Real-time**: Socket.IO
- **Backend**: Node.js/Express (server directory)
- **File Upload**: Multer for media handling

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - Reusable React components
- `/src/contexts` - React context providers
- `/server` - Backend API and Socket.IO server

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types
