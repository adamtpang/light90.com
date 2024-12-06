require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;

// Clean environment variables (remove any trailing semicolons)
Object.keys(process.env).forEach(key => {
  if (typeof process.env[key] === 'string') {
    process.env[key] = process.env[key].replace(/;$/, '');
  }
});

// Verify required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'CLIENT_URL',
  'REDIRECT_URI',
  'WHOOP_CLIENT_ID',
  'WHOOP_CLIENT_SECRET',
  'SESSION_SECRET',
  'REDIS_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Validate Redis URL format
const redisUrl = process.env.REDIS_URL;
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  REDIS_URL_SET: !!process.env.REDIS_URL,
  REDIS_URL_PATTERN: redisUrl ? redisUrl.replace(/\/\/[^@]+@/, '//***:***@') : 'not set'
});

if (!redisUrl || !redisUrl.startsWith('redis://')) {
  console.error('Invalid REDIS_URL format. Expected redis:// but got:', redisUrl ? redisUrl.substring(0, 10) + '...' : 'undefined');
  process.exit(1);
}

const app = express();

// Initialize Redis client
const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 30000,
    reconnectStrategy: (retries) => {
      console.log(`Redis reconnect attempt ${retries}`);
      return Math.min(retries * 500, 10000);
    }
  }
});

let redisConnected = false;
let serverReady = false;

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    details: err,
    currentUrl: process.env.REDIS_URL ? process.env.REDIS_URL.replace(/\/\/[^@]+@/, '//***:***@') : 'not set'
  });
  redisConnected = false;
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
  redisConnected = true;
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
  redisConnected = true;
});

redisClient.on('reconnecting', () => {
  console.log('Redis client reconnecting');
  redisConnected = false;
});

redisClient.on('end', () => {
  console.log('Redis client connection ended');
  redisConnected = false;
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const status = {
    status: serverReady ? 'ok' : 'starting',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
    redis: {
      connected: redisConnected,
      ready: redisClient.isReady
    },
    uptime: process.uptime()
  };

  // If Redis is required and not connected, return 503
  if (!redisConnected && process.env.REQUIRE_REDIS === 'true') {
    res.status(503).json({
      ...status,
      status: 'unhealthy',
      message: 'Redis connection required but not available'
    });
    return;
  }

  res.json(status);
});

// Connect to Redis and start server
(async () => {
  try {
    console.log('Attempting to connect to Redis with URL pattern:',
      process.env.REDIS_URL.replace(/\/\/[^@]+@/, '//***:***@')
    );
    await redisClient.connect();
  } catch (error) {
    console.error('Initial Redis connection failed:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    // Continue without Redis - will keep retrying in background
  }

  // Configure session with Redis or fallback to memory store
  const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  };

  if (redisConnected) {
    sessionConfig.store = new RedisStore({ client: redisClient });
    console.log('Using Redis session store');
  } else {
    console.warn('Using memory session store as fallback - sessions will be lost on server restart');
  }

  app.use(session(sessionConfig));

  // Start server
  const PORT = process.env.PORT || 8080;
  const server = app.listen(PORT, '0.0.0.0', () => {
    serverReady = true;
    console.log('=== Server Started ===');
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      CLIENT_URL: process.env.CLIENT_URL,
      REDIRECT_URI: process.env.REDIRECT_URI,
      CORS_ORIGIN: corsOptions.origin,
      REDIS_CONNECTED: redisConnected
    });
    console.log('===================');
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`${signal} received - starting graceful shutdown`);
    serverReady = false;

    // Stop accepting new connections
    server.close(async () => {
      console.log('Server closed');

      // Close Redis connection if connected
      if (redisConnected) {
        try {
          await redisClient.quit();
          console.log('Redis connection closed');
        } catch (error) {
          console.error('Error closing Redis connection:', error);
        }
      }

      console.log('Graceful shutdown completed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle various shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon restarts

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
})().catch(error => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});

// Basic middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://light90.com'
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add CORS preflight
app.options('*', cors(corsOptions));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
    origin: req.headers.origin,
    headers: req.headers
  });
  next();
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`[${new Date().toISOString()}] Response:`, {
      path: req.path,
      statusCode: res.statusCode,
      headers: res.getHeaders()
    });
    return originalSend.apply(res, arguments);
  };
  next();
});

// Passport serialization
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log('Deserializing user:', user);
  done(null, user);
});

// Configure OAuth
const whoopStrategy = new OAuth2Strategy(
  {
    authorizationURL: 'https://api.prod.whoop.com/oauth/oauth2/auth',
    tokenURL: 'https://api.prod.whoop.com/oauth/oauth2/token',
    clientID: process.env.WHOOP_CLIENT_ID,
    clientSecret: process.env.WHOOP_CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI,
    scope: ['offline', 'read:sleep', 'read:profile'].join(' '),
    state: true,
    customHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'api-version': '2',
      'User-Agent': 'Light90/1.0.0'
    }
  },
  async (accessToken, refreshToken, params, profile, done) => {
    try {
      console.log('OAuth callback received:', { accessToken, refreshToken, params });

      // Get user profile from WHOOP API
      const userResponse = await axios.get('https://api.prod.whoop.com/developer/v1/activity/sleep', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-version': '2',
          'User-Agent': 'Light90/1.0.0'
        },
        params: {
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        }
      });

      const user = {
        accessToken,
        refreshToken,
        tokenParams: params,
        profile: userResponse.data
      };

      console.log('User profile fetched:', user);
      return done(null, user);
    } catch (error) {
      console.error('OAuth error:', error.response?.data || error.message);
      return done(error);
    }
  }
);

passport.use('whoop', whoopStrategy);

// Routes
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

app.get('/auth/status', (req, res) => {
  console.log('Auth status check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    session: req.session
  });
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user
  });
});

app.get('/auth/whoop', (req, res, next) => {
  console.log('Starting WHOOP OAuth flow');
  passport.authenticate('whoop', {
    scope: ['offline', 'read:sleep', 'read:profile'],
    state: true,
    response_type: 'code'
  })(req, res, next);
});

app.get('/auth/whoop/callback',
  (req, res, next) => {
    console.log('Received callback with query:', req.query);
    next();
  },
  passport.authenticate('whoop', { session: true }),
  (req, res) => {
    console.log('OAuth callback successful, redirecting to:', process.env.CLIENT_URL);
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    origin: req.headers.origin,
    session: req.session
  });

  // Ensure CORS headers are set
  const origin = process.env.NODE_ENV === 'production'
    ? 'https://light90.com'
    : 'http://localhost:3000';

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    path: req.path
  });
});

// 404 handler
app.use((req, res) => {
  console.log('404 Not Found:', {
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });

  // Ensure CORS headers are set
  const origin = process.env.NODE_ENV === 'production'
    ? 'https://light90.com'
    : 'http://localhost:3000';

  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');

  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});