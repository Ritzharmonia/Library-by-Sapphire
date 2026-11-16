import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Shield, X, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAddManhwa: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onOpenAddManhwa,
}) => {
  const { user, isAdmin, adminEmail, loginWithGoogle, logout } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
    } catch (err: any) {
      setError(err?.message || 'Гарахад алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-cyrillic">
      <div className="relative w-full max-w-md bg-[#090c12] border border-[#171b26] rounded-xl shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#141822]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#121620] border border-[#1c2230] flex items-center justify-center text-slate-300">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100">{t.adminPortal}</h2>
              <p className="text-[10px] text-slate-500">Security & Catalog Control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#141822] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 text-xs space-y-4">
          <div className="p-3.5 rounded-lg bg-[#0b0e14] border border-[#161a25] text-slate-300 leading-relaxed">
            <p className="font-medium text-slate-200 mb-1">{t.adminNotice}</p>
            <p className="text-slate-400 text-[11px]">
              Зочид зөвхөн унших эрхтэй бөгөөд манхва нэмэх, засах, бүлэг оруулах үйлдэл
              нь зөвхөн баталгаажсан админ эрхтэй хэрэглэгчид нээлттэй.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Status states */}
          {user ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#07090e] border border-[#141822] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    {t.adminLoggedAs}
                  </span>
                  <span className="font-semibold text-slate-200 text-xs">
                    {user.email}
                  </span>
                </div>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Баталгаажсан
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/30 border border-amber-800/30 px-2 py-0.5 rounded">
                    Админ биш
                  </span>
                )}
              </div>

              {isAdmin ? (
                <div className="space-y-2 pt-2">
                  <p className="text-emerald-400 text-center font-medium">
                    Та админ эрхээр амжилттай нэвтэрсэн байна.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAddManhwa();
                    }}
                    className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <span>{t.addNewManhwa}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full py-2 rounded-lg bg-[#0d1017] hover:bg-[#141822] text-slate-400 hover:text-red-400 transition-colors flex items-center justify-center gap-2 border border-[#161a25]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.signOut}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <p className="text-amber-400 text-center text-[11px]">
                    {t.accessDenied} ({adminEmail})
                  </p>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full py-2 rounded-lg bg-[#0d1017] hover:bg-[#141822] text-slate-300 transition-colors flex items-center justify-center gap-2 border border-[#161a25]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Гарах / Өөр хаягаар нэвтрэх</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-2.5 border border-slate-700 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                ) : (
                  <Shield className="w-4 h-4 text-slate-300" />
                )}
                <span>{t.signInWithGoogle}</span>
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                Зөвхөн {adminEmail} хаягаар нэвтрэх үед админ тохиргоонууд идэвхжинэ.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
