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
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import CoffeeIcon from '@mui/icons-material/Coffee';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LaptopIcon from '@mui/icons-material/Laptop';
import { format, addMinutes, differenceInMinutes, subDays } from 'date-fns';
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
  start_time: string;
  end_time: string;
  score: number;
}

interface VitalUser {
  user_id: string;
  provider: string;
  connected: boolean;
}

const App: React.FC = () => {
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<VitalUser | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [sunTimes, setSunTimes] = useState<any>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [countdowns, setCountdowns] = useState<{
    sunlight: number | null;
    coffee: number | null;
  }>({ sunlight: null, coffee: null });
  const isMobile = useMediaQuery('(max-width:600px)');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const connectWhoop = () => {
    window.location.href = `${API_URL}/auth/whoop`;
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/status`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (data.authenticated) {
          setUser(data.user);
          fetchSleepData();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setError('Failed to check authentication status');
      }
    };

    checkAuth();
  }, []);

  const fetchSleepData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 7);

      const response = await fetch(
        `${API_URL}/api/v1/sleep?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`Sleep API failed: ${response.status}`);
      }

      const data = await response.json();
      setSleepData(data.cycles.map((sleep: any) => ({
        start_time: sleep.start,
        end_time: sleep.end,
        score: Math.round((sleep.score?.quality || 0) * 100)
      })));
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      setError('Failed to fetch sleep data');
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
    if (sleepData.length > 0 && sunTimes) {
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
    if (sleepData.length === 0) return;

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
    if (sleepData.length === 0 || !sunTimes) return null;

    const latestSleep = sleepData[0];
    const wakeTime = new Date(latestSleep.end_time);
    const sunrise = new Date(sunTimes.sunrise);
    const sunset = new Date(sunTimes.sunset);

    const morningStart = wakeTime;
    const morningEnd = addMinutes(wakeTime, 120);

    const nextBedtime = new Date(latestSleep.start_time);
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
    if (sleepData.length === 0) return null;

    const latestSleep = sleepData[0];
    const wakeTime = new Date(latestSleep.end_time);
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
              {!user ? (
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={connectWhoop}
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
                  <Typography variant="body2" sx={{ mr: 2, alignSelf: 'center' }}>
                    Connected to WHOOP
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {!user ? (
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
                  {sleepData.length > 0 && (
                    <>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <BedtimeIcon sx={{ mr: 1 }} />
                            <Typography variant="h6">Sleep Schedule</Typography>
                          </Box>
                          <Typography variant="body1">
                            Last night's sleep: {format(new Date(sleepData[0].start_time), 'h:mm a')} - {format(new Date(sleepData[0].end_time), 'h:mm a')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Sleep quality score: {sleepData[0].score}%
                          </Typography>
                        </CardContent>
                      </Card>

                      <Grid container spacing={3} sx={{ mt: 2 }}>
                        <Grid item xs={12} md={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                Sleep Quality Trend
                              </Typography>
                              <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={sleepData.slice().reverse()}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis
                                    dataKey="start_time"
                                    tickFormatter={(time) => format(new Date(time), 'MMM d')}
                                  />
                                  <YAxis domain={[0, 100]} />
                                  <RechartsTooltip
                                    formatter={(value: number) => [`${value}%`, 'Sleep Quality']}
                                    labelFormatter={(time) => format(new Date(time), 'MMM d, yyyy')}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="score"
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
                                <LineChart data={sleepData.slice().reverse()}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis
                                    dataKey="end_time"
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
                                    dataKey="end_time"
                                    stroke="#ffd700"
                                    dot={{ fill: '#ffd700' }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>

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
        </Box>

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
