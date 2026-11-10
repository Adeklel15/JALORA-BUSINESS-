/**
 * JALORA — usePWAInstall Hook
 * Manages beforeinstallprompt, standalone mode detection, platform-specific guides,
 * and service worker update notifications.
 * 
 * Created by Abdul Jalil
 */

import { useState, useEffect } from 'react';
import { pwaManager } from '../services/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PWAUserPlatform = 'android' | 'ios' | 'desktop';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => pwaManager.isStandalone());
  const [platform, setPlatform] = useState<PWAUserPlatform>('desktop');
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect standalone mode
    const checkStandalone = () => {
      setIsInstalled(pwaManager.isStandalone());
    };
    checkStandalone();

    // 2. Detect platform
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setPlatform('ios');
      } else if (/android/.test(ua)) {
        setPlatform('android');
      } else {
        setPlatform('desktop');
      }
    }

    // 3. Listen to beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen to appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Media query listener for display-mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // 6. Listen to updates
    const unsubscribeUpdate = pwaManager.onUpdateAvailable(() => {
      setUpdateAvailable(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      unsubscribeUpdate();
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Install prompt error:', err);
      return false;
    }
  };

  const applyUpdate = () => {
    pwaManager.applyUpdate();
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    platform,
    updateAvailable,
    install,
    applyUpdate,
  };
}
