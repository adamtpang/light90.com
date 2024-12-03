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
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';
import ShareIcon from '@mui/icons-material/Share';
import { format, addMinutes, differenceInMinutes, subDays, formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
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
  const isSmallScreen = useMediaQuery('(max-width:600px)');
  const [showAlert, setShowAlert] = useState<{
    show: boolean;
    type: 'sunlight' | 'coffee' | 'info' | null;
    message: string;
  }>({
    show: false,
    type: null,
    message: ''
  });
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
      setShowAlert({
        show: true,
        type: 'info',
        message: 'Test notification will appear in 10 seconds. Try turning off your screen to test if notifications work while your phone is locked!'
      });

      // Wait 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Show the actual notification
      setShowAlert({
        show: true,
        type,
        message: `${messages[type].title} ${messages[type].body}`
      });

      // Play looping notification sound
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
      const audio = new Audio('/notification.wav');
      audio.loop = true;
      setAudioRef(audio);
      audio.play().catch(error => {
        console.error('Error playing notification sound:', error);
      });

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
    setShowAlert({ show: false, type: null, message: '' });
  };

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
            onClose={handleAlertClose}
          >
            {showAlert.message}
          </Alert>
        )}
        <Box>
          <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Welcome to light90.com
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
                      Test the notifications to make sure they work on your device:
                    </Typography>
                    <Box sx={{ pl: 2, mb: 3 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        1. Press one of the test buttons below
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        2. When you see the countdown message, turn off your screen
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        3. Wait for the notification (10 seconds) - it should wake your device!
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Button
                          variant="outlined"
                          startIcon={<WbSunnyIcon />}
                          onClick={() => sendTestNotification('sunlight')}
                        >
                          Test Sunlight Alert
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<CoffeeIcon />}
                          onClick={() => sendTestNotification('coffee')}
                        >
                          Test Coffee Alert
                        </Button>
                      </Box>
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
                                  Sunrise: {formatTimeIfValid(sunrise)} (adjusted for first light)
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

                    {user?.profile?.records && user.profile.records.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          Estimated Next Alerts
                        </Typography>
                        <Box sx={{ pl: 2, mb: 3 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Sunlight alert is based on local sunrise time (adjusted earlier to catch the first light). Coffee alert is based on your average wake time from the last 7 days.
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <WbSunnyIcon sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              Sunlight alert: {nextAlerts.sunlight ? (
                                <>
                                  {format(nextAlerts.sunlight, 'h:mm a')} (in {formatCountdown(nextAlerts.sunlight)})
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Based on sunrise at {sunTimes?.sunrise ? format(new Date(sunTimes.sunrise), 'h:mm a') : '...'} (adjusted 30min earlier for first light)
                                  </Typography>
                                </>
                              ) : 'Calculating...'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <CoffeeIcon sx={{ mr: 1 }} />
                            <Typography variant="body2">
                              Coffee alert: {nextAlerts.coffee ? (
                                <>
                                  {format(nextAlerts.coffee, 'h:mm a')} (in {formatCountdown(nextAlerts.coffee)})
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Based on average wake time from last {Math.min(7, user?.profile?.records?.length || 0)} days + 90min
                                  </Typography>
                                </>
                              ) : 'Calculating...'}
                            </Typography>
                          </Box>
                        </Box>
                      </>
                    )}

                    {isMobileDevice && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          <PhoneIphoneIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Get Mobile Notifications
                        </Typography>
                        <Box sx={{ pl: 2, mb: 3 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            For the best experience with notifications, add Light90 to your home screen:
                          </Typography>

                          {isIOS ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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

                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Once added, Light90 will work like a native app with full notification support.
                          </Typography>
                        </Box>
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
