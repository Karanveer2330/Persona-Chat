# Hub

Hub is a real-time communication and collaboration platform built with Next.js, featuring global chat rooms, private messaging, and media sharing capabilities.

## Features

- **3D Avatar Chat**: Interactive 3D avatars with VRM model support and real-time facial/pose tracking
- **Global Chat**: Join the main chat room and communicate with all users
- **Private Messaging**: Send direct messages to other users
- **Media Sharing**: Share images, videos, documents, and other files
- **Real-time Updates**: Instant message delivery with Socket.IO
- **User Authentication**: Secure login and user management
- **Responsive Design**: Works on desktop and mobile devices
- **VRM Avatar Support**: Upload and customize VRM 3D avatar models
- **Motion Tracking**: Face, pose, and hand tracking using MediaPipe and Kalidokit

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
- **3D Graphics**: Three.js, @pixiv/three-vrm
- **Motion Tracking**: MediaPipe, Kalidokit
- **Backend**: Node.js/Express (server directory)
- **File Upload**: Multer for media handling

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/components` - Reusable React components
  - `/avatar` - 3D avatar chat components
  - `three-canvas.tsx` - Main 3D canvas with VRM and tracking
- `/src/contexts` - React context providers
- `/server` - Backend API and Socket.IO server

## 3D Avatar Chat

The Hub platform features an integrated 3D avatar chat system that allows users to:

- Upload VRM avatar models
- Use real-time facial expression tracking via webcam
- Control pose and hand movements
- Interact in both global and private chat rooms with their 3D avatar

The 3D avatar system is powered by:
- **Three.js** for 3D rendering
- **@pixiv/three-vrm** for VRM model support
- **MediaPipe** for computer vision tracking
- **Kalidokit** for motion data processing

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types
