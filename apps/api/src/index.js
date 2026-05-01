const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'https://fredocloudweb-production.up.railway.app'
];
const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...(process.env.CLIENT_URL || '').split(',')
]
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const uniqueAllowedOrigins = [...new Set(allowedOrigins)];
const corsOrigin = (origin, callback) => {
  const normalizedOrigin = origin?.replace(/\/$/, '');

  if (!normalizedOrigin || uniqueAllowedOrigins.includes(normalizedOrigin)) {
    return callback(null, true);
  }

  return callback(null, false);
};

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin?.replace(/\/$/, '');

  if (origin && uniqueAllowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: uniqueAllowedOrigins,
    credentials: true
  }
});

// Attach io to requests for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/workspaces', require('./routes/workspaces'));
app.use('/api/v1/goals', require('./routes/goals'));
app.use('/api/v1/announcements', require('./routes/announcements'));
app.use('/api/v1/action-items', require('./routes/actionItems'));
app.use('/api/v1/analytics', require('./routes/analytics'));
app.use('/api/v1/notifications', require('./routes/notifications'));

// Swagger docs
app.use('/api/docs', require('./routes/docs'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Socket.io connection handler
require('./sockets')(io);

const PORT = parseInt(process.env.PORT, 10) || 4000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
  console.log(`Allowed CORS origins: ${uniqueAllowedOrigins.join(', ')}`);
});
