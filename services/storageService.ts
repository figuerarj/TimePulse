import { TimeEntry, AppSettings } from '../types';

const KEYS = {
  ENTRIES: 'tp_entries',
  SETTINGS: 'tp_settings'
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultStartTime: '09:00',
  defaultEndTime: '17:00',
  unpaidBreakMinutes: 0,
  userName: 'User',
  currency: 'USD',
  hourlyRate: 0,
  holidayRateMultiplier: 2.0,
  language: 'en',
  weeklyGoalHours: 40,
  theme: 'light',
  holidayDefaultHours: 8,
  lunchEnabledDefault: false,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  roundingEnabled: true,
  clockInRoundingMinutes: 4,
  clockOutRoundingMinutes: 14,
  otEnabled: true,
  otThresholdMinutes: 15,
  otRateMultiplier: 1.5
};

export const storageService = {
  getEntries: (): TimeEntry[] => {
    const data = localStorage.getItem(KEYS.ENTRIES);
    return data ? JSON.parse(data) : [];
  },
  
  saveEntries: (entries: TimeEntry[]) => {
    localStorage.setItem(KEYS.ENTRIES, JSON.stringify(entries));
  },
  
  getSettings: (): AppSettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    const parsed = data ? JSON.parse(data) : DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...parsed };
  },
  
  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }
};