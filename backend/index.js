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

const app = express();

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => {
      console.log(`Redis reconnect attempt ${retries}`);
      if (retries > 10) {
        console.error('Max Redis reconnection attempts reached');
        return new Error('Max Redis reconnection attempts reached');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    details: err
  });
});

redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('ready', () => console.log('Redis client ready'));
redisClient.on('reconnecting', () => console.log('Redis client reconnecting'));
redisClient.on('end', () => console.log('Redis client connection ended'));

// Connect to Redis
(async () => {
  try {
    console.log('Attempting to connect to Redis with URL pattern:',
      process.env.REDIS_URL.replace(/\/\/[^@]+@/, '//***:***@')
    );
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error
    });
    // Don't exit process, allow the reconnection strategy to work
    // process.exit(1);
  }
})();

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

// Session configuration with Redis
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
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

// Start server
const PORT = process.env.PORT || 8080;

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('=== Server Started ===');
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      CLIENT_URL: process.env.CLIENT_URL,
      REDIRECT_URI: process.env.REDIRECT_URI,
      CORS_ORIGIN: corsOptions.origin,
      REDIS_CONNECTED: redisClient.isOpen
    });
    console.log('===================');
  });

  // Add server error handler
  server.on('error', (error) => {
    console.error('Server error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
} catch (error) {
  console.error('Failed to start server:', {
    message: error.message,
    stack: error.stack
  });
  process.exit(1);
}