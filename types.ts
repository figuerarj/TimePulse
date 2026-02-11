export interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  scheduledStartTime?: string; // Used as reference for rounding/OT
  scheduledEndTime?: string;   // Used as reference for rounding/OT
  isCustomShift?: boolean;
  lunchStart: string;
  lunchEnd: string;
  notes: string;
  hourlyRate?: number;
  unpaidBreakMinutes?: number; 
  isHoliday: boolean;
  holidayWorked: boolean;
  lunchEnabled: boolean;
}

export interface AppSettings {
  defaultStartTime: string;
  defaultEndTime: string;
  unpaidBreakMinutes: number; 
  userName: string;
  currency: string;
  hourlyRate: number;
  holidayRateMultiplier: number;
  language: 'en' | 'pt';
  weeklyGoalHours: number;
  theme: 'light' | 'dark';
  holidayDefaultHours: number;
  lunchEnabledDefault: boolean;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  timeFormat: '24h' | '12h';
  // New features
  roundingEnabled: boolean;
  clockInRoundingMinutes: number;
  clockOutRoundingMinutes: number;
  otThresholdMinutes: number;
}

export type ViewType = 'dashboard' | 'history' | 'stats' | 'settings';