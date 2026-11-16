import React from 'react';
import { BookOpen, Shield, LogOut, Search, PlusCircle, Globe, User, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Reader } from '../types';

interface NavbarProps {
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onOpenAdminLogin: () => void;
  onOpenAddManhwa: () => void;
  onGoHome: () => void;
  currentReader: Reader | null;
  onOpenReaderAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchChange,
  searchQuery,
  onOpenAdminLogin,
  onOpenAddManhwa,
  onGoHome,
  currentReader,
  onOpenReaderAuth,
}) => {
  const { isAdmin, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-[#07090e]/95 backdrop-blur-md border-b border-[#141822] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand / Logo */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-md bg-[#0e121a] border border-[#191e2a] flex items-center justify-center text-slate-300 group-hover:border-slate-500 transition-colors shadow-sm">
            <BookOpen className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2 font-cyrillic">
              {t.siteName}
              <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-[#10141d] text-slate-400 border border-[#1a202d] tracking-widest">
                ARCHIVE
              </span>
            </span>
            <p className="text-[10px] text-slate-500 -mt-0.5 tracking-wide hidden sm:block font-cyrillic">
              {t.siteSub}
            </p>
          </div>
        </button>

        {/* Center Search Input */}
        <div className="flex-1 max-w-md mx-2 relative">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-[#0a0d14] border border-[#161a25] text-slate-200 placeholder-slate-600 text-xs rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#2f384c] transition-all font-cyrillic"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-200 px-1 py-0.5"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Reader Profile / Login Button */}
          {currentReader ? (
            <button
              onClick={onOpenReaderAuth}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0c1017] border border-[#171c28] hover:border-[#262e40] text-xs font-medium text-slate-300 transition-colors"
              title={currentReader.fullName}
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-black/40 border border-[#202738] flex-shrink-0">
                {currentReader.avatarUrl ? (
                  <img
                    src={currentReader.avatarUrl}
                    alt={currentReader.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-3 h-3 text-slate-400 m-1" />
                )}
              </div>
              <span className="hidden md:inline font-medium text-[11px] max-w-[100px] truncate">
                {currentReader.firstName}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenReaderAuth}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0c1017] border border-[#171c28] hover:border-[#262e40] text-xs font-medium text-slate-300 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline font-medium text-[11px]">{t.readerLogin}</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={() => setLang(lang === 'mn' ? 'en' : 'mn')}
            title="Хэл солих / Switch Language"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-[#0a0d14] border border-[#161a25] text-[11px] font-medium text-slate-400 hover:text-white hover:border-[#222838] transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span className="uppercase tracking-wider font-semibold">
              {lang === 'mn' ? '🇲🇳 MN' : '🇬🇧 EN'}
            </span>
          </button>

          {/* Admin Controls - Visible ONLY if user is confirmed Admin */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddManhwa}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#131a24] text-slate-200 border border-[#212b3b] hover:bg-[#1a2331] text-xs font-semibold transition-all shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-300" />
                <span className="hidden sm:inline">{t.addNewManhwa}</span>
              </button>

              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-slate-300 bg-[#121620] border border-[#1d2331] px-2 py-1 rounded-md">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Admin</span>
              </div>

              <button
                onClick={() => logout()}
                title={t.signOut}
                className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-[#141822] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Non-admin / visitor: Discreet owner portal login button */
            <button
              onClick={onOpenAdminLogin}
              title={t.adminLogin}
              className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-[#0e121a] rounded-md border border-transparent hover:border-[#191e2b] transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
