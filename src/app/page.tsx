'use client'; // Essential for client components
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Mousetrack from '../components/mousetrack'; 
// import Globalchat from '../components/globalchat';
import { redirect } from 'next/navigation';


export default function Home() {
    redirect('/chat/global');

  //  const socket = io('http://localhost:3000');
  //   const remoteCursors = new Map();

  //   // Throttle mouse events to avoid flooding (50ms interval)
  //   let lastSent = 0;
    
  //   document.addEventListener('mousemove', (e) => {
  //     if (Date.now() - lastSent < 50) return;
  //     lastSent = Date.now();
      
  //     socket.emit('mouseMove', {
  //       x: e.clientX,
  //       y: e.clientY
  //     });
  //   });

  //   // Handle remote cursor updates
  //   socket.on('remoteMouse', (data) => {
  //     let cursor = remoteCursors.get(data.id);
  //     if (!cursor) {
  //       cursor = document.createElement('div');
  //       cursor.style = `
  //         position: fixed;
  //         width: 16px;
  //         height: 16px;
  //         pointer-events: none;
  //         background: ${data.color};
  //         border-radius: 50%;
  //         transform: translate(-50%, -50%);
  //       `;
  //       document.body.appendChild(cursor);
  //       remoteCursors.set(data.id, cursor);
  //     }
  //     cursor.style.left = `${data.x}px`;
  //     cursor.style.top = `${data.y}px`;
  //   });

  //   // Clean up disconnected users
  //   socket.on('userDisconnected', (id) => {
  //     const cursor = remoteCursors.get(id);
  //     if (cursor) cursor.remove();
  //     remoteCursors.delete(id);
  //   });
  return <>
  <Mousetrack />
  <div>Your Next.js Application</div>;
  {/* <Globalchat /> */}
  </>
}
