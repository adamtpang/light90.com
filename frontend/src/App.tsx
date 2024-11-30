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
  Tooltip,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import BedtimeIcon from '@mui/icons-material/Bedtime';
import LogoutIcon from '@mui/icons-material/ExitToApp';
import SettingsIcon from '@mui/icons-material/Settings';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LaptopIcon from '@mui/icons-material/Laptop';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { format, addMinutes, differenceInMinutes, subDays, parseISO } from 'date-fns';
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

interface WhoopData {
  sleepData: SleepData[];
  recoveryData: {
    date: string;
    score: number;
    restingHeartRate: number;
    hrvMs: number;
  }[];
  workoutData: {
    date: string;
    strain: number;
    duration: number;
    kilojoules: number;
  }[];
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
  const [whoopData, setWhoopData] = useState<WhoopData>({
    sleepData: [],
    recoveryData: [],
    workoutData: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [sleepData, setSleepData] = useState<SleepData | null>(null);
  const [lightExposure, setLightExposure] = useState<LightExposure | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [sunTimes, setSunTimes] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: '', password: '' });
  const [countdowns, setCountdowns] = useState<{
    sunlight: number | null;
    coffee: number | null;
  }>({ sunlight: null, coffee: null });
  const isMobile = useMediaQuery('(max-width:600px)');
  const [loginUrl, setLoginUrl] = useState<string | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/status`, {
          credentials: 'include' // Important for session cookies
        });
        const data = await response.json();

        if (data.authenticated) {
          setAuthenticated(true);
          setUser(data.user);
          fetchWhoopData();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();
  }, []);

  const handleWhoopLogin = () => {
    // Redirect to WHOOP OAuth
    window.location.href = `${API_URL}/auth/whoop`;
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        credentials: 'include'
      });
      setAuthenticated(false);
      setUser(null);
      setWhoopData({
        sleepData: [],
        recoveryData: [],
        workoutData: []
      });
      setSleepData(null);
      setLightExposure(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const fetchWhoopData = async (): Promise<void> => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);

    try {
      console.log('Starting data fetch...');
      const endDate = new Date();
      const startDate = subDays(endDate, 7);
      const dateRange = {
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString()
      };

      // Get sleep data
      const sleepResponse = await fetch(
        `${API_URL}/api/v1/cycle/sleep?start=${dateRange.start_time}&end=${dateRange.end_time}`,
        {
          credentials: 'include'
        }
      );

      if (!sleepResponse.ok) {
        throw new Error(`Sleep API failed: ${sleepResponse.status}`);
      }

      const sleepData = await sleepResponse.json();
      console.log('Sleep data:', sleepData);

      // Get recovery data
      const recoveryResponse = await fetch(
        `${API_URL}/api/v1/cycle/recovery?start=${dateRange.start_time}&end=${dateRange.end_time}`,
        {
          credentials: 'include'
        }
      );

      if (!recoveryResponse.ok) {
        throw new Error(`Recovery API failed: ${recoveryResponse.status}`);
      }

      const recoveryData = await recoveryResponse.json();
      console.log('Recovery data:', recoveryData);

      // Get workout data
      const workoutResponse = await fetch(
        `${API_URL}/api/v1/cycle/workout?start=${dateRange.start_time}&end=${dateRange.end_time}`,
        {
          credentials: 'include'
        }
      );

      if (!workoutResponse.ok) {
        throw new Error(`Workout API failed: ${workoutResponse.status}`);
      }

      const workoutData = await workoutResponse.json();
      console.log('Workout data:', workoutData);

      // Process and combine all data
      const processedSleepData = sleepData.cycles
        .filter((sleep: any) => sleep.state === 'complete')
        .map((sleep: any) => ({
          startTime: sleep.start,
          endTime: sleep.end,
          qualityScore: Math.round((sleep.score?.quality || 0) * 100)
        }))
        .sort((a: SleepData, b: SleepData) =>
          new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        );

      const processedRecoveryData = recoveryData.cycles
        .map((recovery: any) => ({
          date: recovery.timestamp,
          score: Math.round(recovery.score?.recovery || 0),
          restingHeartRate: recovery.score?.resting_heart_rate || 0,
          hrvMs: recovery.score?.hrv_rmssd || 0
        }))
        .sort((a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      const processedWorkoutData = workoutData.cycles
        .map((workout: any) => ({
          date: workout.start,
          strain: Math.round(workout.score?.strain || 0),
          duration: workout.duration || 0,
          kilojoules: workout.kilojoules || 0
        }))
        .sort((a: any, b: any) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      setWhoopData({
        sleepData: processedSleepData,
        recoveryData: processedRecoveryData,
        workoutData: processedWorkoutData
      });

      if (processedSleepData.length > 0) {
        setSleepData(processedSleepData[0]);
      } else {
        setError('No recent sleep data found');
      }

    } catch (error) {
      console.error('Error fetching WHOOP data:', error);
      if (error instanceof Error && error.message.includes('401')) {
        // Token expired, try to refresh
        try {
          const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include'
          });

          if (refreshResponse.ok) {
            // Retry the data fetch
            return fetchWhoopData();
          } else {
            // Refresh failed, user needs to login again
            setAuthenticated(false);
            setUser(null);
            setError('Session expired. Please login again.');
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          setError('Session expired. Please login again.');
        }
      } else {
        setError(`Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle PWA install prompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
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
      <Container maxWidth="lg" className="App">
        <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Welcome to Light90
              </Typography>
              <Typography variant="body1" paragraph>
                Optimize your sunlight exposure and coffee timing for better energy and sleep.
              </Typography>
              {!authenticated ? (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleWhoopLogin}
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
                  {user && (
                    <Typography variant="body2" sx={{ mr: 2, alignSelf: 'center' }}>
                      Connected as {user.profile?.user?.firstName || 'User'}
                    </Typography>
                  )}
                  <Button
                    size="small"
                    onClick={handleLogout}
                    startIcon={<LogoutIcon />}
                  >
                    Disconnect WHOOP
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {!authenticated ? (
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
                    <span>
                      <IconButton onClick={handleInstallClick} disabled={!installPrompt}>
                        <PhoneAndroidIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Enable Desktop Notifications">
                    <span>
                      <IconButton onClick={requestNotificationPermission} disabled={notificationsEnabled}>
                        <LaptopIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <>
              {authenticated && (
                <>
                  {error && (
                    <Paper sx={{ p: 2, bgcolor: 'error.dark' }}>
                      <Typography color="error">{error}</Typography>
                    </Paper>
                  )}

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {sleepData && (
                        <>
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
                                Sleep quality score: {sleepData.qualityScore}%
                              </Typography>
                            </CardContent>
                          </Card>

                          {whoopData.sleepData.length > 0 && (
                            <Grid container spacing={3} sx={{ mt: 2 }}>
                              <Grid item xs={12} md={6}>
                                <Card>
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                      Sleep Quality Trend
                                    </Typography>
                                    <ResponsiveContainer width="100%" height={300}>
                                      <AreaChart data={whoopData.sleepData.slice().reverse()}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="startTime"
                                          tickFormatter={(time) => format(new Date(time), 'MMM d')}
                                        />
                                        <YAxis domain={[0, 100]} />
                                        <RechartsTooltip
                                          formatter={(value: number) => [`${value}%`, 'Sleep Quality']}
                                          labelFormatter={(time) => format(new Date(time), 'MMM d, yyyy')}
                                        />
                                        <Area
                                          type="monotone"
                                          dataKey="qualityScore"
                                          stroke="#ffd700"
                                          fill="#ffd700"
                                          fillOpacity={0.3}
                                        />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </CardContent>
                                </Card>
                              </Grid>

                              <Grid item xs={12} md={6}>
                                <Card>
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                      Wake Time Pattern
                                    </Typography>
                                    <ResponsiveContainer width="100%" height={300}>
                                      <LineChart data={whoopData.sleepData.slice().reverse()}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="endTime"
                                          tickFormatter={(time) => format(new Date(time), 'MMM d')}
                                        />
                                        <YAxis
                                          tickFormatter={(time) => format(new Date(time), 'h:mm a')}
                                          domain={['dataMin', 'dataMax']}
                                        />
                                        <RechartsTooltip
                                          labelFormatter={(time) => format(new Date(time), 'MMM d, yyyy')}
                                          formatter={(value: string) => [format(new Date(value), 'h:mm a'), 'Wake Time']}
                                        />
                                        <Line
                                          type="monotone"
                                          dataKey="endTime"
                                          stroke="#ffd700"
                                          dot={{ fill: '#ffd700' }}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </CardContent>
                                </Card>
                              </Grid>
                            </Grid>
                          )}

                          <Card sx={{ mt: 2 }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <WbSunnyIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Morning Sunlight</Typography>
                              </Box>
                              <Typography variant="body1">
                                {optimalTimes?.morning.possible ? (
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

                          <Card sx={{ mt: 2 }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CoffeeIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Optimal Coffee Time</Typography>
                              </Box>
                              <Typography variant="body1">
                                {optimalCoffee ? (
                                  `Wait until ${renderTimeRecommendation(optimalCoffee.start)} (${renderCountdown(countdowns.coffee)} from now)`
                                ) : (
                                  'Calculating...'
                                )}
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
                                {optimalTimes?.afternoon.possible ? (
                                  `Get 10-30 minutes of sunlight between ${renderTimeRecommendation(optimalTimes.afternoon.start)} and ${renderTimeRecommendation(optimalTimes.afternoon.end)}`
                                ) : (
                                  'Not possible due to sunrise/sunset times'
                                )}
                              </Typography>
                            </CardContent>
                          </Card>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Box>

        <Dialog open={loginOpen} onClose={() => setLoginOpen(false)}>
          <DialogTitle>Connect your WHOOP</DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1">
                Click the button below to connect your WHOOP account. You'll be redirected to WHOOP to authorize access.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleWhoopLogin}
                startIcon={<WbSunnyIcon />}
              >
                Connect with WHOOP
              </Button>
            </Box>
          </DialogContent>
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
