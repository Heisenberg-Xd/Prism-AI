import React, { useState, useRef, useEffect } from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { useNavigate } from 'react-router-dom';
import { 
  Database, 
  FileCode, 
  Eye, 
  Sparkles, 
  Settings, 
  ChevronDown,
  Plus,
  RefreshCw,
  Trash2,
  X,
  PanelLeft,
  PanelBottom,
  MessageSquare,
  Moon,
  Sun,
  Eraser,
} from 'lucide-react';

interface MenuItem {
  label?: string;
  icon?: React.ReactNode;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
}

function DropdownMenu({ label, items, isOpen, onToggle, onClose }: MenuProps & { isOpen: boolean; onToggle: () => void; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={menuRef} className="relative">
      <button
        className={`menu-item ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
      >
        {label}
      </button>
      {isOpen && (
        <div className="dropdown-menu top-full left-0 mt-1">
          {items.map((item, index) => (
            item.separator ? (
              <div key={index} className="dropdown-separator" />
            ) : (
              <button
                key={index}
                className={`dropdown-item w-full text-left ${item.danger ? 'danger' : ''} ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!item.disabled && item.action) {
                    item.action();
                    onClose();
                  }
                }}
                disabled={item.disabled}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <kbd className="kbd">{item.shortcut}</kbd>}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function MenuBar() {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const addLog = (type: 'info' | 'warning' | 'error' | 'success', message: string) => {
    dispatch({ type: 'ADD_LOG', payload: createLog(type, message) });
  };

  const fileMenu: MenuItem[] = [
    {
      label: 'New Database',
      icon: <Plus size={14} />,
      shortcut: '⌘N',
      action: () => {
        dispatch({ type: 'SET_MODAL', payload: 'create-database' });
        addLog('info', 'Opening new database dialog');
      },
    },
    { separator: true },
    {
      label: 'Close Database',
      icon: <X size={14} />,
      action: () => {
        if (state.activeDatabase) {
          const name = state.activeDatabase.name;
          dispatch({ type: 'SET_ACTIVE_DATABASE', payload: null });
          addLog('info', `Closed database: ${name}`);
        }
      },
      disabled: !state.activeDatabase,
    },
    { separator: true },
    {
      label: 'Exit',
      action: () => {
        addLog('info', 'Application shutdown initiated');
      },
    },
  ];

  const databaseMenu: MenuItem[] = [
    {
      label: 'Create Database',
      icon: <Plus size={14} />,
      action: () => {
        dispatch({ type: 'SET_MODAL', payload: 'create-database' });
        addLog('info', 'Opening create database dialog');
      },
    },
    {
      label: 'Refresh Schema',
      icon: <RefreshCw size={14} />,
      shortcut: 'F5',
      action: () => {
        addLog('info', 'Refreshing database schema...');
        // Backend call would go here
        setTimeout(() => addLog('success', 'Schema refreshed'), 500);
      },
      disabled: !state.activeDatabase,
    },
    { separator: true },
    {
      label: 'Drop Database',
      icon: <Trash2 size={14} />,
      danger: true,
      action: () => {
        if (state.activeDatabase) {
          dispatch({ type: 'SET_MODAL', payload: 'confirm-drop-database' });
        }
      },
      disabled: !state.activeDatabase,
    },
  ];

  const viewMenu: MenuItem[] = [
    {
      label: 'Toggle Sidebar',
      icon: <PanelLeft size={14} />,
      shortcut: '⌘B',
      action: () => {
        dispatch({ type: 'TOGGLE_PANEL', payload: 'sidebar' });
        addLog('info', `Sidebar ${state.ui.panels.sidebar ? 'hidden' : 'shown'}`);
      },
    },
    {
      label: 'Toggle AI Panel',
      icon: <MessageSquare size={14} />,
      action: () => {
        dispatch({ type: 'TOGGLE_PANEL', payload: 'ai' });
        addLog('info', `AI panel ${state.ui.panels.ai ? 'hidden' : 'shown'}`);
      },
    },
    {
      label: 'Toggle Output',
      icon: <PanelBottom size={14} />,
      shortcut: '⌘J',
      action: () => {
        dispatch({ type: 'TOGGLE_PANEL', payload: 'output' });
        addLog('info', `Output panel ${state.ui.panels.output ? 'hidden' : 'shown'}`);
      },
    },
  ];

  const aiMenu: MenuItem[] = [
    {
      label: 'AI Command',
      icon: <Sparkles size={14} />,
      action: () => {
        navigate('/ai');
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: 'ai' });
        addLog('info', 'Navigated to AI Command');
      },
    },
    { separator: true },
    {
      label: 'Clear AI History',
      icon: <Eraser size={14} />,
      action: () => {
        dispatch({ type: 'CLEAR_AI_HISTORY' });
        addLog('info', 'AI history cleared');
      },
    },
  ];

  const settingsMenu: MenuItem[] = [
    {
      label: state.ui.theme === 'dark' ? 'Light Theme' : 'Dark Theme',
      icon: state.ui.theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />,
      action: () => {
        const newTheme = state.ui.theme === 'dark' ? 'light' : 'dark';
        dispatch({ type: 'SET_THEME', payload: newTheme });
        addLog('info', `Theme changed to ${newTheme}`);
      },
    },
    { separator: true },
    {
      label: 'Preferences',
      icon: <Settings size={14} />,
      action: () => {
        navigate('/settings');
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: 'settings' });
        addLog('info', 'Navigated to Settings');
      },
    },
  ];

  const menus = [
    { label: 'File', items: fileMenu },
    { label: 'Database', items: databaseMenu },
    { label: 'View', items: viewMenu },
    { label: 'AI', items: aiMenu },
    { label: 'Settings', items: settingsMenu },
  ];

  return (
    <div className="menu-bar">
      <div className="flex items-center gap-2 mr-4">
        <Database className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">Prism AI</span>
      </div>
      
      <div className="flex items-center">
        {menus.map((menu) => (
          <DropdownMenu
            key={menu.label}
            label={menu.label}
            items={menu.items}
            isOpen={openMenu === menu.label}
            onToggle={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
            onClose={() => setOpenMenu(null)}
          />
        ))}
      </div>

      <div className="flex-1" />

      {state.activeDatabase && (
        <div className="flex items-center gap-2 text-xs">
          <span className="status-dot status-active" />
          <span className="text-muted-foreground">
            {state.activeDatabase.engine.toUpperCase()}:
          </span>
          <span className="font-medium">{state.activeDatabase.name}</span>
        </div>
      )}
    </div>
  );
}
