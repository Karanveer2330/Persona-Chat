import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import ColorHash from 'color-hash';

const MouseTracker = () => {
  const socket = useRef();
  const rafPending = useRef(false);
  const [remoteCursors, setRemoteCursors] = useState({});
  const colorHash = new ColorHash();

  // Initialize socket only once
  useEffect(() => {
    socket.current = io('http://localhost:4000');
    return () => {
      socket.current.disconnect();
    };
  }, []);

  // Emit local cursor position
  useEffect(() => {
    const handlePointerMove = (e) => {
      const position = { x: e.clientX, y: e.clientY };

      if (!rafPending.current && socket.current) {
        rafPending.current = true;
        requestAnimationFrame(() => {
          // Emit to server
          socket.current.emit('mouseMove', position);
          rafPending.current = false;
        });
      }

      // Update your own cursor locally
      setRemoteCursors((prev) => {
        if (!socket.current) return prev;
        return {
          ...prev,
          [socket.current.id]: position
        };
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  // Receive remote cursor positions
  useEffect(() => {
    if (!socket.current) return;

    const handleRemoteMove = (data) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [data.id]: { x: data.x, y: data.y }
      }));
    };

    const handleUserDisconnected = (userId) => {
      setRemoteCursors((prev) => {
        const { [userId]: _, ...rest } = prev;
        return rest;
      });
    };

    socket.current.on('mouseMove', handleRemoteMove);
    socket.current.on('userDisconnected', handleUserDisconnected);

    return () => {
      socket.current.off('mouseMove', handleRemoteMove);
      socket.current.off('userDisconnected', handleUserDisconnected);
    };
  }, []);

  // Render all cursors (including your own)
  return (
    <div className="cursors-container">
      {Object.entries(remoteCursors).map(([userId, position]) => (
        <div
          key={userId}
          className="remote-cursor"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            transform: `translate(${position.x}px, ${position.y}px)`,
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          <div
            style={{
              width: '15px',
              height: '15px',
              borderRadius: '50%',
              backgroundColor: colorHash.hex(userId),
              border: userId === socket.current?.id ? '2px solid #000' : 'none', // highlight your own cursor
              transform: 'translate(-50%, -50%)'
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default MouseTracker;
