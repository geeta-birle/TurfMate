import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const socketInitialized = useRef(false);

  useEffect(() => {
    // Disconnect if no user
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      socketInitialized.current = false;
      return;
    }

    // Prevent multiple initializations
    if (socketInitialized.current) {
      return;
    }

    socketInitialized.current = true;

    const s = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('🔌 Socket connected:', s.id);
      s.emit('join_user_room', { userId: user.id });
    });

    s.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    s.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id]);

  const joinMatchRoom = (matchId) => {
    socket?.emit('join_match_room', { matchId });
  };

  const leaveMatchRoom = (matchId) => {
    socket?.emit('leave_match_room', { matchId });
  };

  return (
    <SocketContext.Provider value={{ socket, joinMatchRoom, leaveMatchRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};