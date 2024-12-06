require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');

// Process start time
const startTime = new Date();
console.log('Process starting at:', startTime.toISOString());

// Log process info
console.log('Process Info:', {
  pid: process.pid,
  platform: process.platform,
  version: process.version,
  memory: process.memoryUsage(),
  env: process.env.NODE_ENV
});

// Clean environment variables more aggressively
const cleanEnvVars = () => {
  Object.keys(process.env).forEach(key => {
    if (typeof process.env[key] === 'string') {
      const originalValue = process.env[key];
      const cleanedValue = process.env[key].replace(/[;,'"]+/g, '').trim();
      if (originalValue !== cleanedValue) {
        console.log(`Cleaned env var ${key}: "${originalValue}" -> "${cleanedValue}"`);
      }
      process.env[key] = cleanedValue;
    }
  });
};

// Clean environment variables
cleanEnvVars();

// Validate required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'CLIENT_URL',
  'REDIRECT_URI',
  'WHOOP_CLIENT_ID',
  'WHOOP_CLIENT_SECRET',
  'SESSION_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Log cleaned environment variables (without sensitive data)
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CLIENT_URL: process.env.CLIENT_URL,
  REDIRECT_URI: process.env.REDIRECT_URI
});

const app = express();

// Basic middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://light90.com', 'https://www.light90.com']
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add CORS preflight
app.options('*', cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Starting`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Configure session middleware with MemoryStore
const sessionConfig = {
  store: new session.MemoryStore(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true, // Trust the reverse proxy
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
};

// Apply session middleware
app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Server state tracking
let isServerReady = false;
let serverShutdownInitiated = false;
let lastHealthCheckTime = null;
let healthCheckCount = 0;

// Routes
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  healthCheckCount++;
  lastHealthCheckTime = new Date();
  const uptime = process.uptime();
  const timeSinceStart = (Date.now() - startTime.getTime()) / 1000;

  console.log('Health check details:', {
    checkNumber: healthCheckCount,
    uptime: Math.round(uptime) + 's',
    timeSinceStart: Math.round(timeSinceStart) + 's',
    serverReady: isServerReady,
    shutdownInitiated: serverShutdownInitiated,
    lastCheck: lastHealthCheckTime.toISOString()
  });

  if (serverShutdownInitiated) {
    console.log('Health check failed - server is shutting down');
    return res.status(503).json({
      status: 'error',
      message: 'Server is shutting down',
      time: new Date().toISOString()
    });
  }

  if (!isServerReady) {
    console.log('Health check failed - server not ready');
    return res.status(503).json({
      status: 'error',
      message: 'Server starting up',
      time: new Date().toISOString()
    });
  }

  try {
    // Basic health checks
    const memoryUsage = process.memoryUsage();
    const processInfo = {
      memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      uptime: Math.round(uptime) + 's',
      healthChecks: healthCheckCount,
      timeSinceStart: Math.round(timeSinceStart) + 's'
    };

    console.log('Health check passed:', processInfo);

    res.status(200).json({
      status: 'ok',
      time: new Date().toISOString(),
      ...processInfo
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      time: new Date().toISOString()
    });
  }
});

// Process event handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    time: new Date().toISOString()
  });
  serverShutdownInitiated = true;
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : 'No stack trace',
    time: new Date().toISOString()
  });
  serverShutdownInitiated = true;
  shutdown('unhandledRejection');
});

// Graceful shutdown function
const shutdown = (signal) => {
  if (serverShutdownInitiated) {
    console.log(`Shutdown already initiated, ignoring ${signal}`);
    return;
  }

  const shutdownTime = new Date();
  const uptimeSeconds = (shutdownTime - startTime) / 1000;

  console.log('Shutdown details:', {
    signal,
    startTime: startTime.toISOString(),
    shutdownTime: shutdownTime.toISOString(),
    uptime: Math.round(uptimeSeconds) + 's',
    healthChecks: healthCheckCount,
    lastHealthCheck: lastHealthCheckTime ? lastHealthCheckTime.toISOString() : 'none',
    memory: process.memoryUsage()
  });

  serverShutdownInitiated = true;
  isServerReady = false;

  server.close(() => {
    console.log('Server closed successfully');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const port = process.env.PORT || 5000;
const server = app.listen(port, '0.0.0.0', () => {
  const serverStartTime = new Date();
  const startupDuration = (serverStartTime - startTime) / 1000;

  console.log('Server startup details:', {
    startTime: startTime.toISOString(),
    serverReady: serverStartTime.toISOString(),
    startupDuration: Math.round(startupDuration * 1000) + 'ms',
    port: port,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      CLIENT_URL: process.env.CLIENT_URL,
      REDIRECT_URI: process.env.REDIRECT_URI,
      CORS_ORIGIN: corsOptions.origin
    }
  });

  // Mark server as ready
  isServerReady = true;
  console.log('Server is ready to accept requests');
});

// Handle shutdown signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received with process details:', {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    healthChecks: healthCheckCount,
    time: new Date().toISOString()
  });
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('SIGINT received with process details:', {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    healthChecks: healthCheckCount,
    time: new Date().toISOString()
  });
  shutdown('SIGINT');
});