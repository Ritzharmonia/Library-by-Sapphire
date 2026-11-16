import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-cyrillic">
      <div className="relative w-full max-w-sm bg-[#090c12] border border-[#171b26] rounded-xl shadow-2xl p-6 text-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-950/40 border border-red-800/30 flex items-center justify-center text-red-400 flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[#141822]">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-md bg-[#0d1017] text-xs font-semibold text-slate-300 hover:bg-[#141822] transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-1.5 rounded-md bg-red-900/60 hover:bg-red-800 text-xs font-semibold text-white border border-red-700/50 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Устгаж байна...' : t.confirmDelete}
          </button>
        </div>
      </div>
    </div>
  );
};
