const { verifyAccessToken } = require('../utils/jwt');
const prisma = require('../utils/db');
const { getDefaultProfileImageUrl } = require('../utils/cloudinary');

const onlineUsers = new Map(); // workspaceId -> Set of userIds
const userSockets = new Map(); // userId -> socketId

// Helper to parse cookies from cookie string
function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;
  
  cookieString.split(';').forEach(cookie => {
    const [name, ...value] = cookie.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(value.join('='));
    }
  });
  return cookies;
}

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      // Try to get token from auth handshake first (for explicit token passing)
      let accessToken = socket.handshake.auth?.token;
      
      console.log('Socket auth - handshake auth token:', accessToken ? 'present' : 'none');
      console.log('Socket auth - cookie header:', socket.handshake.headers.cookie ? 'present' : 'none');
      
      // If no token in auth, try to parse from cookies
      if (!accessToken && socket.handshake.headers.cookie) {
        const cookies = parseCookies(socket.handshake.headers.cookie);
        console.log('Socket auth - parsed cookies:', Object.keys(cookies));
        accessToken = cookies.accessToken;
        console.log('Socket auth - accessToken from cookie:', accessToken ? 'present' : 'none');
      }

      if (!accessToken) {
        console.log('Socket auth failed: No access token');
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(accessToken);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, avatarUrl: true }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = {
        ...user,
        avatarUrl: user.avatarUrl || getDefaultProfileImageUrl()
      };
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Store socket mapping
    userSockets.set(socket.user.id, socket.id);

    // Join personal room for direct notifications
    socket.join(`user:${socket.user.id}`);

    // Handle workspace join
    socket.on('workspace:join', async (workspaceId) => {
      try {
        console.log(`Workspace join request: ${socket.user.id} -> ${workspaceId}`);
        
        // Verify membership
        const membership = await prisma.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: socket.user.id,
              workspaceId
            }
          }
        });

        if (!membership) {
          console.log(`Workspace join failed: ${socket.user.id} not a member of ${workspaceId}`);
          socket.emit('error', { message: 'Not a member of this workspace' });
          return;
        }

        // Join workspace room
        socket.join(`workspace:${workspaceId}`);
        console.log(`User ${socket.user.id} joined workspace room: workspace:${workspaceId}`);
        
        // Track online users
        if (!onlineUsers.has(workspaceId)) {
          onlineUsers.set(workspaceId, new Set());
        }
        onlineUsers.get(workspaceId).add(socket.user.id);

        // Broadcast to workspace
        socket.to(`workspace:${workspaceId}`).emit('user:joined', {
          userId: socket.user.id,
          user: socket.user,
          onlineCount: onlineUsers.get(workspaceId).size
        });

        // Send current online users to new joiner
        const onlineInWorkspace = Array.from(onlineUsers.get(workspaceId)).map(id => {
          return { userId: id };
        });
        socket.emit('workspace:online-users', onlineInWorkspace);

        console.log(`User ${socket.user.id} joined workspace ${workspaceId}`);
      } catch (error) {
        console.error('Workspace join error:', error);
        socket.emit('error', { message: 'Failed to join workspace' });
      }
    });

    // Handle workspace leave
    socket.on('workspace:leave', (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
      
      if (onlineUsers.has(workspaceId)) {
        onlineUsers.get(workspaceId).delete(socket.user.id);
        
        socket.to(`workspace:${workspaceId}`).emit('user:left', {
          userId: socket.user.id,
          onlineCount: onlineUsers.get(workspaceId).size
        });
      }

      console.log(`User ${socket.user.id} left workspace ${workspaceId}`);
    });

    // Handle collaborative editing - join document room
    socket.on('document:join', ({ documentId }) => {
      socket.join(`document:${documentId}`);
      socket.to(`document:${documentId}`).emit('document:user-joined', {
        user: socket.user
      });
      socket.to(`document:${documentId}`).emit('document:sync-request', {
        requesterId: socket.user.id
      });
      console.log(`User ${socket.user.id} joined document ${documentId}`);
    });

    // Handle document leave
    socket.on('document:leave', ({ documentId }) => {
      socket.leave(`document:${documentId}`);
      socket.to(`document:${documentId}`).emit('user:cursor-remove', {
        userId: socket.user.id
      });
    });

    // Handle cursor position updates for collaborative editing
    socket.on('document:cursor', ({ documentId, cursor }) => {
      socket.to(`document:${documentId}`).emit('user:cursor', {
        userId: socket.user.id,
        user: socket.user,
        cursor
      });
    });

    // Handle document changes for collaborative editing
    socket.on('document:operation', ({ documentId, operation }) => {
      socket.to(`document:${documentId}`).emit('document:operation', {
        userId: socket.user.id,
        user: socket.user,
        operation
      });
    });

    socket.on('document:sync-response', ({ documentId, requesterId, content }) => {
      if (!requesterId || requesterId === socket.user.id) return;

      io.to(`user:${requesterId}`).emit('document:sync-response', {
        documentId,
        userId: socket.user.id,
        user: socket.user,
        content
      });
    });

    // Heartbeat to keep connection alive
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
      
      userSockets.delete(socket.user.id);

      // Remove from all workspace online lists
      for (const [workspaceId, users] of onlineUsers.entries()) {
        if (users.has(socket.user.id)) {
          users.delete(socket.user.id);
          socket.to(`workspace:${workspaceId}`).emit('user:left', {
            userId: socket.user.id,
            onlineCount: users.size
          });
        }
      }
    });
  });
};
