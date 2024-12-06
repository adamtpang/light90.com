require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');

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
  origin: process.env.NODE_ENV === 'production' ? 'https://light90.com' : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Add CORS preflight
app.options('*', cors(corsOptions));

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

// Server readiness flag
let isServerReady = false;

// Routes
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
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
    const uptime = process.uptime();

    console.log('Health check passed:', {
      memoryUsage: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      uptime: Math.round(uptime) + 's'
    });

    res.status(200).json({
      status: 'ok',
      time: new Date().toISOString(),
      uptime: uptime,
      memory: memoryUsage
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
    scope: ['offline', 'read:sleep', 'read:profile']
  })(req, res, next);
});

app.get('/auth/whoop/callback',
  passport.authenticate('whoop', { failureRedirect: '/auth/failed' }),
  (req, res) => {
    console.log('OAuth callback successful');
    res.redirect(process.env.CLIENT_URL);
  }
);

app.get('/auth/failed', (req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
});

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    console.log('User logged out');
    res.redirect(process.env.CLIENT_URL);
  });
});

// Start server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`=== Server Started on port ${port} ===`);
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: port,
    CLIENT_URL: process.env.CLIENT_URL,
    REDIRECT_URI: process.env.REDIRECT_URI,
    CORS_ORIGIN: corsOptions.origin
  });
  console.log('===================');

  // Mark server as ready after a short delay to ensure all middleware is initialized
  setTimeout(() => {
    isServerReady = true;
    console.log('Server is ready to accept requests');
  }, 1000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  isServerReady = false;
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
});