export interface SleepData {
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

export interface VitalUser {
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

export interface Alert {
  id: string;
  type: 'sunlight' | 'coffee' | 'info' | null;
  message: string;
  audio?: HTMLAudioElement;
}

export interface NextAlerts {
  sunlight: Date | null;
  coffee: Date | null;
}