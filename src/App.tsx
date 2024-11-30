import React, { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Card,
  CardContent,
  useMediaQuery,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  IconButton,
  Tooltip
} from '@mui/material';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import SettingsIcon from '@mui/icons-material/Settings';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LaptopIcon from '@mui/icons-material/Laptop';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { getTimes } from 'suncalc';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffd700',
    },
    secondary: {
      main: '#6d4c41',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

interface SleepData {
  startTime: string;
  endTime: string;
  qualityScore: number;
}

interface LightExposure {
  date: string;
  duration: number;
}

interface LoginCredentials {
  email: string;
  password: string;
}

const App: React.FC = () => {
  const [whoopAccessToken, setWhoopAccessToken] = useState<string | null>(localStorage.getItem('whoopAccessToken'));
  const [sleepData, setSleepData] = useState<SleepData | null>(null);
  const [lightExposure, setLightExposure] = useState<LightExposure | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [sunTimes, setSunTimes] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' });
  const [countdowns, setCountdowns] = useState<{
    sunlight: number | null;
    coffee: number | null;
  }>({ sunlight: null, coffee: null });
  const isMobile = useMediaQuery('(max-width:600px)');

  // Handle PWA install prompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  // Handle notifications permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    }
  }, []);

  useEffect(() => {
    if (location) {
      const times = getTimes(new Date(), location.lat, location.lon);
      setSunTimes(times);
    }
  }, [location]);

  // Update countdowns every minute
  useEffect(() => {
    if (sleepData && sunTimes) {
      const interval = setInterval(() => {
        const now = new Date();
        const optimalTimes = calculateOptimalSunlight();
        const optimalCoffee = calculateOptimalCoffee();

        if (optimalTimes && optimalCoffee) {
          setCountdowns({
            sunlight: differenceInMinutes(optimalTimes.morning.start, now),
            coffee: differenceInMinutes(optimalCoffee.start, now)
          });
        }
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [sleepData, sunTimes]);

  const handleWhoopLogin = async () => {
    try {
      const response = await fetch('https://api-7.whoop.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'password',
          username: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      const token = data.access_token;
      localStorage.setItem('whoopAccessToken', token);
      setWhoopAccessToken(token);
      setLoginOpen(false);
      fetchSleepData();
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('whoopAccessToken');
    setWhoopAccessToken(null);
    setSleepData(null);
    setLightExposure(null);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');
      if (permission === 'granted') {
        scheduleNotifications();
      }
    }
  };

  const scheduleNotifications = () => {
    if (!sleepData) return;

    const optimalTimes = calculateOptimalSunlight();
    const optimalCoffee = calculateOptimalCoffee();

    if (optimalTimes && optimalCoffee) {
      const now = new Date();
      const sunlightTime = optimalTimes.morning.start;
      const coffeeTime = optimalCoffee.start;

      if (sunlightTime > now) {
        setTimeout(() => {
          new Notification('Time for Morning Sunlight! ☀️', {
            body: 'Get 10-30 minutes of sunlight for optimal energy',
            icon: '/logo192.svg'
          });
        }, sunlightTime.getTime() - now.getTime());
      }

      if (coffeeTime > now) {
        setTimeout(() => {
          new Notification('Optimal Coffee Time! ☕', {
            body: 'It\'s the perfect time for your first cup of coffee',
            icon: '/logo192.svg'
          });
        }, coffeeTime.getTime() - now.getTime());
      }
    }
  };

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  const fetchSleepData = async () => {
    if (!whoopAccessToken) return;

    try {
      const response = await fetch('https://api-7.whoop.com/v1/activities/sleep', {
        headers: {
          'Authorization': `Bearer ${whoopAccessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sleep data');
      }

      const data = await response.json();
      if (data.records && data.records.length > 0) {
        const latestSleep = data.records[0];
        setSleepData({
          startTime: latestSleep.start,
          endTime: latestSleep.end,
          qualityScore: latestSleep.score
        });
        scheduleNotifications();
      }
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      setError('Error fetching sleep data. Please try again.');
    }
  };

  const calculateOptimalSunlight = () => {
    if (!sleepData || !sunTimes) return null;

    const wakeTime = new Date(sleepData.endTime);
    const sunrise = new Date(sunTimes.sunrise);
    const sunset = new Date(sunTimes.sunset);

    const morningStart = wakeTime;
    const morningEnd = addMinutes(wakeTime, 120);

    const nextBedtime = new Date(sleepData.startTime);
    nextBedtime.setDate(nextBedtime.getDate() + 1);
    const afternoonStart = addMinutes(nextBedtime, -360);
    const afternoonEnd = addMinutes(nextBedtime, -240);

    return {
      morning: {
        start: morningStart,
        end: morningEnd,
        possible: morningStart >= sunrise && morningEnd <= sunset
      },
      afternoon: {
        start: afternoonStart,
        end: afternoonEnd,
        possible: afternoonStart >= sunrise && afternoonEnd <= sunset
      }
    };
  };

  const calculateOptimalCoffee = () => {
    if (!sleepData) return null;

    const wakeTime = new Date(sleepData.endTime);
    const optimalStart = addMinutes(wakeTime, 90);
    const optimalEnd = addMinutes(wakeTime, 120);

    return {
      start: optimalStart,
      end: optimalEnd
    };
  };

  const renderTimeRecommendation = (time: Date) => {
    return format(time, 'h:mm a');
  };

  const renderCountdown = (minutes: number | null) => {
    if (minutes === null) return '';
    if (minutes < 0) return 'Now!';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const optimalTimes = calculateOptimalSunlight();
  const optimalCoffee = calculateOptimalCoffee();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="sm" className="App">
        <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Welcome to Light90
              </Typography>
              <Typography variant="body1" paragraph>
                Optimize your sunlight exposure and coffee timing for better energy and sleep.
              </Typography>
              {!whoopAccessToken ? (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setLoginOpen(true)}
                    startIcon={<WbSunnyIcon />}
                  >
                    Connect WHOOP
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setHowItWorksOpen(true)}
                  >
                    How It Works
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Tooltip title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}>
                    <IconButton
                      size="small"
                      onClick={requestNotificationPermission}
                      color={notificationsEnabled ? 'primary' : 'default'}
                    >
                      <NotificationsIcon />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    onClick={() => setShowSettings(!showSettings)}
                    startIcon={<SettingsIcon />}
                  >
                    Settings
                  </Button>
                  <Button
                    size="small"
                    onClick={handleLogout}
                    startIcon={<LogoutIcon />}
                  >
                    Logout
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {!whoopAccessToken ? (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Install the App
                </Typography>
                <Typography variant="body2" paragraph>
                  Get notifications on your preferred device:
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Tooltip title="Install on Phone">
                    <IconButton onClick={handleInstallClick} disabled={!installPrompt}>
                      <PhoneAndroidIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Enable Desktop Notifications">
                    <IconButton onClick={requestNotificationPermission} disabled={notificationsEnabled}>
                      <LaptopIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <>
              {error && (
                <Paper sx={{ p: 2, bgcolor: 'error.dark' }}>
                  <Typography color="error">{error}</Typography>
                </Paper>
              )}

              {optimalTimes && optimalCoffee && sleepData && (
                <>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WbSunnyIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Morning Sunlight</Typography>
                      </Box>
                      <Typography variant="body1">
                        {optimalTimes.morning.possible ? (
                          `Get 10-30 minutes of sunlight between ${renderTimeRecommendation(optimalTimes.morning.start)} and ${renderTimeRecommendation(optimalTimes.morning.end)}`
                        ) : (
                          'Not possible due to sunrise/sunset times'
                        )}
                      </Typography>
                      {countdowns.sunlight !== null && (
                        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                          Time until sunlight: {renderCountdown(countdowns.sunlight)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CoffeeIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Optimal Coffee Time</Typography>
                      </Box>
                      <Typography variant="body1">
                        Have your coffee between {renderTimeRecommendation(optimalCoffee.start)} and {renderTimeRecommendation(optimalCoffee.end)}
                      </Typography>
                      {countdowns.coffee !== null && (
                        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                          Time until coffee: {renderCountdown(countdowns.coffee)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WbSunnyIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Afternoon Sunlight</Typography>
                      </Box>
                      <Typography variant="body1">
                        {optimalTimes.afternoon.possible ? (
                          `Get 10-30 minutes of sunlight between ${renderTimeRecommendation(optimalTimes.afternoon.start)} and ${renderTimeRecommendation(optimalTimes.afternoon.end)}`
                        ) : (
                          'Not possible due to sunrise/sunset times'
                        )}
                      </Typography>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <BedtimeIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">Sleep Schedule</Typography>
                      </Box>
                      <Typography variant="body1">
                        Last night's sleep: {format(new Date(sleepData.startTime), 'h:mm a')} - {format(new Date(sleepData.endTime), 'h:mm a')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sleep quality score: {sleepData.qualityScore}
                      </Typography>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </Box>

        <Dialog open={loginOpen} onClose={() => setLoginOpen(false)}>
          <DialogTitle>Connect your WHOOP</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLoginOpen(false)}>Cancel</Button>
            <Button onClick={handleWhoopLogin} variant="contained" color="primary">
              Connect
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={howItWorksOpen}
          onClose={() => setHowItWorksOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>How It Works</DialogTitle>
          <DialogContent>
            <Stepper orientation="vertical">
              <Step active={true}>
                <StepLabel>Connect Your WHOOP</StepLabel>
                <StepContent>
                  <Typography>
                    Light90 uses your WHOOP sleep data to know exactly when you wake up,
                    helping time your sunlight and coffee perfectly each day.
                  </Typography>
                </StepContent>
              </Step>
              <Step active={true}>
                <StepLabel>Get Smart Notifications</StepLabel>
                <StepContent>
                  <Typography>
                    Choose how you want to be notified:
                    <ul>
                      <li>Install as a mobile app for push notifications</li>
                      <li>Enable desktop notifications in your browser</li>
                    </ul>
                    We'll alert you at the optimal times for sunlight and coffee.
                  </Typography>
                </StepContent>
              </Step>
              <Step active={true}>
                <StepLabel>Follow Your Personalized Schedule</StepLabel>
                <StepContent>
                  <Typography>
                    Based on your wake time and local sunrise:
                    <ul>
                      <li>Get morning sunlight within 2 hours of waking</li>
                      <li>Wait 90 minutes after waking for coffee</li>
                      <li>Get afternoon sunlight 4-6 hours before bedtime</li>
                    </ul>
                  </Typography>
                </StepContent>
              </Step>
            </Stepper>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setHowItWorksOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </ThemeProvider>
  );
};

export default App;
