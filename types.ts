
export interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  lunchStart: string;
  lunchEnd: string;
  notes: string;
  hourlyRate?: number;
  unpaidBreakMinutes?: number; // Snapshot da pausa para este registro
  isHoliday: boolean;
  holidayWorked: boolean;
  lunchEnabled: boolean;
}

export interface AppSettings {
  defaultStartTime: string;
  defaultEndTime: string;
  unpaidBreakMinutes: number; // Pausa obrigatória (desconto)
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
}

export type ViewType = 'dashboard' | 'history' | 'stats' | 'settings';
