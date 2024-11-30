const express = require('express');
const cors = require('cors');
const axios = require('axios');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Passport OAuth2 strategy configuration
passport.use('whoop', new OAuth2Strategy({
    authorizationURL: 'https://api.whoop.com/oauth/oauth2/auth',
    tokenURL: 'https://api.whoop.com/oauth/oauth2/token',
    clientID: process.env.WHOOP_CLIENT_ID,
    clientSecret: process.env.WHOOP_CLIENT_SECRET,
    callbackURL: process.env.REDIRECT_URI,
    scope: ['offline', 'read:recovery', 'read:cycles', 'read:sleep', 'read:profile', 'read:workout']
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
      // Get user profile from WHOOP API
      const userResponse = await axios.get('https://api.whoop.com/v1/user/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const user = {
        id: userResponse.data.user.id,
        profile: userResponse.data,
        accessToken,
        refreshToken
      };

      return cb(null, user);
    } catch (error) {
      return cb(error);
    }
  }
));

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Start OAuth flow
app.get('/auth/whoop',
  passport.authenticate('whoop', {
    session: true
  })
);

// OAuth callback
app.get('/auth/whoop/callback',
  passport.authenticate('whoop', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// Check authentication status
app.get('/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// WHOOP API Endpoints (protected)
app.get('/api/v1/user/profile', isAuthenticated, async (req, res) => {
  try {
    const response = await axios({
      method: 'GET',
      url: 'https://api.whoop.com/v1/user/profile',
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Accept': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Get sleep data for a date range
app.get('/api/v1/cycle/sleep', isAuthenticated, async (req, res) => {
  try {
    const { start, end } = req.query;
    const response = await axios({
      method: 'GET',
      url: `https://api.whoop.com/v1/cycle/sleep`,
      params: {
        start_time: start,
        end_time: end,
      },
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Accept': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Get recovery data
app.get('/api/v1/cycle/recovery', isAuthenticated, async (req, res) => {
  try {
    const { start, end } = req.query;
    const response = await axios({
      method: 'GET',
      url: `https://api.whoop.com/v1/cycle/recovery`,
      params: {
        start_time: start,
        end_time: end,
      },
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Accept': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Get workout data
app.get('/api/v1/cycle/workout', isAuthenticated, async (req, res) => {
  try {
    const { start, end } = req.query;
    const response = await axios({
      method: 'GET',
      url: `https://api.whoop.com/v1/cycle/workout`,
      params: {
        start_time: start,
        end_time: end,
      },
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Accept': 'application/json',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Token refresh endpoint
app.post('/auth/refresh', isAuthenticated, async (req, res) => {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.whoop.com/oauth/oauth2/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.WHOOP_CLIENT_ID,
        client_secret: process.env.WHOOP_CLIENT_SECRET,
        refresh_token: req.user.refreshToken,
      }),
    });

    // Update user session with new tokens
    req.user.accessToken = response.data.access_token;
    req.user.refreshToken = response.data.refresh_token;

    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});