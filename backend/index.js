const express = require('express');
const cors = require('cors');
const axios = require('axios');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const session = require('express-session');
require('dotenv').config();

// Log environment variables (remove in production)
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID ? 'Set' : 'Not set',
  WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET ? 'Set' : 'Not set',
  REDIRECT_URI: process.env.REDIRECT_URI,
  CLIENT_URL: process.env.CLIENT_URL
});

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',     // Development
  'http://127.0.0.1:3000',    // Development IP
  'https://light90.com'       // Production
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Serialize/Deserialize user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Configure Passport OAuth2 strategy
const whoopStrategy = new OAuth2Strategy(
  {
    authorizationURL: 'https://api.whoop.com/oauth/oauth2/auth',
    tokenURL: 'https://api.whoop.com/oauth/oauth2/token',
    clientID: process.env.WHOOP_CLIENT_ID,
    clientSecret: process.env.WHOOP_CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI,
    scope: 'offline read:recovery read:cycles read:sleep read:profile read:workout',
    state: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const userResponse = await axios.get('https://api.whoop.com/v2/user/profile/basic', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      const user = {
        id: userResponse.data.user.id,
        profile: userResponse.data,
        accessToken,
        refreshToken
      };

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
);

passport.use('whoop', whoopStrategy);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    session: req.session ? 'active' : 'none'
  });
});

// Auth routes
app.get('/auth/whoop', passport.authenticate('whoop', {
  scope: 'offline read:recovery read:cycles read:sleep read:profile read:workout'
}));

app.get('/auth/whoop/callback',
  passport.authenticate('whoop', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// Check auth status
app.get('/auth/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user
  });
});

// Logout route
app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  });
});

// WHOOP API proxy endpoints
const whoopApiRequest = async (req, path) => {
  if (!req.isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  try {
    const response = await axios.get(`https://api.whoop.com${path}`, {
      headers: { 'Authorization': `Bearer ${req.user.accessToken}` }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      try {
        const refreshResponse = await axios.post('https://api.whoop.com/oauth/oauth2/token', {
          grant_type: 'refresh_token',
          refresh_token: req.user.refreshToken,
          client_id: process.env.WHOOP_CLIENT_ID,
          client_secret: process.env.WHOOP_CLIENT_SECRET
        });

        req.user.accessToken = refreshResponse.data.access_token;
        req.user.refreshToken = refreshResponse.data.refresh_token;

        // Retry the original request with new token
        const retryResponse = await axios.get(`https://api.whoop.com${path}`, {
          headers: { 'Authorization': `Bearer ${req.user.accessToken}` }
        });
        return retryResponse.data;
      } catch (refreshError) {
        throw new Error('Token refresh failed');
      }
    }
    throw error;
  }
};

// Get sleep cycles
app.get('/api/v1/cycle/sleep', async (req, res) => {
  try {
    const { start, end } = req.query;
    const data = await whoopApiRequest(
      req,
      `/v2/cycle/sleep?start=${start}&end=${end}`
    );
    res.json(data);
  } catch (error) {
    console.error('Sleep API Error:', error);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Get recovery data
app.get('/api/v1/cycle/recovery', async (req, res) => {
  try {
    const { start, end } = req.query;
    const data = await whoopApiRequest(
      req,
      `/v2/cycle/recovery?start=${start}&end=${end}`
    );
    res.json(data);
  } catch (error) {
    console.error('Recovery API Error:', error);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Get workout data
app.get('/api/v1/cycle/workout', async (req, res) => {
  try {
    const { start, end } = req.query;
    const data = await whoopApiRequest(
      req,
      `/v2/cycle/workout?start=${start}&end=${end}`
    );
    res.json(data);
  } catch (error) {
    console.error('Workout API Error:', error);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Webhook endpoint for WHOOP notifications
app.post('/webhooks/whoop', express.json(), async (req, res) => {
  try {
    console.log('Received WHOOP webhook:', req.body);

    // TODO: Validate webhook signature if WHOOP provides one
    // TODO: Process webhook data based on event type

    // Send 200 OK to acknowledge receipt
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(port, () => {
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
});