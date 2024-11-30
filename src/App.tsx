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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  useMediaQuery
} from '@mui/material';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import SettingsIcon from '@mui/icons-material/Settings';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';
import { format, addMinutes, differenceInMinutes } from 'date-fns';
import { getTimes } from 'suncalc';
import './App.css';

const theme = createTheme({
  palette: {
    primary: { main: '#2196f3' },
    secondary: { main: '#ff9800' },
    background: { default: '#f5f5f5' },
  },
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
});

interface SleepData {
  date: string;
  wakeTime: string;
  sleepScore: number;
  sleepNeed: number;
  sleepQuality: number;
}

interface UserPreferences {
  sunlightDelayMinutes: number;
  coffeeDelayMinutes: number;
}

interface TimingScenario {
  wakeTime: Date;
  sunriseTime: Date;
  explanation: string;
  recommendation: string;
}

function App() {
  const [isWhoopConnected, setIsWhoopConnected] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [lastWakeTime, setLastWakeTime] = useState<Date | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [whoopCredentials, setWhoopCredentials] = useState({ email: '', password: '' });
  const [preferences, setPreferences] = useState<UserPreferences>({
    sunlightDelayMinutes: 0,
    coffeeDelayMinutes: 90,
  });
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [nextSunrise, setNextSunrise] = useState<Date | null>(null);
  const [activeScenario, setActiveScenario] = useState(0);
  const [userLocation, setUserLocation] = useState({ latitude: 37.7749, longitude: -122.4194 }); // Default to SF
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Example scenarios to demonstrate different timing situations
  const scenarios: TimingScenario[] = [
    {
      wakeTime: new Date(new Date().setHours(5, 0, 0, 0)),
      sunriseTime: new Date(new Date().setHours(7, 0, 0, 0)),
      explanation: "Waking up before sunrise",
      recommendation: "Wait for sunrise to get your morning light. We'll notify you when it's time!"
    },
    {
      wakeTime: new Date(new Date().setHours(7, 30, 0, 0)),
      sunriseTime: new Date(new Date().setHours(7, 0, 0, 0)),
      explanation: "Waking up just after sunrise",
      recommendation: "Get outside right away for your morning light exposure!"
    },
    {
      wakeTime: new Date(new Date().setHours(9, 0, 0, 0)),
      sunriseTime: new Date(new Date().setHours(7, 0, 0, 0)),
      explanation: "Waking up well after sunrise",
      recommendation: "Get outside as soon as possible for your morning light!"
    }
  ];

  useEffect(() => {
    // Get user's location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to San Francisco coordinates (already set in state)
        }
      );
    }
  }, []);

  useEffect(() => {
    // Calculate next sunrise using user's location
    const times = getTimes(new Date(), userLocation.latitude, userLocation.longitude);
    const sunrise = new Date(times.sunrise);

    if (sunrise < new Date()) {
      // If today's sunrise has passed, get tomorrow's
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = getTimes(tomorrow, userLocation.latitude, userLocation.longitude);
      setNextSunrise(new Date(tomorrowTimes.sunrise));
    } else {
      setNextSunrise(sunrise);
    }

    // Check notifications and Whoop connection
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }

    const storedAuth = localStorage.getItem('whoopAuth');
    if (storedAuth) {
      setIsWhoopConnected(true);
      fetchLastWakeTime();
      fetchSleepData();
    }
  }, [userLocation]);

  const handleLogout = () => {
    localStorage.removeItem('whoopAuth');
    setIsWhoopConnected(false);
    setLastWakeTime(null);
    setSleepData([]);
  };

  const handleWhoopLogin = async () => {
    try {
      const response = await fetch('https://api-7.whoop.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'password',
          username: whoopCredentials.email,
          password: whoopCredentials.password,
        }),
      });

      if (response.ok) {
        const auth = await response.json();
        localStorage.setItem('whoopAuth', JSON.stringify(auth));
        setIsWhoopConnected(true);
        await Promise.all([fetchLastWakeTime(), fetchSleepData()]);
        setLoginOpen(false);
      } else {
        alert('Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Error logging in to Whoop:', error);
      alert('Connection error. Please try again.');
    }
  };

  const fetchSleepData = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('whoopAuth') || '{}');
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Get last 7 days

      const response = await fetch(
        `https://api-7.whoop.com/users/me/cycles/sleep?start=${startDate.toISOString().split('T')[0]}`,
        {
          headers: { 'Authorization': `Bearer ${auth.access_token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSleepData(data.records.map((record: any) => ({
          date: new Date(record.start).toLocaleDateString(),
          wakeTime: new Date(record.wake_time).toLocaleTimeString(),
          sleepScore: record.score || 0,
          sleepNeed: record.need_seconds / 3600 || 0,
          sleepQuality: record.quality || 0,
        })));
      }
    } catch (error) {
      console.error('Error fetching sleep data:', error);
    }
  };

  const fetchLastWakeTime = async () => {
    try {
      const auth = JSON.parse(localStorage.getItem('whoopAuth') || '{}');
      const today = new Date().toISOString().split('T')[0];

      const response = await fetch(
        `https://api-7.whoop.com/users/me/cycles/sleep?start=${today}`,
        {
          headers: { 'Authorization': `Bearer ${auth.access_token}` }
        }
      );

      if (response.ok) {
        const sleepData = await response.json();
        if (sleepData.records && sleepData.records.length > 0) {
          setLastWakeTime(new Date(sleepData.records[0].wake_time));
        }
      }
    } catch (error) {
      console.error('Error fetching sleep data:', error);
    }
  };

  const getTimingRecommendation = (wakeTime: Date, sunriseTime: Date) => {
    const diffMinutes = differenceInMinutes(sunriseTime, wakeTime);

    if (diffMinutes > 0) {
      return `Wait ${diffMinutes} minutes for sunrise`;
    } else if (diffMinutes > -120) {
      return "Get outside now for optimal light exposure!";
    } else {
      return "Get outside as soon as possible for morning light";
    }
  };

  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === 'granted');

      if (permission === 'granted' && lastWakeTime) {
        scheduleNotifications(lastWakeTime);
      }
    }
  };

  const scheduleNotifications = (wakeTime: Date) => {
    const sunlightTime = new Date(wakeTime.getTime() + preferences.sunlightDelayMinutes * 60000);
    const coffeeTime = new Date(wakeTime.getTime() + preferences.coffeeDelayMinutes * 60000);

    if (sunlightTime > new Date()) {
      new Notification('Time for Morning Sunlight! ☀️', {
        body: 'Get outside for some natural light within 2 hours of waking',
      });
    }

    if (coffeeTime > new Date()) {
      setTimeout(() => {
        new Notification('Coffee Time! ☕', {
          body: `It's been ${preferences.coffeeDelayMinutes} minutes since you woke up - perfect time for coffee!`,
        });
      }, coffeeTime.getTime() - Date.now());
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 4,
          background: 'linear-gradient(180deg, #f5f5f5 0%, #e0e0e0 100%)'
        }}>
          {/* Hero Section */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h1" gutterBottom>
              Light90 ☀️
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
              Optimize your sunlight and coffee timing for better energy and sleep
            </Typography>
            {nextSunrise && (
              <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                Next sunrise: {format(nextSunrise, 'h:mm a')}
              </Typography>
            )}
          </Box>

          {/* How It Works Section */}
          <Paper elevation={3} sx={{ p: 4, mb: 4, width: '100%', maxWidth: 800 }}>
            <Typography variant="h2" gutterBottom>
              How It Works
            </Typography>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom color="primary">
                1. Connect Your Whoop
              </Typography>
              <Typography paragraph>
                Light90 uses your Whoop sleep data to know exactly when you wake up.
                This helps us time your sunlight and coffee perfectly each day.
              </Typography>

              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 3 }}>
                2. Smart Notifications
              </Typography>
              <Typography paragraph>
                Based on your wake time and local sunrise, we'll notify you at the optimal times:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography>• Get sunlight within 2 hours of waking</Typography>
                <Typography>• Wait 90 minutes after waking for coffee</Typography>
              </Box>

              <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 3 }}>
                3. Personalized Timing
              </Typography>
              <Typography paragraph>
                If you wake up before sunrise, we'll notify you when the sun comes up.
                If you wake up after sunrise, we'll remind you to get outside right away.
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              Current Status
            </Typography>
            {nextSunrise && (
              <Typography color="primary" sx={{ mb: 2 }}>
                Next sunrise: {format(nextSunrise, 'h:mm a')}
              </Typography>
            )}
            {lastWakeTime && (
              <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
                <Typography>
                  Last wake time: {format(lastWakeTime, 'h:mm a')}
                </Typography>
                <Typography color="primary" sx={{ mt: 1 }}>
                  {getTimingRecommendation(lastWakeTime, nextSunrise || new Date())}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Connect Section */}
          <Paper elevation={3} sx={{ p: 4, mb: 4, width: '100%', maxWidth: 800 }}>
            <Typography variant="h2" gutterBottom>
              Get Started
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => setLoginOpen(true)}
                disabled={isWhoopConnected}
              >
                {isWhoopConnected ? 'Connected to Whoop ✓' : 'Connect Whoop'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={enableNotifications}
                disabled={notificationsEnabled}
              >
                {notificationsEnabled ? 'Notifications Enabled ✓' : 'Enable Notifications'}
              </Button>
            </Box>
          </Paper>
        </Box>

        {/* Login Dialog */}
        <Dialog open={loginOpen} onClose={() => setLoginOpen(false)}>
          <DialogTitle>Connect your Whoop</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              value={whoopCredentials.email}
              onChange={(e) => setWhoopCredentials(prev => ({
                ...prev,
                email: e.target.value
              }))}
            />
            <TextField
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              value={whoopCredentials.password}
              onChange={(e) => setWhoopCredentials(prev => ({
                ...prev,
                password: e.target.value
              }))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLoginOpen(false)}>Cancel</Button>
            <Button onClick={handleWhoopLogin} variant="contained">
              Connect
            </Button>
          </DialogActions>
        </Dialog>

        {/* Settings Drawer */}
        <Drawer
          anchor="right"
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        >
          <Box sx={{ width: 300, p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Settings
            </Typography>

            <Typography gutterBottom>
              Sunlight Delay (minutes)
            </Typography>
            <Slider
              value={preferences.sunlightDelayMinutes}
              onChange={(_, value) => setPreferences(prev => ({
                ...prev,
                sunlightDelayMinutes: value as number
              }))}
              min={0}
              max={120}
              valueLabelDisplay="auto"
            />

            <Typography gutterBottom sx={{ mt: 2 }}>
              Coffee Delay (minutes)
            </Typography>
            <Slider
              value={preferences.coffeeDelayMinutes}
              onChange={(_, value) => setPreferences(prev => ({
                ...prev,
                coffeeDelayMinutes: value as number
              }))}
              min={30}
              max={180}
              valueLabelDisplay="auto"
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Sleep Data
            </Typography>
            <List>
              {sleepData.map((day, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <BedtimeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={day.date}
                    secondary={`Wake: ${day.wakeTime} | Score: ${day.sleepScore}`}
                  />
                </ListItem>
              ))}
            </List>

            <Button
              variant="outlined"
              color="error"
              fullWidth
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
              sx={{ mt: 2 }}
            >
              Logout
            </Button>
          </Box>
        </Drawer>
      </Container>
    </ThemeProvider>
  );
}

export default App;
