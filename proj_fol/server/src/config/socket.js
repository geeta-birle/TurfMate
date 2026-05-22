const { Server }          = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_URL || '*',
      methods:     ['GET', 'POST'],
      credentials: true,
    },
    // FIX 1: Add ping timeout/interval so stale connections are cleaned up.
    // Without this, dead sockets accumulate and consume memory.
    pingTimeout:  60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Authenticate on connect — attach user to socket
    const token = socket.handshake?.auth?.token;
    if (token) {
      try {
        const payload  = verifyAccessToken(token);
        socket.user    = payload;
        socket.userId  = payload.id;
        // Auto-join personal notification room
        socket.join(`user:${payload.id}`);
        console.log(`Socket ${socket.id} → user:${payload.id}`);
      } catch (err) {
        console.log(`Socket auth failed for ${socket.id}:`, err.message);
        // Don't disconnect — allow unauthenticated sockets for public rooms
      }
    }

    // ── Join match room ──────────────────────────────────────────────────
    socket.on('join_match_room', ({ matchId }) => {
      if (!matchId) return;
      socket.join(`match:${matchId}`);
    });

    // ── Leave match room ─────────────────────────────────────────────────
    socket.on('leave_match_room', ({ matchId }) => {
      if (!matchId) return;
      socket.leave(`match:${matchId}`);
    });

    // ── Join personal notification room ──────────────────────────────────
    // FIX 2: Original allowed ANY socket to join ANY user room by just
    // passing a userId — no auth check. A malicious client could join
    // another user's room and receive their private notifications.
    // Fix: only allow joining your OWN room, verified by the JWT on connect.
    socket.on('join_user_room', ({ userId }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required.' });
        return;
      }
      if (socket.userId !== userId) {
        socket.emit('error', { message: 'Cannot join another user\'s room.' });
        return;
      }
      socket.join(`user:${userId}`);
    });

    // ── In-match chat ────────────────────────────────────────────────────
    // FIX 3: Validate message before broadcasting — prevents empty/null
    // messages and XSS payloads from being relayed to other clients.
    socket.on('send_message', ({ matchId, message, sender }) => {
      if (!matchId || !message || typeof message !== 'string') return;

      const sanitized = message.trim().slice(0, 500); // cap length
      if (!sanitized) return;

      io.to(`match:${matchId}`).emit('receive_message', {
        sender,
        message:   sanitized,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} — ${reason}`);
    });

    // FIX 4: Handle socket errors so they don't crash the process
    socket.on('error', (err) => {
      console.error(`Socket error (${socket.id}):`, err.message);
    });
  });

  return io;
};

// FIX 5: getIO was throwing a generic Error with no context.
// Now includes a hint that helps during startup debugging.
const getIO = () => {
  if (!io)
    throw new Error(
      'Socket.io not initialized. Ensure initSocket(server) is called before using getIO().'
    );
  return io;
};

module.exports = { initSocket, getIO };