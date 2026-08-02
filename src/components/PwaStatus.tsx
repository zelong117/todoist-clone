import { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff } from 'lucide-react';
import { CHANGE_EVENT, getCurrentQueueOwner, getQueuedMutationCount } from '../lib/offlineQueue';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaStatus() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [updateReady, setUpdateReady] = useState(false);
  const [queuedChanges, setQueuedChanges] = useState(0);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    const refreshQueueCount = () => getQueuedMutationCount(getCurrentQueueOwner()).then(setQueuedChanges).catch(() => setQueuedChanges(0));
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener(CHANGE_EVENT, refreshQueueCount);
    refreshQueueCount();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => setUpdateReady(true));
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener(CHANGE_EVENT, refreshQueueCount);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (!offline && !installPrompt && !updateReady && !queuedChanges) return null;
  return (
    <div className="pwa-status" role="status">
      {offline && <><WifiOff size={16} /><span>Offline. Changes will resume when the connection returns.</span></>}
      {!offline && queuedChanges > 0 && <><RefreshCw size={16} /><span>{queuedChanges} change{queuedChanges === 1 ? '' : 's'} are waiting to sync.</span></>}
      {!offline && updateReady && <><RefreshCw size={16} /><span>A new version is ready.</span><button onClick={() => window.location.reload()}>Refresh</button></>}
      {!offline && !updateReady && installPrompt && <><Download size={16} /><span>Install TaskFlow for a focused workspace.</span><button onClick={install}>Install</button></>}
    </div>
  );
}
