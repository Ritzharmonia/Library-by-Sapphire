import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { commentService } from '../lib/commentService';
import { uploadImage } from '../lib/storage';
import { Reader } from '../types';
import {
  X,
  User,
  KeyRound,
  Upload,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ReaderAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reader: Reader) => void;
  currentReader?: Reader | null;
}

export const ReaderAuthModal: React.FC<ReaderAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentReader,
}) => {
  const { t } = useLanguage();
  const [firstName, setFirstName] = useState(currentReader?.firstName || '');
  const [lastName, setLastName] = useState(currentReader?.lastName || '');
  const [pin, setPin] = useState(currentReader?.pin || '');
  const [avatarUrl, setAvatarUrl] = useState(currentReader?.avatarUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage('');
      const uploaded = await uploadImage(file, 'avatars');
      setAvatarUrl(uploaded);
    } catch (err: any) {
      setErrorMessage('Зураг хуулахад алдаа гарлаа: ' + (err.message || 'Error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarPreset = (seed: string) => {
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Нэр болон овгоо бүтэн оруулна уу.');
      return;
    }

    const cleanPin = pin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      setErrorMessage('Нууц код нь заавал 4 оронтой тоо байх ёстой (жишээ: 1234).');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const reader = await commentService.loginOrRegisterReader(
        firstName,
        lastName,
        cleanPin,
        avatarUrl
      );
      onSuccess(reader);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Нэвтрэхэд алдаа гарлаа.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0a0d13] border border-[#171b26] rounded-xl shadow-2xl p-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#141822]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#141824] border border-[#1e2433] flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {currentReader ? t.readerProfile : t.readerLogin}
              </h2>
              <p className="text-[11px] text-slate-400 font-light">
                {t.guestPrompt}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#141824] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Avatar Preview & Upload */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-[#0e121a] border border-[#161a25]">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-black/50 border border-[#232a3b] flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500">
                  <User className="w-6 h-6 stroke-1" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <span className="font-semibold text-slate-300 block text-xs">
                {t.avatar}
              </span>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#151a24] hover:bg-[#1c2331] text-slate-300 hover:text-white text-[11px] font-medium border border-[#202738] transition-colors">
                  <Upload className="w-3 h-3 text-slate-400" />
                  <span>{isUploading ? t.uploading : t.uploadAvatar}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                {isUploading && (
                  <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                )}
              </div>

              {/* Quick Preset Avatars */}
              <div className="flex items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-500">Эсвэл:</span>
                {['Jinwoo', 'Dokja', 'Arthur', 'Cheong', 'Sapphire'].map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => handleAvatarPreset(seed)}
                    className="w-5 h-5 rounded-full overflow-hidden border border-[#252c3d] hover:border-slate-400"
                    title={seed}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}`}
                      alt={seed}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.lastName} *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Жишээ: Бат"
                className="w-full bg-[#0d1017] border border-[#1a1f2c] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#38445e]"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.firstName} *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Жишээ: Болд"
                className="w-full bg-[#0d1017] border border-[#1a1f2c] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#38445e]"
              />
            </div>
          </div>

          {/* 4-digit PIN */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              {t.pinPassword} *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                maxLength={4}
                required
                pattern="\d{4}"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4 оронтой нууц код (жишээ: 1234)"
                className="w-full bg-[#0d1017] border border-[#1a1f2c] rounded-md pl-9 pr-3 py-2 text-slate-200 tracking-widest font-mono text-sm focus:outline-none focus:border-[#38445e]"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{t.pinHelp}</p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#141822]">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-md bg-[#0e121a] text-slate-300 hover:bg-[#151a24] transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isLoading || isUploading}
              className="px-5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center gap-2 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t.registerOrLogin}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
