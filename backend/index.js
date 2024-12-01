require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');

const app = express();
const port = process.env.PORT || 5000;

// Debug environment variables
console.log('Debug - Environment Variables:', {
  WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID,
  NODE_ENV: process.env.NODE_ENV,
  CLIENT_URL: process.env.CLIENT_URL,
  REDIRECT_URI: process.env.REDIRECT_URI
});

// Basic middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body
  });
  next();
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

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
  (accessToken, refreshToken, profile, done) => {
    console.log('OAuth callback received:', { accessToken, refreshToken });
    return done(null, { accessToken, refreshToken });
  }
);

// Add error handling to OAuth strategy
whoopStrategy.error = function(err) {
  console.error('OAuth Strategy Error:', err);
};

passport.use('whoop', whoopStrategy);

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/auth/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user
  });
});

app.get('/auth/whoop', (req, res, next) => {
  console.log('Initiating WHOOP OAuth flow...');
  console.log('OAuth Strategy:', whoopStrategy);
  console.log('OAuth Strategy Options:', whoopStrategy._oauth2);

  passport.authenticate('whoop', {
    scope: ['offline', 'read:sleep', 'read:profile'],
    state: true
  })(req, res, next);
});

app.get('/auth/whoop/callback',
  (req, res, next) => {
    console.log('Received callback request:', {
      query: req.query,
      headers: req.headers
    });
    passport.authenticate('whoop', { failureRedirect: '/login' })(req, res, next);
  },
  (req, res) => {
    console.log('OAuth callback successful, user:', req.user);
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
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