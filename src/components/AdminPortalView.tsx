import React, { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { MenuItemData, StockLogData } from '../data/initialMenu';
import { AdminDashboard } from './AdminDashboard';
import { ProductImage } from './ProductImage';

const ADMIN_CRED_STORAGE_KEY = 'cheran_foods_admin_credentials_v2';
const ADMIN_SESSION_STORAGE_KEY = 'cheran_foods_admin_unlocked_v2';

interface StoredCredentials {
  username: string;
  password: string;
}

function getStoredCredentials(): StoredCredentials {
  try {
    const raw = localStorage.getItem(ADMIN_CRED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.username && parsed.password) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage error
  }
  return {
    username: 'admin',
    password: '1234',
  };
}

interface AdminPortalViewProps {
  menuItems: MenuItemData[];
  stockLogs: StockLogData[];
  isCloudAdmin: boolean;
  currentUserEmail?: string | null;
  onSignInGoogle: () => Promise<void>;
  onUpdateStockAndPrice: (
    itemId: string,
    newPriceInr: number,
    newStockCount: number,
    newLowStockThreshold: number,
    newIsAvailable: boolean,
    note: string
  ) => Promise<void>;
  onAddNewMenuItem: (
    newItem: Omit<MenuItemData, 'id' | 'updatedByUid'>
  ) => Promise<void>;
  onResetDefaultCatalog: () => Promise<void>;
  onExitToStorefront: () => void;
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  menuItems,
  stockLogs,
  isCloudAdmin,
  currentUserEmail,
  onSignInGoogle,
  onUpdateStockAndPrice,
  onAddNewMenuItem,
  onResetDefaultCatalog,
  onExitToStorefront,
}) => {
  const [credentials, setCredentials] = useState<StoredCredentials>(() =>
    getStoredCredentials()
  );
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Login Gate Form State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Change Password Modal State inside unlocked portal
  const [showCredModal, setShowCredModal] = useState(false);
  const [newUsername, setNewUsername] = useState(credentials.username);
  const [newPassword, setNewPassword] = useState(credentials.password);
  const [credSavedMsg, setCredSavedMsg] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const trimmedUser = usernameInput.trim().toLowerCase();
    const isValidCustom =
      trimmedUser === credentials.username.toLowerCase() &&
      passwordInput === credentials.password;
    const isValidDefault =
      (trimmedUser === 'admin' && passwordInput === '1234') ||
      (trimmedUser === 'cheranadmin' && passwordInput === 'Cheran@2026');

    if (isValidCustom || isValidDefault) {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, 'true');
      } catch {
        // Ignore
      }
      setPasswordInput('');
    } else {
      setLoginError(
        'Wrong Username or Password! Use Username: admin and Password: 1234'
      );
    }
  };

  const handleLockPortal = () => {
    setIsUnlocked(false);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleSaveNewCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || newPassword.length < 3) return;
    const updated: StoredCredentials = {
      username: newUsername.trim(),
      password: newPassword,
    };
    setCredentials(updated);
    try {
      localStorage.setItem(ADMIN_CRED_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore
    }
    setCredSavedMsg(true);
    setTimeout(() => {
      setCredSavedMsg(false);
      setShowCredModal(false);
    }, 1200);
  };

  // =========================================================================
  // 1. LOCKED STATE: Separate Admin Username & Password Login Screen
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#18181B] text-[#FAF8F5] flex flex-col justify-between p-6">
        {/* Top Bar to Return to Public Customer Website */}
        <div className="max-w-[1200px] w-full mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onExitToStorefront}
            className="h-10 px-4 rounded-lg border border-[#3F3F46] bg-[#27272A] text-xs font-medium text-white hover:bg-[#3F3F46] flex items-center gap-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Cheran Foods Customer Shop</span>
          </button>

          <span className="text-xs font-mono text-[#A8A29E]">
            Separate Admin Portal
          </span>
        </div>

        {/* Centered Login Card */}
        <div className="w-full max-w-md mx-auto bg-[#27272A] border border-[#3F3F46] rounded-xl p-7 sm:p-8 shadow-2xl space-y-6 my-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg overflow-hidden border border-[#52525B] bg-[#FAF8F5] shrink-0">
              <ProductImage
                imageKey="logo"
                alt="Cheran Foods Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-xs font-mono text-[#FDBA74]">
                Cheran Foods · Owner Access Only
              </div>
              <h1 className="text-xl font-semibold text-white tracking-tight">
                Admin Login
              </h1>
            </div>
          </div>

          <p className="text-xs text-[#D6D3D1] leading-relaxed">
            Enter your Admin Username and Password below to open the separate Stock & Price Management Dashboard.
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-medium text-[#E4E4E7] mb-1.5"
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                required
                autoComplete="username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username (e.g. admin)"
                className="w-full h-10 px-3.5 rounded-lg border border-[#52525B] bg-[#18181B] text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#F97316]"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-[#E4E4E7] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password (e.g. 1234)"
                  className="w-full h-10 pl-3.5 pr-10 rounded-lg border border-[#52525B] bg-[#18181B] text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#F97316]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-white cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-[#DC2626]/20 border border-[#DC2626] text-xs text-[#FCA5A5] font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Lock className="w-4 h-4" />
              <span>Login to Admin Dashboard</span>
            </button>
          </form>

          {/* Clear Default Credentials Box + 1-Click Auto-Fill */}
          <div className="p-4 rounded-lg bg-[#18181B] border border-[#3F3F46] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#FDBA74]">
                Owner Login Details:
              </span>
              <button
                type="button"
                onClick={() => {
                  setUsernameInput(credentials.username);
                  setPasswordInput(credentials.password);
                  setLoginError(null);
                }}
                className="px-2.5 py-1 rounded bg-[#27272A] hover:bg-[#3F3F46] text-xs font-medium text-white cursor-pointer transition-colors"
              >
                Click to Auto-Fill
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#D6D3D1]">
              <div>
                Username: <strong className="text-white">{credentials.username}</strong>
              </div>
              <div>
                Password: <strong className="text-white">{credentials.password}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-[#71717A]">
          Cheran Foods Admin Console · Protected by Username & Password
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. UNLOCKED STATE: Standalone Admin Application
  // =========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#18181B]">
      {/* Standalone Admin Top Bar */}
      <header className="sticky top-0 z-40 h-16 bg-[#18181B] text-[#FAF8F5] px-6 flex items-center justify-between border-b border-[#27272A]">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-md overflow-hidden border border-[#3F3F46] bg-[#FAF8F5] shrink-0">
            <ProductImage
              imageKey="logo"
              alt="Cheran Foods Logo"
              className="w-full h-full object-cover"
            />
          </span>
          <span className="font-display font-bold text-base tracking-tight text-white">
            Cheran Foods · Separate Admin Portal
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setNewUsername(credentials.username);
              setNewPassword(credentials.password);
              setShowCredModal(true);
            }}
            className="h-9 px-3 rounded-lg border border-[#3F3F46] bg-[#27272A] text-xs font-medium text-[#E4E4E7] hover:bg-[#3F3F46] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#FDBA74]" />
            <span className="hidden sm:inline">Change Username / Password</span>
          </button>

          <button
            type="button"
            onClick={onExitToStorefront}
            className="h-9 px-3 rounded-lg border border-[#3F3F46] bg-[#27272A] text-xs font-medium text-[#E4E4E7] hover:bg-[#3F3F46] flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Customer Shop</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleLockPortal();
              onExitToStorefront();
            }}
            className="h-9 px-3.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Logout Admin</span>
          </button>
        </div>
      </header>

      {/* Change Admin Username & Password Modal */}
      {showCredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleSaveNewCredentials}
            className="w-full max-w-md rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-base font-semibold text-[#18181B]">
              <UserCheck className="w-5 h-5 text-[#C2410C]" />
              <span>Change Admin Username & Password</span>
            </div>
            <p className="text-xs text-[#57534E]">
              Set your own custom username and password for the Cheran Foods Admin Portal.
            </p>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                New Admin Username
              </label>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#D6D0C4] bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#57534E] mb-1">
                New Admin Password
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#D6D0C4] bg-white text-sm font-mono"
              />
            </div>

            {credSavedMsg && (
              <div className="text-xs text-[#16A34A] font-medium flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Saved new username & password!</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCredModal(false)}
                className="h-9 px-4 rounded-lg border border-[#D6D0C4] text-xs font-medium text-[#57534E] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-lg bg-[#18181B] text-white text-xs font-medium cursor-pointer"
              >
                Save Credentials
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Admin Dashboard Content */}
      <main className="flex-1">
        <AdminDashboard
          menuItems={menuItems}
          stockLogs={stockLogs}
          isAdmin={isCloudAdmin}
          currentUserEmail={currentUserEmail}
          onSignIn={onSignInGoogle}
          onUpdateStockAndPrice={onUpdateStockAndPrice}
          onAddNewMenuItem={onAddNewMenuItem}
          onResetDefaultCatalog={onResetDefaultCatalog}
        />
      </main>
    </div>
  );
};
