/**
 * Phase 3 Task 3.3.1.5: Accessibility and Inclusion Features
 * Comprehensive accessibility support for diverse user needs
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings,
  Type,
  Palette,
  Volume2,
  Languages,
  Eye,
  Clock,
  Heart
} from 'lucide-react';

interface AccessibilitySettings {
  // Visual Preferences
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  contrast: 'normal' | 'high' | 'extra-high';
  colorMode: 'default' | 'colorblind-friendly' | 'monochrome';
  
  // Motor/Navigation Preferences
  keyboardNavigation: boolean;
  largeClickTargets: boolean;
  reducedMotion: boolean;
  
  // Cognitive Preferences
  simplifiedLanguage: boolean;
  extendedTimeouts: boolean;
  progressReminders: boolean;
  
  // Language Preferences
  language: 'en' | 'es' | 'fr';
  culturalContext: 'us' | 'global' | 'local';
  
  // Engagement Preferences
  motivationalStyle: 'encouraging' | 'neutral' | 'minimal';
  explanationDepth: 'basic' | 'detailed' | 'comprehensive';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  isConfigPanelOpen: boolean;
  openConfigPanel: () => void;
  closeConfigPanel: () => void;
}

const defaultSettings: AccessibilitySettings = {
  fontSize: 'medium',
  contrast: 'normal',
  colorMode: 'default',
  keyboardNavigation: true,
  largeClickTargets: false,
  reducedMotion: false,
  simplifiedLanguage: false,
  extendedTimeouts: false,
  progressReminders: true,
  language: 'en',
  culturalContext: 'us',
  motivationalStyle: 'encouraging',
  explanationDepth: 'detailed'
};

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('both-sides-accessibility');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
      }
    }
  }, []);

  // Apply settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    const fontSizeMap = {
      'small': '14px',
      'medium': '16px', 
      'large': '18px',
      'extra-large': '22px'
    };
    root.style.fontSize = fontSizeMap[settings.fontSize];

    // Contrast
    if (settings.contrast === 'high') {
      root.classList.add('high-contrast');
    } else if (settings.contrast === 'extra-high') {
      root.classList.add('extra-high-contrast');
    } else {
      root.classList.remove('high-contrast', 'extra-high-contrast');
    }

    // Color mode
    if (settings.colorMode === 'colorblind-friendly') {
      root.classList.add('colorblind-friendly');
    } else if (settings.colorMode === 'monochrome') {
      root.classList.add('monochrome');
    } else {
      root.classList.remove('colorblind-friendly', 'monochrome');
    }

    // Motion preferences
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Large click targets
    if (settings.largeClickTargets) {
      root.classList.add('large-targets');
    } else {
      root.classList.remove('large-targets');
    }

  }, [settings]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem('both-sides-accessibility', JSON.stringify(newSettings));
  };

  const openConfigPanel = () => setIsConfigPanelOpen(true);
  const closeConfigPanel = () => setIsConfigPanelOpen(false);

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    isConfigPanelOpen,
    openConfigPanel,
    closeConfigPanel
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <div className={`
        accessibility-root
        ${settings.reducedMotion ? 'reduced-motion' : ''}
        ${settings.largeClickTargets ? 'large-targets' : ''}
      `}>
        {children}
        {isConfigPanelOpen && <AccessibilityConfigPanel />}
        <AccessibilityFloatingButton />
      </div>
    </AccessibilityContext.Provider>
  );
}

function AccessibilityFloatingButton() {
  const { openConfigPanel } = useAccessibility();

  return (
    <Button
      onClick={openConfigPanel}
      className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
      aria-label="Open accessibility settings"
      title="Accessibility Settings"
    >
      <Settings className="h-5 w-5" />
    </Button>
  );
}

function AccessibilityConfigPanel() {
  const { settings, updateSettings, closeConfigPanel } = useAccessibility();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <Card className="max-w-4xl max-h-[90vh] overflow-auto shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-blue-600" />
              Accessibility Settings
            </h2>
            <Button variant="outline" onClick={closeConfigPanel}>
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visual Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-600" />
                Visual Preferences
              </h3>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Font Size</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                    <Button
                      key={size}
                      variant={settings.fontSize === size ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ fontSize: size })}
                      className="justify-start"
                    >
                      <Type className="h-4 w-4 mr-2" />
                      {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Contrast</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['normal', 'high', 'extra-high'] as const).map((contrast) => (
                    <Button
                      key={contrast}
                      variant={settings.contrast === contrast ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ contrast })}
                      className="justify-start"
                    >
                      <Palette className="h-4 w-4 mr-2" />
                      {contrast.charAt(0).toUpperCase() + contrast.slice(1).replace('-', ' ')} Contrast
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Color Mode</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['default', 'colorblind-friendly', 'monochrome'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={settings.colorMode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ colorMode: mode })}
                      className="justify-start"
                    >
                      <Palette className="h-4 w-4 mr-2" />
                      {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Navigation & Motor Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Navigation & Motor
              </h3>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Keyboard Navigation</span>
                  <input
                    type="checkbox"
                    checked={settings.keyboardNavigation}
                    onChange={(e) => updateSettings({ keyboardNavigation: e.target.checked })}
                    className="rounded"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Large Click Targets</span>
                  <input
                    type="checkbox"
                    checked={settings.largeClickTargets}
                    onChange={(e) => updateSettings({ largeClickTargets: e.target.checked })}
                    className="rounded"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Reduced Motion</span>
                  <input
                    type="checkbox"
                    checked={settings.reducedMotion}
                    onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                    className="rounded"
                  />
                </label>
              </div>
            </div>

            {/* Cognitive & Learning Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Cognitive Support
              </h3>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Simplified Language</span>
                  <input
                    type="checkbox"
                    checked={settings.simplifiedLanguage}
                    onChange={(e) => updateSettings({ simplifiedLanguage: e.target.checked })}
                    className="rounded"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Extended Timeouts</span>
                  <input
                    type="checkbox"
                    checked={settings.extendedTimeouts}
                    onChange={(e) => updateSettings({ extendedTimeouts: e.target.checked })}
                    className="rounded"
                  />
                </label>

                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progress Reminders</span>
                  <input
                    type="checkbox"
                    checked={settings.progressReminders}
                    onChange={(e) => updateSettings({ progressReminders: e.target.checked })}
                    className="rounded"
                  />
                </label>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Explanation Detail Level</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['basic', 'detailed', 'comprehensive'] as const).map((depth) => (
                    <Button
                      key={depth}
                      variant={settings.explanationDepth === depth ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ explanationDepth: depth })}
                      className="justify-start"
                    >
                      {depth.charAt(0).toUpperCase() + depth.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Language & Cultural Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Languages className="h-5 w-5 text-orange-600" />
                Language & Culture
              </h3>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Language</label>
                <div className="grid grid-cols-1 gap-2">
                  {([
                    { code: 'en', name: 'English' },
                    { code: 'es', name: 'Español' },
                    { code: 'fr', name: 'Français' }
                  ] as const).map((lang) => (
                    <Button
                      key={lang.code}
                      variant={settings.language === lang.code ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ language: lang.code })}
                      className="justify-start"
                    >
                      <Languages className="h-4 w-4 mr-2" />
                      {lang.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Motivational Style</label>
                <div className="grid grid-cols-1 gap-2">
                  {(['encouraging', 'neutral', 'minimal'] as const).map((style) => (
                    <Button
                      key={style}
                      variant={settings.motivationalStyle === style ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSettings({ motivationalStyle: style })}
                      className="justify-start"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">About Accessibility</h4>
            <p className="text-sm text-blue-800 leading-relaxed">
              These settings help make Both Sides work better for everyone, regardless of 
              abilities, learning preferences, or cultural background. Your settings are 
              saved locally and only you can see them. If you need additional support, 
              please contact your teacher or administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper hook for applying accessibility-aware content
export function useAccessibleContent() {
  const { settings } = useAccessibility();

  const getAccessibleText = (options: {
    simple: string;
    detailed: string;
    comprehensive: string;
  }) => {
    if (settings.simplifiedLanguage) return options.simple;
    
    switch (settings.explanationDepth) {
      case 'basic': return options.simple;
      case 'comprehensive': return options.comprehensive;
      default: return options.detailed;
    }
  };

  const getMotivationalText = (options: {
    encouraging: string;
    neutral: string;
    minimal: string;
  }) => {
    return options[settings.motivationalStyle];
  };

  const shouldShowProgressReminders = () => settings.progressReminders;
  const shouldUseExtendedTimeouts = () => settings.extendedTimeouts;
  const shouldReduceMotion = () => settings.reducedMotion;

  return {
    getAccessibleText,
    getMotivationalText,
    shouldShowProgressReminders,
    shouldUseExtendedTimeouts,
    shouldReduceMotion,
    settings
  };
}
