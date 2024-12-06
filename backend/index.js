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
    keepAlive: 5000,
    reconnectStrategy: (retries) => {
      console.log(`Redis reconnect attempt ${retries}`);
      return Math.min(retries * 500, 10000);
    }
  }
});

let redisConnected = false;
let serverReady = false;
let isShuttingDown = false;

// Log process memory usage every 30 seconds
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory usage:', {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`
  });
}, 30000);

// Enhanced error logging
const logError = (context, error) => {
  console.error(`Error in ${context}:`, {
    message: error.message,
    stack: error.stack,
    code: error.code,
    time: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
};

redisClient.on('error', (err) => {
  logError('Redis Client', err);
  redisConnected = false;
});

redisClient.on('connect', () => {
  console.log('Connected to Redis at:', new Date().toISOString());
  redisConnected = true;
});

redisClient.on('ready', () => {
  console.log('Redis client ready at:', new Date().toISOString());
  redisConnected = true;
});

redisClient.on('reconnecting', () => {
  console.log('Redis client reconnecting at:', new Date().toISOString());
  redisConnected = false;
});

redisClient.on('end', () => {
  console.log('Redis client connection ended at:', new Date().toISOString());
  redisConnected = false;
});

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const status = {
    status: serverReady && !isShuttingDown ? 'ok' : 'unavailable',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
    redis: {
      connected: redisConnected,
      ready: redisClient.isReady
    },
    uptime: process.uptime(),
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024)
    }
  };

  // Return appropriate status code based on service health
  const statusCode = serverReady && !isShuttingDown ? 200 : 503;
  res.status(statusCode).json(status);
});

// Connect to Redis and start server
(async () => {
  let startTime = Date.now();
  console.log('Starting server initialization at:', new Date().toISOString());

  try {
    console.log('Attempting to connect to Redis with URL pattern:',
      process.env.REDIS_URL.replace(/\/\/[^@]+@/, '//***:***@')
    );
    await redisClient.connect();
  } catch (error) {
    logError('Redis Connection', error);
    // Continue without Redis - will keep retrying in background
  }

  // Configure session with Redis or fallback to memory store
  const sessionConfig = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  };

  if (redisConnected) {
    sessionConfig.store = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
      ttl: 86400 // 1 day
    });
    console.log('Using Redis session store');
  } else {
    console.warn('Using memory session store as fallback - sessions will be lost on server restart');
  }

  app.use(session(sessionConfig));

  // Start server
  const PORT = process.env.PORT || 8080;
  const server = app.listen(PORT, '0.0.0.0', () => {
    serverReady = true;
    const startupTime = Date.now() - startTime;
    console.log(`=== Server Started (took ${startupTime}ms) ===`);
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      CLIENT_URL: process.env.CLIENT_URL,
      REDIRECT_URI: process.env.REDIRECT_URI,
      CORS_ORIGIN: corsOptions.origin,
      REDIS_CONNECTED: redisConnected,
      START_TIME: new Date().toISOString()
    });
    console.log('===================');
  });

  // Keep track of active connections
  let connections = new Set();
  server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} received at ${new Date().toISOString()} - starting graceful shutdown`);
    serverReady = false;

    // Stop accepting new connections
    server.close(async () => {
      console.log(`Server closed at ${new Date().toISOString()}`);

      // Close all existing connections
      for (const conn of connections) {
        conn.end();
      }
      connections.clear();

      // Close Redis connection if connected
      if (redisConnected) {
        try {
          await redisClient.quit();
          console.log('Redis connection closed');
        } catch (error) {
          logError('Redis Shutdown', error);
        }
      }

      console.log('Graceful shutdown completed');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000); // 30 second timeout
  };

  // Handle various shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logError('Uncaught Exception', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
})().catch(error => {
  logError('Startup', error);
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