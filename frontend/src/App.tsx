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
  CircularProgress,
  Divider,
  Alert,
  AlertTitle
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
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import TimelineIcon from '@mui/icons-material/Timeline';
import { format, addMinutes, differenceInMinutes, subDays } from 'date-fns';
import { getTimes } from 'suncalc';

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
  id: number;
  user_id: number;
  start: string;
  end: string;
  score: {
    sleep_performance_percentage: number;
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
    };
  };
}

interface VitalUser {
  user_id: string;
  provider: string;
  connected: boolean;
  profile: {
    records: SleepData[];
    next_token: string;
  };
  tokenParams: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };
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
  const [showAlert, setShowAlert] = useState<{show: boolean; type: 'sunlight' | 'coffee' | null; message: string}>({
    show: false,
    type: null,
    message: ''
  });

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
          console.log('Auth data:', {
            authenticated: data.authenticated,
            user: data.user,
            profile: data.user?.profile,
            sleepRecords: data.user?.profile?.records
          });
          setUser(data.user);
          if (data.user?.profile?.records) {
            const mainSleepRecords = data.user.profile.records
              .filter((record: any) => !record.nap)
              .sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
            setSleepData(mainSleepRecords);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setError('Failed to check authentication status');
      }
    };

    checkAuth();
  }, []);

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
      const updateCountdowns = () => {
        const now = new Date();
        const optimalTimes = calculateOptimalSunlight();
        const optimalCoffee = calculateOptimalCoffee();

        if (optimalTimes && optimalCoffee) {
          const sunlightDiff = differenceInMinutes(optimalTimes.morning.start, now);
          const coffeeDiff = differenceInMinutes(optimalCoffee.start, now);

          // Only update if the countdowns have changed
          setCountdowns(prev => {
            if (prev.sunlight !== sunlightDiff || prev.coffee !== coffeeDiff) {
              return {
                sunlight: sunlightDiff,
                coffee: coffeeDiff
              };
            }
            return prev;
          });
        }
      };

      // Initial update
      updateCountdowns();

      // Update every minute
      const interval = setInterval(updateCountdowns, 60000);
      return () => clearInterval(interval);
    }
  }, [sleepData, sunTimes]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      }
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  };

  const sendTestNotification = async (type: 'sunlight' | 'coffee') => {
    try {
      const messages = {
        sunlight: {
          title: '☀️ Time for Morning Sunlight!',
          body: 'Get 10-30 minutes of sunlight now to boost your energy and regulate your sleep cycle.'
        },
        coffee: {
          title: '☕ Perfect Time for Coffee!',
          body: 'Your cortisol has dropped - this is the optimal time for your first coffee.'
        }
      };

      // Show banner alert
      setShowAlert({
        show: true,
        type,
        message: `${messages[type].title} ${messages[type].body}`
      });

      // Play notification sound
      const audio = new Audio('/notification.wav');
      audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
      });

      // Auto-hide alert after 10 seconds
      setTimeout(() => {
        setShowAlert({ show: false, type: null, message: '' });
      }, 10000);

    } catch (error) {
      console.error('Error sending notification:', error);
      alert('There was an error sending the notification.');
    }
  };

  // Request notification permission when component mounts
  useEffect(() => {
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    } else {
      requestNotificationPermission();
    }
  }, []);

  const scheduleNotifications = () => {
    if (sleepData.length === 0 || !sunTimes) return;

    const optimalTimes = calculateOptimalSunlight();
    const optimalCoffee = calculateOptimalCoffee();
    const now = new Date();

    if (optimalTimes && optimalCoffee) {
      // Schedule morning sunlight notification
      if (optimalTimes.morning.possible && optimalTimes.morning.start > now) {
        const sunlightDelay = optimalTimes.morning.start.getTime() - now.getTime();
        console.log('Scheduling morning sunlight notification for:', {
          wakeTime: format(optimalTimes.morning.start, 'h:mm a'),
          delay: Math.round(sunlightDelay / 1000 / 60) + ' minutes'
        });

        setTimeout(() => {
          new Notification('Time for Morning Sunlight! ☀️', {
            body: `Get 10-30 minutes of sunlight between ${format(optimalTimes.morning.start, 'h:mm a')} and ${format(optimalTimes.morning.end, 'h:mm a')} for optimal energy`,
            icon: '/logo192.svg'
          });
        }, sunlightDelay);
      } else {
        console.log('Morning sunlight notification not scheduled:', {
          isPossible: optimalTimes.morning.possible,
          wakeTime: format(optimalTimes.morning.start, 'h:mm a'),
          sunrise: format(new Date(sunTimes.sunrise), 'h:mm a'),
          sunset: format(new Date(sunTimes.sunset), 'h:mm a')
        });
      }

      // Schedule coffee notification
      if (optimalCoffee.start > now) {
        const coffeeDelay = optimalCoffee.start.getTime() - now.getTime();
        console.log('Scheduling coffee notification for:', {
          time: format(optimalCoffee.start, 'h:mm a'),
          delay: Math.round(coffeeDelay / 1000 / 60) + ' minutes'
        });

        setTimeout(() => {
          new Notification('Optimal Coffee Time! ☕', {
            body: `It's the perfect time for your first cup of coffee (90 minutes after waking at ${format(optimalCoffee.start, 'h:mm a')})`,
            icon: '/logo192.svg'
          });
        }, coffeeDelay);
      } else {
        console.log('Coffee notification not scheduled:', {
          optimalTime: format(optimalCoffee.start, 'h:mm a'),
          currentTime: format(now, 'h:mm a')
        });
      }

      // Schedule afternoon sunlight notification
      if (optimalTimes.afternoon.possible && optimalTimes.afternoon.start > now) {
        const afternoonDelay = optimalTimes.afternoon.start.getTime() - now.getTime();
        console.log('Scheduling afternoon sunlight notification for:', {
          time: format(optimalTimes.afternoon.start, 'h:mm a'),
          delay: Math.round(afternoonDelay / 1000 / 60) + ' minutes'
        });

        setTimeout(() => {
          new Notification('Afternoon Sunlight Time! 🌤️', {
            body: `Get 10-30 minutes of sunlight between ${format(optimalTimes.afternoon.start, 'h:mm a')} and ${format(optimalTimes.afternoon.end, 'h:mm a')} for better sleep`,
            icon: '/logo192.svg'
          });
        }, afternoonDelay);
      } else {
        console.log('Afternoon sunlight notification not scheduled:', {
          isPossible: optimalTimes.afternoon.possible,
          plannedTime: format(optimalTimes.afternoon.start, 'h:mm a'),
          sunset: format(new Date(sunTimes.sunset), 'h:mm a')
        });
      }
    }
  };

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
    }
  };

  const formatTimeIfValid = (date: Date | string | null | undefined) => {
    if (!date) return 'N/A';
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'N/A';
      return format(dateObj, 'h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Adjust sunrise time by -30 minutes for Guam
  const adjustSunriseTime = (sunriseTime: Date) => {
    return new Date(sunriseTime.getTime() - 30 * 60 * 1000); // subtract 30 minutes
  };

  const calculateOptimalSunlight = React.useCallback(() => {
    if (sleepData.length === 0 || !sunTimes) return null;

    try {
      const latestSleep = sleepData[0];
      const wakeTime = new Date(latestSleep.end);
      const sunrise = sunTimes?.sunrise ? adjustSunriseTime(new Date(sunTimes.sunrise)) : null;
      const sunset = sunTimes?.sunset ? new Date(sunTimes.sunset) : null;

      if (isNaN(wakeTime.getTime())) return null;

      const morningStart = wakeTime;
      const morningEnd = addMinutes(wakeTime, 120);

      const nextBedtime = new Date(latestSleep.start);
      if (isNaN(nextBedtime.getTime())) return null;

      nextBedtime.setDate(nextBedtime.getDate() + 1);
      const afternoonStart = addMinutes(nextBedtime, -360);
      const afternoonEnd = addMinutes(nextBedtime, -240);

      return {
        morning: {
          start: morningStart,
          end: morningEnd,
          possible: sunrise && sunset ? morningStart >= sunrise && morningEnd <= sunset : true
        },
        afternoon: {
          start: afternoonStart,
          end: afternoonEnd,
          possible: sunrise && sunset ? afternoonStart >= sunrise && afternoonEnd <= sunset : true
        }
      };
    } catch (error) {
      console.error('Error calculating optimal sunlight:', error);
      return null;
    }
  }, [sleepData, sunTimes]);

  const calculateOptimalCoffee = React.useCallback(() => {
    if (sleepData.length === 0) return null;

    try {
      const latestSleep = sleepData[0];
      const wakeTime = new Date(latestSleep.end);

      if (isNaN(wakeTime.getTime())) return null;

      const optimalStart = addMinutes(wakeTime, 90);
      const optimalEnd = addMinutes(wakeTime, 120);

      return {
        start: optimalStart,
        end: optimalEnd
      };
    } catch (error) {
      console.error('Error calculating optimal coffee time:', error);
      return null;
    }
  }, [sleepData]);

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

  // Preload the notification sound
  useEffect(() => {
    const audio = new Audio('/notification.wav');
    audio.load();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" className="App">
        {showAlert.show && (
          <Alert
            severity="info"
            sx={{
              position: 'fixed',
              top: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: '90%',
              maxWidth: 600,
              boxShadow: 3
            }}
            onClose={() => setShowAlert({ show: false, type: null, message: '' })}
          >
            {showAlert.message}
          </Alert>
        )}
        <Box>
          <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Welcome to Light90
                </Typography>
                <Typography variant="body1" paragraph>
                  Optimize your sunlight exposure and coffee timing for better energy and sleep.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                  {!user ? (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={connectWhoop}
                      startIcon={<WbSunnyIcon />}
                    >
                      Connect WHOOP
                    </Button>
                  ) : (
                    <Alert severity="success" sx={{ width: '100%' }}>
                      <AlertTitle>Connected to WHOOP</AlertTitle>
                      We'll analyze your sleep patterns and send you personalized notifications for optimal sunlight and coffee timing.
                    </Alert>
                  )}
                </Box>

                {user && (
                  <>
                    <Typography variant="h6" gutterBottom>
                      What to Expect
                    </Typography>
                    <Box sx={{ pl: 2, mb: 3 }}>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        Based on your WHOOP wake-up time, Light90 will notify you:
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                        <WbSunnyIcon sx={{ mr: 1 }} />
                        When to get your morning sunlight
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                        <CoffeeIcon sx={{ mr: 1 }} />
                        When to have your first cup of coffee
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>
                      Get Notifications On Your Device
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Choose your preferred device:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
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
                      {notificationsEnabled && (
                        <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                          <NotificationsActiveIcon sx={{ mr: 1 }} fontSize="small" />
                          Notifications enabled
                        </Typography>
                      )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" gutterBottom>
                      Test Notifications
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Try out how the notifications will look:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                      <Button
                        variant="outlined"
                        startIcon={<WbSunnyIcon />}
                        onClick={() => sendTestNotification('sunlight')}
                        disabled={!('Notification' in window)}
                      >
                        Test Sunlight Alert
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<CoffeeIcon />}
                        onClick={() => sendTestNotification('coffee')}
                        disabled={!('Notification' in window)}
                      >
                        Test Coffee Alert
                      </Button>
                    </Box>

                    {user?.profile?.records && user.profile.records.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          This Morning's Timeline
                        </Typography>
                        {(() => {
                          const latestSleep = user.profile.records[0];
                          const wakeTime = new Date(latestSleep.end);
                          const sunrise = sunTimes?.sunrise ? adjustSunriseTime(new Date(sunTimes.sunrise)) : null;
                          const now = new Date();

                          // Calculate optimal times
                          const optimalSunlightTime = sunrise && wakeTime > sunrise ? wakeTime : sunrise;
                          const optimalCoffeeTime = wakeTime ? addMinutes(wakeTime, 90) : null;

                          return (
                            <Box sx={{ pl: 2, mb: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <BedtimeIcon sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                  Wake time: {formatTimeIfValid(wakeTime)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <WbSunnyIcon sx={{ mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                  Sunrise: {formatTimeIfValid(sunrise)} (adjusted for Guam)
                                </Typography>
                              </Box>
                              <Box sx={{ borderLeft: '2px solid #ffd700', pl: 2, ml: 1 }}>
                                <Box sx={{ position: 'relative', mb: 2 }}>
                                  <Box sx={{
                                    width: 12,
                                    height: 12,
                                    bgcolor: '#ffd700',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    left: -27,
                                    top: 6
                                  }} />
                                  <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    {formatTimeIfValid(optimalSunlightTime)}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {wakeTime && sunrise && wakeTime > sunrise
                                      ? "You woke up after sunrise - notification sent immediately to get morning light"
                                      : "Sunrise notification - optimal time for morning light exposure"}
                                  </Typography>
                                </Box>
                                <Box sx={{ position: 'relative', mb: 2 }}>
                                  <Box sx={{
                                    width: 12,
                                    height: 12,
                                    bgcolor: '#ffd700',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    left: -27,
                                    top: 6
                                  }} />
                                  <Typography variant="body1" sx={{ mb: 0.5 }}>
                                    {formatTimeIfValid(optimalCoffeeTime)}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    Optimal coffee time - cortisol levels have naturally dropped
                                  </Typography>
                                </Box>
                              </Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                                {now > wakeTime
                                  ? "This is what would have happened if Light90 was enabled this morning"
                                  : "This is what will happen tomorrow morning"}
                              </Typography>
                            </Box>
                          );
                        })()}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;
