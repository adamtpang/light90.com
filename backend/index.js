require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');

// Function to get the correct redirect URI based on environment
const getRedirectURI = () => {
    if (process.env.NODE_ENV === 'production') {
        return 'https://light90-backend-production.up.railway.app/auth/whoop/callback';
    }
    return 'http://localhost:5000/auth/whoop/callback';
};

// Function to get the correct client URL based on environment
const getClientURL = () => {
    if (process.env.NODE_ENV === 'production') {
        return 'https://light90.com';
    }
    return 'http://localhost:3000';
};

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
    REDIRECT_URI: JSON.stringify(process.env.REDIRECT_URI),
    COMPUTED_CLIENT_URL: JSON.stringify(getClientURL()),
    COMPUTED_REDIRECT_URI: JSON.stringify(getRedirectURI())
});

const app = express();

// Basic middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? getClientURL()
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
        callbackURL: getRedirectURI(),
        scope: ['offline', 'read:sleep', 'read:profile'].join(' '),
        state: true,
        customHeaders: {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    },
    async (accessToken, refreshToken, params, profile, done) => {
        try {
            console.log('🔐 OAuth token exchange successful!');
            console.log('Access Token received:', accessToken ? `YES (length: ${accessToken.length})` : 'NO');
            console.log('Refresh Token received:', refreshToken ? `YES (length: ${refreshToken.length})` : 'NO');
            console.log('Token params:', JSON.stringify(params, null, 2));

            // For now, let's just complete OAuth without additional API calls
            // We can fetch user data later once OAuth is working
            console.log('✅ OAuth flow completed successfully - skipping user profile fetch for now');

            const user = {
                id: 'whoop_user_' + Date.now(), // Temporary user ID
                accessToken,
                refreshToken,
                tokenParams: params,
                profile: {
                    provider: 'whoop',
                    connected: true,
                    connectedAt: new Date().toISOString()
                }
            };

            console.log('User object created:', JSON.stringify(user, null, 2));
            return done(null, user);
        } catch (error) {
            console.error('🚨 OAuth strategy error details:');
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            if (error.response) {
                console.error('HTTP Status:', error.response.status);
                console.error('Response data:', error.response.data);
                console.error('Response headers:', error.response.headers);
            }
            console.error('Full error:', error);
            return done(error);
        }
    }
);

passport.use('whoop', whoopStrategy);

// Routes
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        NODE_ENV: process.env.NODE_ENV,
        COMPUTED_CLIENT_URL: getClientURL(),
        COMPUTED_REDIRECT_URI: getRedirectURI()
    });
});

// Debug endpoint to check environment values
app.get('/debug/env', (req, res) => {
    res.json({
        NODE_ENV: process.env.NODE_ENV,
        CLIENT_URL: process.env.CLIENT_URL,
        REDIRECT_URI: process.env.REDIRECT_URI,
        COMPUTED_CLIENT_URL: getClientURL(),
        COMPUTED_REDIRECT_URI: getRedirectURI(),
        timestamp: new Date().toISOString()
    });
});

// DEV TESTING ROUTE - allows triggering the notification without waiting
app.get('/dev/simulate-wakeup', (req, res) => {
    if (process.env.NODE_ENV !== 'production') {
        // Simulate the wake-up notification logic here
        const minutes = parseInt(req.query.minutes || '0', 10);
        const simulatedWakeupTime = new Date(Date.now() - (minutes * 60 * 1000));
        const caffeineTime = new Date(simulatedWakeupTime.getTime() + (90 * 60 * 1000));
        const minutesUntilCaffeine = Math.max(0, 90 - minutes);

        console.log(`[DEV] Simulating wake-up from ${simulatedWakeupTime.toISOString()}`);
        console.log(`[DEV] Ideal first caffeine intake time: ${caffeineTime.toISOString()}`);

        // Determine notification action based on timing
        let notificationAction = 'none';
        let notificationMessage = '';

        if (minutesUntilCaffeine === 0) {
            // It's time for caffeine now!
            notificationAction = 'immediate';
            notificationMessage = '☕ Time for your first caffeine! Get some sunlight too! ☀️';
            console.log(`[DEV] 🔔 TRIGGERING IMMEDIATE NOTIFICATION: ${notificationMessage}`);
        } else if (minutesUntilCaffeine > 0) {
            // Schedule future notification
            notificationAction = 'scheduled';
            notificationMessage = `☕ First caffeine reminder scheduled for ${minutesUntilCaffeine} minutes from now`;
            console.log(`[DEV] ⏰ SCHEDULING NOTIFICATION: ${notificationMessage}`);
        } else {
            // Past optimal time
            notificationAction = 'missed';
            notificationMessage = `⚠️ Optimal caffeine window was ${Math.abs(minutesUntilCaffeine)} minutes ago. Consider timing tomorrow!`;
            console.log(`[DEV] ⚠️ MISSED WINDOW: ${notificationMessage}`);
        }

        res.json({
            success: true,
            message: 'Wake-up simulation triggered for caffeine timing.',
            simulatedWakeupTime,
            idealCaffeineIntakeTime: caffeineTime,
            minutesSinceWakeup: minutes,
            minutesUntilCaffeine,
            notificationAction,
            notificationMessage,
            shouldTriggerNotification: notificationAction === 'immediate'
        });
    } else {
        res.status(404).json({ error: 'Endpoint not available in production' });
    }
});

app.get('/auth/status', (req, res) => {
    res.json({
        authenticated: req.isAuthenticated(),
        user: req.user
    });
});

app.get('/auth/whoop', passport.authenticate('whoop'));

// Simple validation endpoint for WHOOP
app.get('/callback/whoop', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Multiple callback endpoints for testing
app.get('/callback', (req, res) => {
    res.set({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
    });
    res.status(200).json({ status: 'ok', service: 'whoop-oauth' });
});

app.get('/oauth/callback', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'whoop-oauth' });
});

// Keep the original callback as backup
app.get('/auth/whoop/callback', (req, res, next) => {
    // If no OAuth parameters, this is a validation request - return 200 OK
    if (!req.query.code && !req.query.error && !req.query.state) {
        return res.status(200).json({
            status: 'ready',
            message: 'WHOOP OAuth callback endpoint is ready',
            timestamp: new Date().toISOString()
        });
    }

    // Otherwise, handle the OAuth callback
    console.log('OAuth callback triggered with query:', req.query);
    console.log('Will redirect to:', `${getClientURL()}/auth/callback`);

    passport.authenticate('whoop', {
        failureRedirect: '/auth/failed',
        failureMessage: true
    })(req, res, (err) => {
        if (err) {
            console.error('🚨 OAuth callback error:', err);
            console.error('Error details:', {
                message: err.message,
                code: err.code,
                status: err.status
            });
            return res.redirect('/auth/failed');
        }
        const redirectUrl = `${getClientURL()}/auth/callback`;
        console.log('Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
    });
});

app.get('/auth/failed', (req, res) => {
    res.status(401).json({ error: 'Authentication failed' });
});

app.get('/auth/logout', (req, res) => {
    req.logout(() => {
        res.redirect(getClientURL());
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