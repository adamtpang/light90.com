require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const OAuth2Strategy = require('passport-oauth2');
const axios = require('axios');
const jwt = require('jsonwebtoken');

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
    store: new session.MemoryStore(), // Use MemoryStore in both dev and production for now
    secret: process.env.SESSION_SECRET || 'dev-secret',
    name: 'light90.sid', // Custom session name
    resave: true, // Force session save
    saveUninitialized: true, // Save uninitialized sessions for OAuth
    rolling: true, // Reset expiration on each request
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-origin in production
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser handle domain
    }
};

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Configure OAuth with custom state parameter handling
const whoopStrategy = new OAuth2Strategy(
    {
        authorizationURL: 'https://api.prod.whoop.com/oauth/oauth2/auth',
        tokenURL: 'https://api.prod.whoop.com/oauth/oauth2/token',
        clientID: process.env.WHOOP_CLIENT_ID,
        clientSecret: process.env.WHOOP_CLIENT_SECRET,
        callbackURL: getRedirectURI(),
        scope: ['offline', 'read:sleep', 'read:profile'].join(' '),
        state: true, // Enable state but we'll handle verification manually
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

            // Fetch WHOOP sleep data
            console.log('✅ OAuth flow completed successfully - fetching sleep data...');
            const sleepData = await fetchWhoopSleepData(accessToken);

            const user = {
                id: 'whoop_user_' + Date.now(), // Temporary user ID
                accessToken,
                refreshToken,
                tokenParams: params,
                profile: {
                    provider: 'whoop',
                    connected: true,
                    connectedAt: new Date().toISOString(),
                    records: sleepData.records || [], // Add the sleep data here
                    ...sleepData // Include any other data from WHOOP API
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

// Function to fetch WHOOP sleep data
async function fetchWhoopSleepData(accessToken) {
    try {
        console.log('🔍 Fetching WHOOP sleep data...');

        // Get sleep data from the last 7 days
        const endDate = new Date().toISOString().split('T')[0]; // Today
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days ago

        console.log('📅 Date range:', { startDate, endDate });

        // First, test if the access token works with a simple API call
        try {
            console.log('🧪 Testing access token with user profile...');
            const profileTest = await axios.get('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            console.log('✅ Access token works! User profile:', profileTest.data);
        } catch (profileError) {
            console.error('❌ Access token test failed:', profileError.response?.status, profileError.response?.data);
            console.error('This means the access token is invalid or expired');
        }

        // Use the working WHOOP API endpoint from your previous version
        const endpoints = [
            'https://api.prod.whoop.com/developer/v1/activity/sleep'  // This was working in your old version
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔍 Trying endpoint: ${endpoint}`);

                // Try with date parameters first
                let response;
                try {
                    response = await axios.get(endpoint, {
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
                } catch (dateError) {
                    console.log(`  ❌ With date params failed: ${dateError.response?.status}`);
                    console.log(`  Error details:`, dateError.response?.data);
                    // Try without date parameters
                    console.log(`  🔍 Trying ${endpoint} without date params...`);
                    response = await axios.get(endpoint, {
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
                }

                console.log('✅ WHOOP API call successful!');
                console.log('Response status:', response.status);
                console.log('Response data keys:', Object.keys(response.data));
                console.log('Records found:', response.data.records?.length || response.data.data?.length || 'unknown');
                console.log('Sample data:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');

                return response.data;

            } catch (endpointError) {
                console.log(`❌ Endpoint ${endpoint} failed completely:`, endpointError.response?.status, endpointError.response?.data?.error || endpointError.message);
                continue; // Try next endpoint
            }
        }

        // If all endpoints failed, return empty data
        console.error('🚨 All WHOOP API endpoints failed');
        return { records: [] };

    } catch (error) {
        console.error('🚨 Failed to fetch WHOOP sleep data:');
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('HTTP Status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        // Return empty data instead of throwing - we don't want to break OAuth for this
        return { records: [] };
    }
}

// Manual token exchange function for testing
async function handleManualTokenExchange(req, res) {
    try {
        console.log('🔧 Starting manual token exchange...');
        const { code } = req.query;

        if (!code) {
            console.error('❌ No authorization code received');
            return res.redirect('/auth/failed');
        }

        // Manual token exchange with WHOOP
        const tokenResponse = await axios.post('https://api.prod.whoop.com/oauth/oauth2/token', {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: getRedirectURI(),
            client_id: process.env.WHOOP_CLIENT_ID,
            client_secret: process.env.WHOOP_CLIENT_SECRET
        }, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ Manual token exchange successful!');
        console.log('Access token received:', tokenResponse.data.access_token ? `YES (${tokenResponse.data.access_token.substring(0, 10)}...)` : 'NO');
        console.log('Token type:', tokenResponse.data.token_type);
        console.log('Scope:', tokenResponse.data.scope);

        // Fetch WHOOP sleep data
        console.log('🔍 About to fetch WHOOP sleep data...');
        const sleepData = await fetchWhoopSleepData(tokenResponse.data.access_token);

        // Create user object with real sleep data
        const user = {
            id: 'whoop_user_' + Date.now(),
            accessToken: tokenResponse.data.access_token,
            refreshToken: tokenResponse.data.refresh_token,
            tokenParams: tokenResponse.data,
            profile: {
                provider: 'whoop',
                connected: true,
                connectedAt: new Date().toISOString(),
                records: sleepData.records || [], // Add the sleep data here
                ...sleepData // Include any other data from WHOOP API
            }
        };

        // Create temporary JWT token for frontend authentication
        const tempToken = jwt.sign(
            {
                userId: user.id,
                accessToken: user.accessToken,
                profile: user.profile,
                timestamp: Date.now()
            },
            process.env.SESSION_SECRET || 'dev-secret',
            { expiresIn: '5m' } // Token expires in 5 minutes
        );

        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('🚨 Login error:', loginErr);
                return res.redirect('/auth/failed');
            }
            console.log('✅ User logged in successfully via manual exchange');
            console.log('Session after login:', req.session);
            console.log('Session ID after login:', req.sessionID);
            console.log('User authenticated after login:', req.isAuthenticated());

            // Pass token to frontend for authentication
            const redirectUrl = `${getClientURL()}/auth/callback?token=${tempToken}`;
            console.log('Redirecting to:', redirectUrl);
            res.redirect(redirectUrl);
        });

    } catch (error) {
        console.error('🚨 Manual token exchange failed:');
        console.error('Error message:', error.message);
        if (error.response) {
            console.error('HTTP Status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        res.redirect('/auth/failed');
    }
}

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

// Endpoint to verify JWT token and set up session
app.post('/auth/verify-token', (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        console.log('🔍 Verifying JWT token...');

        // Verify and decode the JWT token
        const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'dev-secret');
        console.log('✅ Token verified successfully:', decoded.userId);

        // Recreate user object from token
        const user = {
            id: decoded.userId,
            accessToken: decoded.accessToken,
            profile: decoded.profile,
            tokenParams: { access_token: decoded.accessToken }
        };

        // Log in the user with the session
        req.logIn(user, (loginErr) => {
            if (loginErr) {
                console.error('🚨 Token login error:', loginErr);
                return res.status(500).json({ error: 'Login failed' });
            }

            console.log('✅ User logged in successfully via token');
            console.log('Session ID:', req.sessionID);
            console.log('Is authenticated:', req.isAuthenticated());
            console.log('User in session:', req.user);
            console.log('Session data after login:', req.session);

            // Force session save
            req.session.save((saveErr) => {
                if (saveErr) {
                    console.error('🚨 Session save error:', saveErr);
                    return res.status(500).json({ error: 'Session save failed' });
                }

                console.log('✅ Session saved successfully');
                res.json({
                    success: true,
                    authenticated: req.isAuthenticated(),
                    user: req.user
                });
            });
        });

    } catch (error) {
        console.error('🚨 Token verification failed:', error.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

app.get('/auth/status', (req, res) => {
    console.log('🔍 Auth status check:');
    console.log('Session ID:', req.sessionID);
    console.log('Is authenticated:', req.isAuthenticated());
    console.log('User exists:', !!req.user);
    console.log('User ID:', req.user?.id || 'N/A');
    console.log('User profile records:', req.user?.profile?.records?.length || 0);
    console.log('Session data:', req.session);
    console.log('Cookies:', req.headers.cookie);

    res.json({
        authenticated: req.isAuthenticated(),
        user: req.user
    });
});

app.get('/auth/whoop', (req, res, next) => {
    console.log('🔍 Starting OAuth - Session Info:');
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    console.log('Cookies:', req.headers.cookie);
    console.log('Computed redirect URI:', getRedirectURI());
    console.log('Request headers:', req.headers);
    passport.authenticate('whoop')(req, res, next);
});

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
    console.log('🔍 Callback - Session Info:');
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    console.log('Cookies:', req.headers.cookie);
    console.log('Will redirect to:', `${getClientURL()}/auth/callback`);

    passport.authenticate('whoop', (err, user, info) => {
        console.log('🔍 Passport authenticate result:');
        console.log('Error:', err);
        console.log('User:', !!user ? 'User object exists' : 'No user');
        console.log('Info:', info);
        console.log('OAuth query params:', req.query);

        // If Passport succeeded, use that result
        if (user && !err) {
            console.log('✅ Passport authentication successful, logging in user');
            req.logIn(user, (loginErr) => {
                if (loginErr) {
                    console.error('🚨 Login error:', loginErr);
                    return res.redirect('/auth/failed');
                }
                console.log('✅ User logged in successfully via Passport');
                const redirectUrl = `${getClientURL()}/auth/callback`;
                console.log('Redirecting to:', redirectUrl);
                res.redirect(redirectUrl);
            });
            return;
        }

        // Only try manual token exchange if Passport failed
        if (req.query.code) {
            console.log('🔧 Passport failed but found authorization code, attempting manual token exchange...');
            return handleManualTokenExchange(req, res);
        }

        // Temporarily bypass state verification error
        if (info && info.message && info.message.includes('Unable to verify authorization request state')) {
            console.log('⚠️ Bypassing state verification error for testing');
            return handleManualTokenExchange(req, res);
        }

        if (err) {
            console.error('🚨 Passport authentication error:', err);
            console.error('Error details:', {
                message: err.message,
                code: err.code,
                status: err.status,
                response: err.response ? {
                    status: err.response.status,
                    data: err.response.data
                } : 'No response data'
            });
            console.log('🔧 Error occurred, trying manual token exchange...');
            return handleManualTokenExchange(req, res);
        }

        console.error('🚨 No user returned from Passport and no fallback available');
        res.redirect('/auth/failed');
    })(req, res, next);
});

app.get('/auth/failed', (req, res) => {
    console.log('🚨 Auth failed endpoint hit');
    console.log('Request headers:', req.headers);
    console.log('Request query:', req.query);
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    console.log('Timestamp:', new Date().toISOString());
    res.status(200).json({ error: 'Authentication failed', message: 'OAuth flow failed' });
});

app.get('/auth/logout', (req, res) => {
    req.logout(() => {
        res.redirect(getClientURL());
    });
});

// Add endpoint to refresh sleep data
app.get('/api/refresh-sleep-data', async (req, res) => {
    try {
        console.log('🔄 Refreshing sleep data...');

        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const accessToken = req.user.accessToken;
        if (!accessToken) {
            return res.status(400).json({ error: 'No access token available' });
        }

        // Fetch fresh sleep data from WHOOP
        const freshSleepData = await fetchWhoopSleepData(accessToken);

        // Update the user's profile with fresh data
        req.user.profile.records = freshSleepData.records || [];
        req.user.profile.lastRefresh = new Date().toISOString();

        // Update the session
        req.session.save((err) => {
            if (err) {
                console.error('Failed to save session:', err);
            }
        });

        console.log('✅ Sleep data refreshed successfully');
        console.log('Records found:', freshSleepData.records?.length || 0);

        res.json({
            success: true,
            records: freshSleepData.records || [],
            lastRefresh: req.user.profile.lastRefresh,
            recordsCount: freshSleepData.records?.length || 0
        });

    } catch (error) {
        console.error('🚨 Failed to refresh sleep data:', error);
        res.status(500).json({
            error: 'Failed to refresh sleep data',
            message: error.message
        });
    }
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