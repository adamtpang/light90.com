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
  AlertTitle,
  Switch
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
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';
import ShareIcon from '@mui/icons-material/Share';
import { format, addMinutes, differenceInMinutes, subDays, formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { getTimes } from 'suncalc';

// Custom theme with light90 colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#FF9933', // Orange from light90 logo
      light: '#FFB366',
      dark: '#CC7A29',
    },
    secondary: {
      main: '#FFD700', // Yellow from light90 logo
      light: '#FFE14D',
      dark: '#CCAC00',
      contrastText: '#000000', // Ensure text is always black on yellow
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '8px',
          padding: '10px 20px',
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
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
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return Notification.permission === 'granted';
  });
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [countdowns, setCountdowns] = useState<{
    sunlight: number | null;
    coffee: number | null;
  }>({ sunlight: null, coffee: null });
  const isSmallScreen = useMediaQuery('(max-width:600px)');
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    type: 'sunlight' | 'coffee' | 'info' | null;
    message: string;
    audio?: HTMLAudioElement;
  }>>([]);
  const [nextAlerts, setNextAlerts] = useState<{
    sunlight: Date | null;
    coffee: Date | null;
  }>({ sunlight: null, coffee: null });
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobileDevice = isIOS || isAndroid;

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
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
      if (!notificationsEnabled) {
        addAlert('info', 'Please enable notifications in the settings below first.');
        return;
      }

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

      // Show countdown message
      const countdownId = addAlert(
        'info',
        'Test notification will appear in 10 seconds. Try turning off your screen to test if notifications work while your phone is locked!'
      );

      // Wait 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Remove countdown message and show actual alert
      removeAlert(countdownId);

      // Create and play looping audio
      const audio = new Audio('/notification.wav');
      audio.loop = true;
      await audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
      });

      // Add the actual notification with its audio
      addAlert(type, `${messages[type].title} ${messages[type].body}`, audio);

    } catch (error) {
      console.error('Error sending notification:', error);
      addAlert('info', 'There was an error sending the notification.');
    }
  };

  // Helper function to add a new alert
  const addAlert = (type: 'sunlight' | 'coffee' | 'info' | null, message: string, audio?: HTMLAudioElement) => {
    const id = Math.random().toString(36).substr(2, 9);
    setAlerts(prev => [...prev, { id, type, message, audio }]);
    return id;
  };

  // Helper function to remove an alert
  const removeAlert = (id: string) => {
    setAlerts(prev => {
      const alertToRemove = prev.find(alert => alert.id === id);
      if (alertToRemove?.audio) {
        alertToRemove.audio.pause();
        alertToRemove.audio.currentTime = 0;
      }
      return prev.filter(alert => alert.id !== id);
    });
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
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
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

  // Adjust sunrise time by -30 minutes for first 30 minutes of sunlight
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

  // Calculate average wake time from last 7 days
  const calculateAverageWakeTime = React.useCallback(() => {
    if (!user?.profile?.records || user.profile.records.length === 0) return null;

    const last7Days = user.profile.records.slice(0, 7);
    const totalMs = last7Days.reduce((sum, record) => {
      const wakeTime = new Date(record.end);
      const wakeHours = wakeTime.getHours();
      const wakeMinutes = wakeTime.getMinutes();
      return sum + (wakeHours * 60 + wakeMinutes) * 60 * 1000;
    }, 0);

    const avgMs = totalMs / last7Days.length;
    const now = new Date();
    const avgWakeTime = new Date(now.setHours(0, 0, 0, 0) + avgMs);

    return avgWakeTime;
  }, [user?.profile?.records]);

  // Update next alert times
  useEffect(() => {
    const avgWakeTime = calculateAverageWakeTime();
    if (!avgWakeTime || !sunTimes?.sunrise) return;

    const adjustedSunrise = adjustSunriseTime(new Date(sunTimes.sunrise));
    const now = new Date();
    let nextSunrise = adjustedSunrise;
    let nextCoffee = new Date(avgWakeTime.getTime() + 90 * 60 * 1000); // 90 minutes after wake

    // If today's times have passed, set for tomorrow
    if (nextSunrise < now) {
      nextSunrise = new Date(nextSunrise.setDate(nextSunrise.getDate() + 1));
    }
    if (nextCoffee < now) {
      nextCoffee = new Date(nextCoffee.setDate(nextCoffee.getDate() + 1));
    }

    setNextAlerts({
      sunlight: nextSunrise,
      coffee: nextCoffee
    });
  }, [sunTimes, calculateAverageWakeTime]);

  // Format countdown with minutes and seconds
  const formatCountdown = (date: Date | null) => {
    if (!date) return 'Calculating...';

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (diffMs < 0) return 'Due now';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  // Update countdown every second instead of every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNextAlerts(prev => ({ ...prev }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Stop sound when alert is dismissed
  const handleAlertClose = () => {
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setAudioRef(null);
    }
    setAlerts(prev => {
      const alertToRemove = prev.find(alert => alert.id === 'info');
      if (alertToRemove?.audio) {
        alertToRemove.audio.pause();
        alertToRemove.audio.currentTime = 0;
      }
      return prev.filter(alert => alert.id !== 'info');
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container
        maxWidth={false}
        sx={{
          backgroundColor: 'background.default',
          minHeight: '100vh',
          py: 4,
        }}
      >
        {/* Stack alerts vertically */}
        <Box sx={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 600,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              severity="info"
              sx={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                borderRadius: 2,
                backgroundColor: '#1976d2',
                color: 'white',
                '& .MuiAlert-icon': {
                  color: 'white'
                },
                '& .MuiAlert-action': {
                  color: 'white'
                }
              }}
              onClose={() => removeAlert(alert.id)}
            >
              {alert.message}
            </Alert>
          ))}
        </Box>

        <Container maxWidth="md">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  color: 'primary.main',
                  fontSize: { xs: '2rem', sm: '2.5rem' },
                }}
              >
                light90.com
              </Typography>
              <Typography
                variant="h6"
                component="h2"
                color="text.secondary"
                sx={{
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  maxWidth: '600px',
                  mx: 'auto',
                }}
              >
                First light. First coffee.
              </Typography>
            </Box>

            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
                {!user ? (
                  <Box sx={{ textAlign: 'center' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={connectWhoop}
                      size="large"
                      sx={{
                        py: 1.5,
                        px: 4,
                        fontSize: '1.1rem',
                        backgroundColor: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                      }}
                    >
                      Connect to WHOOP
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                      What to Expect
                    </Typography>
                    <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 4 }}>
                      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
                        Based on your WHOOP wake-up time, Light90 will notify you:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <WbSunnyIcon sx={{ color: 'secondary.main' }} />
                          <Typography>When to get your morning sunlight</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CoffeeIcon sx={{ color: 'primary.main' }} />
                          <Typography>When to have your first cup of coffee</Typography>
                        </Box>
                      </Box>
                    </Box>

                    {user?.profile?.records && user.profile.records.length > 0 && (
                      <>
                        <Divider sx={{ my: 4 }} />
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                          Today's Timeline
                        </Typography>
                        <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
                          {(() => {
                            const latestSleep = user.profile.records[0];
                            const wakeTime = new Date(latestSleep.end);
                            const sunrise = sunTimes?.sunrise ? adjustSunriseTime(new Date(sunTimes.sunrise)) : null;
                            const now = new Date();

                            // Calculate optimal times
                            const optimalSunlightTime = sunrise && wakeTime > sunrise ? wakeTime : sunrise;
                            const optimalCoffeeTime = wakeTime ? addMinutes(wakeTime, 90) : null;

                            return (
                              <>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <BedtimeIcon sx={{ color: 'text.secondary', mr: 1 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    Wake time: {formatTimeIfValid(wakeTime)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                  <WbSunnyIcon sx={{ color: 'secondary.main', mr: 1 }} />
                                  <Typography variant="body2" color="text.secondary">
                                    Sunrise: {formatTimeIfValid(sunrise)} (adjusted for first light)
                                  </Typography>
                                </Box>
                                <Box sx={{
                                  borderLeft: `2px solid ${theme.palette.secondary.main}`,
                                  pl: 2,
                                  ml: 1,
                                  position: 'relative'
                                }}>
                                  <Box sx={{ position: 'relative', mb: 2 }}>
                                    <Box sx={{
                                      width: 12,
                                      height: 12,
                                      bgcolor: 'secondary.main',
                                      borderRadius: '50%',
                                      position: 'absolute',
                                      left: -27,
                                      top: 6
                                    }} />
                                    <Typography variant="body1" sx={{ mb: 0.5, fontWeight: 500 }}>
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
                                      bgcolor: 'primary.main',
                                      borderRadius: '50%',
                                      position: 'absolute',
                                      left: -27,
                                      top: 6
                                    }} />
                                    <Typography variant="body1" sx={{ mb: 0.5, fontWeight: 500 }}>
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
                              </>
                            );
                          })()}
                        </Box>

                        <Divider sx={{ my: 4 }} />
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                          Estimated Next Alerts
                        </Typography>
                        <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Sunlight alert is based on local sunrise time (adjusted earlier to catch the first light).
                            Coffee alert is based on your average wake time from the last 7 days.
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <WbSunnyIcon sx={{ color: 'secondary.main' }} />
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  Sunlight alert: {nextAlerts.sunlight ? (
                                    <>
                                      {format(nextAlerts.sunlight, 'h:mm a')}
                                      <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                                        (in {formatCountdown(nextAlerts.sunlight)})
                                      </Box>
                                    </>
                                  ) : 'Calculating...'}
                                </Typography>
                              </Box>
                              {nextAlerts.sunlight && (
                                <Typography variant="caption" sx={{ pl: 4, color: 'text.secondary', display: 'block' }}>
                                  Based on sunrise at {sunTimes?.sunrise ? format(new Date(sunTimes.sunrise), 'h:mm a') : '...'}
                                  (adjusted 30min earlier for first light)
                                </Typography>
                              )}
                            </Box>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                <CoffeeIcon sx={{ color: 'primary.main' }} />
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  Coffee alert: {nextAlerts.coffee ? (
                                    <>
                                      {format(nextAlerts.coffee, 'h:mm a')}
                                      <Box component="span" sx={{ color: 'text.secondary', ml: 1 }}>
                                        (in {formatCountdown(nextAlerts.coffee)})
                                      </Box>
                                    </>
                                  ) : 'Calculating...'}
                                </Typography>
                              </Box>
                              {nextAlerts.coffee && (
                                <Typography variant="caption" sx={{ pl: 4, color: 'text.secondary', display: 'block' }}>
                                  Based on average wake time from last {Math.min(7, user?.profile?.records?.length || 0)} days + 90min
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </>
                    )}

                    {/* Mobile instructions */}
                    {isMobileDevice && (
                      <>
                        <Divider sx={{ my: 4 }} />
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                          <PhoneIphoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Get Mobile Notifications
                        </Typography>
                        <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            For the best experience with notifications, add Light90 to your home screen:
                          </Typography>
                          {isIOS ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <Typography variant="body2">
                                1. Tap the <ShareIcon sx={{ verticalAlign: 'middle', width: 20, height: 20 }} /> Share button
                              </Typography>
                              <Typography variant="body2">
                                2. Scroll down and tap "Add to Home Screen"
                              </Typography>
                              <Typography variant="body2">
                                3. Tap "Add" in the top right
                              </Typography>
                            </Box>
                          ) : isAndroid ? (
                            <>
                              {isInstallable ? (
                                <Button
                                  variant="outlined"
                                  startIcon={<AddToHomeScreenIcon />}
                                  onClick={handleInstallClick}
                                  sx={{ mb: 2 }}
                                >
                                  Add to Home Screen
                                </Button>
                              ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <Typography variant="body2">
                                    1. Tap the three dots menu (⋮) in Chrome
                                  </Typography>
                                  <Typography variant="body2">
                                    2. Tap "Add to Home screen"
                                  </Typography>
                                  <Typography variant="body2">
                                    3. Tap "Add" when prompted
                                  </Typography>
                                </Box>
                              )}
                            </>
                          ) : null}
                        </Box>
                      </>
                    )}

                    {/* Test notifications */}
                    <Divider sx={{ my: 4 }} />
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                      Test Notifications
                    </Typography>
                    <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Test the notifications to make sure they work on your device:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          1. Press one of the test buttons below
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          2. When you see the countdown message, turn off your screen
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          3. Wait for the notification (10 seconds) - it should wake your device!
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                          <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<WbSunnyIcon />}
                            onClick={() => sendTestNotification('sunlight')}
                            sx={{
                              color: 'primary.main',
                              borderColor: 'primary.main',
                              '&:hover': {
                                borderColor: 'primary.dark',
                                color: 'primary.dark',
                              }
                            }}
                          >
                            Test Sunlight Alert
                          </Button>
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<CoffeeIcon />}
                            onClick={() => sendTestNotification('coffee')}
                          >
                            Test Coffee Alert
                          </Button>
                        </Box>
                      </Box>
                    </Box>

                    {/* Add notification toggle section */}
                    <Divider sx={{ my: 4 }} />
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                      Notification Settings
                    </Typography>
                    <Box sx={{ pl: { xs: 1, sm: 2 }, mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            Light90 Notifications
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Receive alerts for optimal sunlight and coffee timing
                          </Typography>
                        </Box>
                        <Switch
                          checked={notificationsEnabled}
                          onChange={async (e) => {
                            if (e.target.checked) {
                              const permission = await requestNotificationPermission();
                              setNotificationsEnabled(permission === 'granted');
                            } else {
                              setNotificationsEnabled(false);
                            }
                          }}
                          color="primary"
                        />
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Box>
        </Container>
      </Container>
    </ThemeProvider>
  );
};

export default App;
