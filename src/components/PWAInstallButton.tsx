import React, { useState } from 'react';
import { Download, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="h-9 px-3 rounded-lg border border-[#C2410C]/40 bg-[#FFF7ED] text-[#C2410C] text-xs font-medium hover:bg-[#FFEDD5] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="h-9 px-3 rounded-lg border border-[#D6D0C4] bg-[#FAF8F5] text-[#18181B] text-xs font-medium hover:bg-[#EFECE6] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#C2410C]" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] p-6 shadow-xl">
              <h3 className="text-base font-semibold text-[#18181B]">
                Install Cheran Foods on iPhone / iPad
              </h3>
              <p className="mt-2 text-xs text-[#57534E] leading-relaxed">
                1. Tap the <strong>Share</strong> button in your Safari toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> to launch Cheran Foods like a native app.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full h-9 rounded-lg bg-[#18181B] text-xs font-medium text-white hover:bg-[#27272A] cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#D97706] px-3.5 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Showing cached Cheran Foods menu & prices.</span>
    </div>
  );
};
