const { Server } = require('socket.io');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join match room
    socket.on('join_match_room', ({ matchId }) => {
      socket.join(`match:${matchId}`);
      console.log(`Socket ${socket.id} joined match:${matchId}`);
    });

    // Leave match room
    socket.on('leave_match_room', ({ matchId }) => {
      socket.leave(`match:${matchId}`);
    });

    // Join user notification room
    socket.on('join_user_room', ({ userId }) => {
      socket.join(`user:${userId}`);
    });

    // In-match chat
    socket.on('send_message', ({ matchId, message, sender }) => {
      io.to(`match:${matchId}`).emit('receive_message', {
        sender,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

module.exports = { initSocket, getIO };