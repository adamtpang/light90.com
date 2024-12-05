require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');

const app = express();

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

// Basic middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://light90.com']
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Add CORS preflight
app.options('*', cors());

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

      return done(null, user);
    } catch (error) {
      console.error('OAuth error:', error.response?.data || error.message);
      return done(error);
    }
  }
);

passport.use('whoop', whoopStrategy);

// Routes
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

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.url
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    CLIENT_URL: process.env.CLIENT_URL,
    REDIRECT_URI: process.env.REDIRECT_URI
  });
});