require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;

// Clean environment variables (remove any trailing semicolons, quotes, and commas)
Object.keys(process.env).forEach(key => {
  if (typeof process.env[key] === 'string') {
    process.env[key] = process.env[key]
      .replace(/;$/, '')        // Remove trailing semicolon
      .replace(/,$/, '')        // Remove trailing comma
      .replace(/^['"]/, '')     // Remove leading quotes
      .replace(/['"]$/, '')     // Remove trailing quotes
      .trim();                  // Remove whitespace
  }
});

// Validate required environment variables
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

// Log cleaned environment variables (without sensitive data)
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  CLIENT_URL: process.env.CLIENT_URL,
  REDIRECT_URI: process.env.REDIRECT_URI,
  REDIS_URL_SET: !!process.env.REDIS_URL,
  REDIS_URL_PATTERN: process.env.REDIS_URL ? process.env.REDIS_URL.replace(/\/\/[^@]+@/, '//***:***@') : 'not set'
});

const app = express();

// Basic middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? 'https://light90.com' : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add CORS preflight
app.options('*', cors(corsOptions));

// Configure session middleware
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

// Apply session middleware (will update store later)
app.use(session(sessionConfig));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

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
  res.status(200).json({
    status: 'ok',
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
    res.redirect(process.env.CLIENT_URL);
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

  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    path: req.path
  });
});

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5000,
    keepAlive: 5000,
    tls: process.env.NODE_ENV === 'production',
    rejectUnauthorized: false
  }
});

let redisConnected = false;
let serverReady = false;
let isShuttingDown = false;

// Redis event handlers
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code
  });
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

redisClient.on('end', () => {
  console.log('Redis client connection ended at:', new Date().toISOString());
  redisConnected = false;
});

// Start server and attempt Redis connection
(async () => {
  // Start server immediately with memory store
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    serverReady = true;
    console.log(`=== Server Started on port ${PORT} ===`);
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: PORT,
      CLIENT_URL: process.env.CLIENT_URL,
      REDIRECT_URI: process.env.REDIRECT_URI,
      CORS_ORIGIN: corsOptions.origin
    });
    console.log('===================');
  });

  // Try to connect to Redis in the background
  if (process.env.NODE_ENV === 'production') {
    try {
      await redisClient.connect();
      sessionConfig.store = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 86400
      });
      console.log('Using Redis session store');
    } catch (error) {
      console.warn('Using memory session store as fallback - sessions will be lost on server restart');
    }
  } else {
    console.log('Development mode: Using memory session store');
  }
})().catch(error => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});