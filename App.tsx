
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History, 
  BarChart3, 
  Settings as SettingsIcon, 
  Plus, 
  Clock,
  Moon,
  Sun
} from 'lucide-react';
import { ViewType, TimeEntry, AppSettings } from './types';
import { storageService } from './services/storageService';
import { translations } from './utils/translations';
import Dashboard from './components/Dashboard';
import HistoryView from './components/HistoryView';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import AddEntryModal from './components/AddEntryModal';
import ConfirmModal from './components/ConfirmModal';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storageService.getSettings());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const t = translations[settings.language || 'en'];

  useEffect(() => {
    const loadedEntries = storageService.getEntries();
    setEntries(loadedEntries);
  }, []);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleSaveEntry = (entry: TimeEntry) => {
    const existingIndex = entries.findIndex(e => e.id === entry.id);
    let newEntries: TimeEntry[];
    
    if (existingIndex >= 0) {
      newEntries = [...entries];
      newEntries[existingIndex] = entry;
    } else {
      newEntries = [entry, ...entries];
    }
    
    // Ordenação robusta: Data (desc) e depois Hora de Início (desc)
    newEntries.sort((a, b) => {
      const dateCompare = new Date(b.date + 'T12:00:00').getTime() - new Date(a.date + 'T12:00:00').getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.startTime.localeCompare(a.startTime);
    });
    
    setEntries(newEntries);
    storageService.saveEntries(newEntries);
    setIsAddModalOpen(false);
    setEditingEntry(null);
    
    // UX Improvement: Redirect to home after saving
    setActiveView('dashboard');
  };

  const handleDeleteEntry = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setEntries(prev => {
      const newEntries = prev.filter(e => e.id !== deleteId);
      storageService.saveEntries(newEntries);
      return newEntries;
    });
    setDeleteId(null);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  const openAddModal = () => {
    setEditingEntry(null);
    setIsAddModalOpen(true);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard 
            entries={entries} 
            settings={settings} 
            onAddClick={openAddModal}
            onSeeAll={() => setActiveView('history')}
            onStatsClick={() => setActiveView('stats')}
          />
        );
      case 'history':
        return (
          <HistoryView 
            entries={entries} 
            settings={settings} 
            onEdit={(e) => { setEditingEntry(e); setIsAddModalOpen(true); }}
            onDelete={handleDeleteEntry}
            onAdd={openAddModal}
          />
        );
      case 'stats':
        return <StatsView entries={entries} settings={settings} />;
      case 'settings':
        return (
          <SettingsView 
            settings={settings} 
            onUpdate={handleUpdateSettings}
            onImport={(data) => {
                setEntries(data.entries);
                setSettings(data.settings);
                storageService.saveEntries(data.entries);
                storageService.saveSettings(data.settings);
            }}
            entries={entries}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-50 dark:bg-slate-950 shadow-2xl relative overflow-hidden transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-10 transition-colors">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none">
              <Clock className="w-5 h-5 text-white" />
            </div>
            TimePulse
          </h1>
          <button 
            onClick={() => handleUpdateSettings({...settings, theme: settings.theme === 'dark' ? 'light' : 'dark'})}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 active:scale-90 transition-all"
          >
            {settings.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderView()}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 z-40 flex justify-between items-center h-20 transition-colors">
        <NavButton active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<LayoutDashboard className="w-6 h-6" />} label="Home" />
        <NavButton active={activeView === 'history'} onClick={() => setActiveView('history')} icon={<History className="w-6 h-6" />} label={t.history} />
        
        <div className="flex-1 flex items-center justify-center h-full">
          <button 
            onClick={openAddModal}
            className="flex items-center justify-center bg-indigo-600 text-white w-14 h-14 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40 active:scale-90 transition-all transform hover:scale-105"
            aria-label="Add Entry"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        <NavButton active={activeView === 'stats'} onClick={() => setActiveView('stats')} icon={<BarChart3 className="w-6 h-6" />} label="Stats" />
        <NavButton active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon className="w-6 h-6" />} label="Setup" />
      </nav>

      {isAddModalOpen && (
        <AddEntryModal 
          isOpen={isAddModalOpen} 
          onClose={() => { setIsAddModalOpen(false); setEditingEntry(null); }}
          onSave={handleSaveEntry}
          settings={settings}
          initialData={editingEntry || undefined}
        />
      )}

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title={settings.language === 'pt' ? 'Excluir Registro' : 'Delete Entry'}
        message={t.confirmDelete}
        confirmText={settings.language === 'pt' ? 'Excluir' : 'Delete'}
        cancelText={settings.language === 'pt' ? 'Cancelar' : 'Cancel'}
      />
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 h-full transition-all ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'}`}>
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
      {icon}
    </div>
    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

export default App;
