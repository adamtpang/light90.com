const express = require('express');
const cors = require('cors');
const axios = require('axios');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const session = require('express-session');
const MongoStore = require('connect-mongo');
require('dotenv').config();

// Log environment variables (remove in production)
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
  WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID ? 'Set' : 'Not set',
  WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET ? 'Set' : 'Not set',
  REDIRECT_URI: process.env.REDIRECT_URI,
  CLIENT_URL: process.env.CLIENT_URL
});

const app = express();
const port = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Session configuration with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
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
    scope: ['offline', 'read:recovery', 'read:cycles', 'read:sleep', 'read:profile', 'read:workout']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const userResponse = await axios.get('https://api.whoop.com/v1/user/profile', {
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

// Auth routes
app.get('/auth/whoop', passport.authenticate('whoop'));

app.get('/auth/whoop/callback',
  passport.authenticate('whoop', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
  }
);

// ... rest of your routes ...

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});