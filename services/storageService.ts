
import { TimeEntry, AppSettings } from '../types';

const KEYS = {
  ENTRIES: 'tp_entries',
  SETTINGS: 'tp_settings'
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultStartTime: '09:00',
  defaultEndTime: '17:30',
  unpaidBreakMinutes: 0,
  userName: 'User',
  currency: 'USD',
  hourlyRate: 0,
  holidayRateMultiplier: 2.0,
  language: 'en',
  weeklyGoalHours: 40,
  theme: 'light',
  holidayDefaultHours: 8,
  lunchEnabledDefault: false, // Alterado para desativado por padrão
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h'
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
    // Migração de chave antiga se existir
    if (parsed.paidMinutes !== undefined && parsed.unpaidBreakMinutes === undefined) {
       parsed.unpaidBreakMinutes = parsed.paidMinutes;
       delete parsed.paidMinutes;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  },
  
  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }
};
