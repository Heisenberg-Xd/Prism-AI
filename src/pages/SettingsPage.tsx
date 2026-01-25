import React from 'react';
import { useAppState, createLog } from '@/store/AppState';
import { Settings, Moon, Sun, Sparkles, FileCode, Info } from 'lucide-react';

export default function SettingsPage() {
  const { state, dispatch } = useAppState();

  const addLog = (type: 'info' | 'warning' | 'error' | 'success', message: string) => {
    dispatch({ type: 'ADD_LOG', payload: createLog(type, message) });
  };

  const handleThemeToggle = () => {
    const newTheme = state.ui.theme === 'dark' ? 'light' : 'dark';
    dispatch({ type: 'SET_THEME', payload: newTheme });
    addLog('info', `Theme changed to ${newTheme}`);
  };

  return (
    <div className="h-full overflow-auto bg-panel">
      {/* Header */}
      <div className="panel-header border-b sticky top-0 bg-panel-header z-10">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-primary" />
          <span className="panel-title">Settings</span>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Appearance */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-panel-header">
            <h3 className="text-sm font-semibold">Appearance</h3>
          </div>
          <div className="divide-y">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                {state.ui.theme === 'dark' ? (
                  <Moon size={18} className="text-muted-foreground" />
                ) : (
                  <Sun size={18} className="text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">
                    Choose between dark and light mode
                  </p>
                </div>
              </div>
              <button
                className="btn-system"
                onClick={handleThemeToggle}
              >
                {state.ui.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
        </div>

        {/* Editor Preferences */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-panel-header">
            <h3 className="text-sm font-semibold">Editor</h3>
          </div>
          <div className="divide-y">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <FileCode size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Font Family</p>
                  <p className="text-xs text-muted-foreground">
                    JetBrains Mono
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">(Read-only)</span>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <FileCode size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Font Size</p>
                  <p className="text-xs text-muted-foreground">13px</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">(Read-only)</span>
            </div>
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <FileCode size={18} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tab Size</p>
                  <p className="text-xs text-muted-foreground">2 spaces</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">(Read-only)</span>
            </div>
          </div>
        </div>

        {/* AI Behavior */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-panel-header">
            <h3 className="text-sm font-semibold">AI Behavior</h3>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-2">How AI Commands Work</p>
                <ul className="text-xs text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="badge badge-read">READ</span>
                    <span>Queries that only read data are executed automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="badge badge-structural">STRUCTURAL</span>
                    <span>Schema changes require confirmation before execution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="badge badge-destructive">DESTRUCTIVE</span>
                    <span>Drop/delete operations always require explicit confirmation</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="px-4 py-3 border-b bg-panel-header">
            <h3 className="text-sm font-semibold">About</h3>
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Prism AI</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI-powered database platform with human-friendly interface.
                  Create and manage MySQL/PostgreSQL databases with natural language.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Version 0.1.0 (Preview)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
