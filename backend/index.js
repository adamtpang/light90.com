require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 5000;

// Debug environment variables
console.log('Debug - Environment Variables:', {
  WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID,
  NODE_ENV: process.env.NODE_ENV,
  CLIENT_URL: process.env.CLIENT_URL,
  REDIRECT_URI: process.env.REDIRECT_URI
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Basic middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    session: req.session,
    user: req.user ? {
      ...req.user,
      accessToken: req.user.accessToken?.substring(0, 10) + '...',
      refreshToken: req.user.refreshToken?.substring(0, 10) + '...'
    } : null
  });
  next();
});

passport.serializeUser((user, done) => {
  console.log('Serializing user:', {
    ...user,
    accessToken: user.accessToken?.substring(0, 10) + '...',
    refreshToken: user.refreshToken?.substring(0, 10) + '...'
  });
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log('Deserializing user:', {
    ...user,
    accessToken: user.accessToken?.substring(0, 10) + '...',
    refreshToken: user.refreshToken?.substring(0, 10) + '...'
  });
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
    },
    passReqToCallback: true,
    pkce: false,
    proxy: false
  },
  async (req, accessToken, refreshToken, params, profile, done) => {
    try {
      console.log('OAuth callback received:', {
        accessToken: accessToken?.substring(0, 10) + '...',
        refreshToken: refreshToken?.substring(0, 10) + '...',
        params
      });

      // Store the tokens in the user session
      const user = {
        accessToken,
        refreshToken,
        tokenParams: params
      };

      // Get user profile from WHOOP API
      console.log('Fetching user profile...');
      const userResponse = await axios.get('https://api.prod.whoop.com/developer/v1/activity/sleep', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-version': '2',
          'User-Agent': 'Light90/1.0.0',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        params: {
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        }
      });

      console.log('Sleep data received:', {
        records: userResponse.data?.records?.length || 0,
        cycles: userResponse.data?.cycles?.length || 0,
        data: JSON.stringify(userResponse.data, null, 2)
      });
      user.profile = userResponse.data;

      // Also log the user object we're storing
      console.log('User object being stored:', {
        hasAccessToken: !!user.accessToken,
        hasRefreshToken: !!user.refreshToken,
        tokenParams: user.tokenParams,
        profile: {
          records: user.profile?.records?.length || 0,
          cycles: user.profile?.cycles?.length || 0
        }
      });

      return done(null, user);
    } catch (error) {
      console.error('Error in OAuth callback:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        stack: error.stack
      });
      return done(error);
    }
  }
);

// Add error handling to OAuth strategy
whoopStrategy.error = function(err) {
  console.error('OAuth Strategy Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    oauthError: err.oauthError
  });
};

// Add token exchange error handling
whoopStrategy._oauth2.getOAuthAccessToken = function(code, params, callback) {
  params = params || {};
  const formData = {
    grant_type: 'authorization_code',
    code: code,
    client_id: this._clientId,
    client_secret: this._clientSecret,
    redirect_uri: process.env.REDIRECT_URI
  };

  // Debug log for production environment
  if (process.env.NODE_ENV === 'production') {
    console.log('Production OAuth Debug:', {
      clientIdLength: this._clientId?.length,
      clientSecretLength: this._clientSecret?.length,
      redirectUri: process.env.REDIRECT_URI,
      envVars: {
        WHOOP_CLIENT_ID_length: process.env.WHOOP_CLIENT_ID?.length,
        WHOOP_CLIENT_SECRET_length: process.env.WHOOP_CLIENT_SECRET?.length,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  }

  console.log('Token exchange params:', {
    ...formData,
    client_id: formData.client_id?.substring(0, 10) + '...',
    client_secret: formData.client_secret?.substring(0, 10) + '...',
    code: formData.code?.substring(0, 10) + '...'
  });

  const formBody = Object.entries(formData)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  this._request(
    'POST',
    this._getAccessTokenUrl(),
    {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'api-version': '2',
      'User-Agent': 'Light90/1.0.0'
    },
    formBody,
    null,
    function(error, data, response) {
      if (error) {
        console.error('Token exchange error:', {
          error: {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode
          },
          data,
          response: {
            statusCode: response?.statusCode,
            headers: response?.headers
          }
        });
        callback(error);
      } else {
        console.log('Token exchange success:', {
          data: typeof data === 'string' ? 'raw string' : 'parsed object',
          response: {
            statusCode: response?.statusCode,
            headers: response?.headers
          }
        });

        var results;
        try {
          results = JSON.parse(data);
        } catch(e) {
          return callback(e);
        }

        callback(null, results.access_token, results.refresh_token, results);
      }
    }
  );
};

passport.use('whoop', whoopStrategy);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/auth/status', (req, res) => {
  console.log('Auth status check:', {
    session: req.session,
    user: req.user ? {
      ...req.user,
      accessToken: req.user.accessToken?.substring(0, 10) + '...',
      refreshToken: req.user.refreshToken?.substring(0, 10) + '...'
    } : null
  });

  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user ? {
      ...req.user,
      accessToken: req.user.accessToken?.substring(0, 10) + '...',
      refreshToken: req.user.refreshToken?.substring(0, 10) + '...'
    } : null
  });
});

app.get('/auth/whoop', (req, res, next) => {
  console.log('Initiating WHOOP OAuth flow...');

  passport.authenticate('whoop', {
    scope: ['offline', 'read:sleep', 'read:profile'],
    state: true,
    response_type: 'code'
  })(req, res, next);
});

app.get('/auth/whoop/callback',
  (req, res, next) => {
    console.log('Received callback request:', {
      query: req.query,
      headers: req.headers,
      session: req.session
    });

    passport.authenticate('whoop', {
      failureRedirect: '/login',
      failWithError: true,
      session: true
    })(req, res, next);
  },
  (req, res) => {
    console.log('OAuth callback successful, user:', {
      ...req.user,
      accessToken: req.user.accessToken?.substring(0, 10) + '...',
      refreshToken: req.user.refreshToken?.substring(0, 10) + '...'
    });

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error('Error saving session:', err);
      }
      res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
    });
  }
);

// WHOOP API endpoints
app.get('/api/v1/sleep', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { start_date, end_date } = req.query;
    console.log('Fetching sleep data...', { start_date, end_date });

    const response = await axios.get('https://api.prod.whoop.com/developer/v1/activity/sleep', {
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-version': '2',
        'User-Agent': 'Light90/1.0.0',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      params: {
        start_date,
        end_date
      }
    });

    console.log('Sleep data fetched:', {
      records: response.data?.records?.length || 0,
      cycles: response.data?.cycles?.length || 0,
      data: JSON.stringify(response.data, null, 2)
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching sleep data:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message
    });
  }
});

app.get('/api/v1/profile', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log('Fetching user profile...');
    const response = await axios.get('https://api.prod.whoop.com/developer/v1/user/basic', {
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-version': '2',
        'User-Agent': 'Light90/1.0.0',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    console.log('Profile data fetched:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching profile:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Global Error Handler:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    status: err.status,
    oauthError: err.oauthError
  });
  res.status(err.status || 500).json({ error: err.message });
});

app.use((req, res) => {
  console.error('404 Not Found:', {
    method: req.method,
    url: req.url,
    headers: req.headers
  });
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.url
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
});