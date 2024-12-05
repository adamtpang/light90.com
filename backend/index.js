require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configure CORS first, before any other middleware
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = ['https://light90.com', 'http://localhost:3000', 'http://localhost:5000'];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost')) {
      callback(null, true);
    } else {
      console.log('Origin rejected by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Enable pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
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
      // Get latest sleep data from WHOOP API
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const userResponse = await axios.get('https://api.prod.whoop.com/developer/v1/activity/sleep', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-version': '2',
          'User-Agent': 'Light90/1.0.0'
        },
        params: {
          start_date: yesterday.toISOString().split('T')[0],
          end_date: now.toISOString().split('T')[0]
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
      console.error('OAuth callback error:', error.response?.data || error.message);
      return done(error);
    }
  }
);

passport.use('whoop', whoopStrategy);

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

app.get('/auth/status', (req, res) => {
  console.log('Auth status check:', {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user
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
    console.log('OAuth callback successful');
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  },
  (err, req, res, next) => {
    console.error('OAuth callback error:', err);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}?error=auth_failed`);
  }
);

// WHOOP API endpoints
app.get('/api/v1/sleep', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.profile && req.user.profile.records) {
      return res.json({
        records: req.user.profile.records
      });
    }

    return res.status(404).json({ error: 'No sleep data available' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sleep data' });
  }
});

// Add sleep data refresh endpoint
app.get('/api/v1/sleep/refresh', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!req.user?.accessToken) {
      return res.status(401).json({ error: 'No access token available' });
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const response = await axios.get('https://api.prod.whoop.com/developer/v1/activity/sleep', {
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-version': '2',
        'User-Agent': 'Light90/1.0.0'
      },
      params: {
        start_date: yesterday.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0]
      }
    });

    // Update the user's profile with new sleep data
    if (response.data && response.data.records) {
      // Check if data has actually changed
      const currentRecords = req.user.profile?.records || [];
      const newRecords = response.data.records;
      const hasChanged = JSON.stringify(currentRecords) !== JSON.stringify(newRecords);

      if (hasChanged) {
        req.user.profile = response.data;

        // Broadcast update to WebSocket clients
        const wsMessage = JSON.stringify({
          type: 'sleep_updated',
          data: response.data
        });

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(wsMessage);
          }
        });
      }

      res.json({
        records: response.data.records
      });
    } else {
      res.json({
        records: []
      });
    }
  } catch (error) {
    console.error('Error refreshing sleep data:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    res.status(500).json({
      error: 'Failed to refresh sleep data',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    path: req.path,
    method: req.method,
    query: req.query,
    headers: req.headers
  });

  // Ensure CORS headers are set even for error responses
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Handle 404s
app.use((req, res) => {
  console.log('404 Not Found:', {
    path: req.path,
    method: req.method,
    query: req.query
  });

  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.path
  });
});

// Start server with better error handling
const PORT = process.env.PORT || 8080;

// Add error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Add error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log('=== Server Started ===');
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
  console.log(`Redirect URI: ${process.env.REDIRECT_URI}`);
  console.log('===================');
});

// Add server error handler
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});