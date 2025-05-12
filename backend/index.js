require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');

// Clean environment variables
Object.keys(process.env).forEach(key => {
  if (typeof process.env[key] === 'string') {
    const originalValue = process.env[key];
    process.env[key] = process.env[key].replace(/[;,'"]+/g, '').trim();
    if (originalValue !== process.env[key]) {
      console.log(`Cleaned env var ${key}: '${originalValue}' -> '${process.env[key]}'`);
    }
  }
});

console.log('Starting server with environment:', {
  NODE_ENV: JSON.stringify(process.env.NODE_ENV),
  PORT: JSON.stringify(process.env.PORT),
  CLIENT_URL: JSON.stringify(process.env.CLIENT_URL),
  REDIRECT_URI: JSON.stringify(process.env.REDIRECT_URI)
});

const app = express();

// Basic middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Session configuration
const sessionConfig = {
  store: process.env.NODE_ENV === 'production'
    ? null  // In production, the session will be lost on restart, but at least we won't leak memory
    : new session.MemoryStore(),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
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
    state: true
  },
  async (accessToken, refreshToken, params, profile, done) => {
    try {
      // Get user profile from WHOOP API
      const userResponse = await axios.get('https://api.prod.whoop.com/developer/v1/activity/sleep', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-version': '2'
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

      return done(null, user);
    } catch (error) {
      console.error('OAuth error:', error);
      return done(error);
    }
  }
);

passport.use('whoop', whoopStrategy);

// Routes
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/auth/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user
  });
});

app.get('/auth/whoop', passport.authenticate('whoop'));

app.get('/auth/whoop/callback',
  passport.authenticate('whoop', { failureRedirect: '/auth/failed' }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL);
  }
);

app.get('/auth/failed', (req, res) => {
  res.status(401).json({ error: 'Authentication failed' });
});

app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect(process.env.CLIENT_URL);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const port = process.env.PORT || 5000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    CLIENT_URL: process.env.CLIENT_URL,
    REDIRECT_URI: process.env.REDIRECT_URI
  });
});

// Handle shutdown gracefully
let isShuttingDown = false;

const shutdown = (signal) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress');
    // Force exit if user presses Ctrl+C multiple times
    process.exit(1);
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  // Close server first
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force exit after 1.5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.log('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 1500);
};

// Handle different termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});