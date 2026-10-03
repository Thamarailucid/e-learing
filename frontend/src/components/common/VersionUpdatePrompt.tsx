import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { X, ArrowRight, RefreshCw, Clock } from 'lucide-react';
import { checkIsUpdateAvailable, getCurrentVersionInfo, triggerAppReload, snoozeUpdatePrompt, isUpdateSnoozed, initPreloadErrorAutoRecovery } from '../../utils/versionManager';

export const VersionUpdatePrompt: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  
  const currentVersion = getCurrentVersionInfo().version;

  const checkForUpdates = async () => {
    if (isUpdateSnoozed()) return;
    
    const { isAvailable, latestVersion: latestVer } = await checkIsUpdateAvailable();
    if (isAvailable && latestVer) {
      setUpdateAvailable(true);
      setLatestVersion(latestVer);
      setIsVisible(true);
    }
  };

  useEffect(() => {
    initPreloadErrorAutoRecovery();
    checkForUpdates();

    const interval = setInterval(checkForUpdates, 2 * 60 * 1000);
    
    const handleFocus = () => checkForUpdates();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleUpdate = () => {
    triggerAppReload();
  };

  const handleSnooze = () => {
    snoozeUpdatePrompt(24);
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!updateAvailable || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5">
      <div className="p-4 relative">
        <button 
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <h3 className="text-sm font-semibold text-white">New Version Live ({latestVersion})</h3>
        </div>
        
        <p className="text-xs text-gray-400 mb-3">
          A new version of NovaCodex is available. Update to get the latest features and fixes.
        </p>

        <div className="flex items-center justify-between text-xs bg-gray-800/50 rounded-lg p-2 mb-4 border border-gray-700/50 text-gray-300">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Installed:</span>
            <span className="font-mono">v{currentVersion}</span>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-500" />
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Latest:</span>
            <span className="font-mono text-emerald-400">v{latestVersion}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            type="primary" 
            onClick={handleUpdate}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            className="flex-1 !bg-emerald-600 hover:!bg-emerald-500 !border-0 text-xs font-semibold rounded-xl h-9"
          >
            Update Now
          </Button>
          <Button 
            onClick={handleSnooze}
            icon={<Clock className="w-3.5 h-3.5" />}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 hover:border-gray-600 hover:text-white text-xs font-semibold rounded-xl h-9"
          >
            Remind in 24h
          </Button>
        </div>
      </div>
    </div>
  );
};
