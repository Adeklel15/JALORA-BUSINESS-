/**
 * JALORA — Service Worker Registration & Lifecycle Management
 * Safe registration, update notifications, and standalone detection
 * Created by Abdul Jalil
 */

type UpdateCallback = () => void;

class PWAManager {
  private updateListeners: Set<UpdateCallback> = new Set();
  private registration: ServiceWorkerRegistration | null = null;
  private hasUpdate = false;

  constructor() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      this.init();
    }
  }

  private init() {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          this.registration = reg;
          console.log('[JALORA PWA] Service worker registered with scope:', reg.scope);

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[JALORA PWA] New update available!');
                this.hasUpdate = true;
                this.notifyUpdateListeners();
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[JALORA PWA] Service worker registration failed:', err);
        });

      // Reload page when new controller takes over
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  public onUpdateAvailable(callback: UpdateCallback): () => void {
    this.updateListeners.add(callback);
    if (this.hasUpdate) {
      callback();
    }
    return () => {
      this.updateListeners.delete(callback);
    };
  }

  private notifyUpdateListeners() {
    this.updateListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error(e);
      }
    });
  }

  public applyUpdate() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }

  public isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }
}

export const pwaManager = new PWAManager();
