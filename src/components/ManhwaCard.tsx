import React from 'react';
import { Manhwa } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Edit2, Trash2, BookOpen } from 'lucide-react';
import { MediaImage } from './MediaImage';

interface ManhwaCardProps {
  manhwa: Manhwa;
  chapterCount?: number;
  onSelect: (manhwa: Manhwa) => void;
  onEdit?: (manhwa: Manhwa) => void;
  onDelete?: (manhwa: Manhwa) => void;
}

export const ManhwaCard: React.FC<ManhwaCardProps> = ({
  manhwa,
  chapterCount,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-[#0f1715] text-[#93bfa9] border-[#1c2e26]';
      case 'completed':
        return 'bg-[#121620] text-[#94a8c9] border-[#1e2637]';
      case 'hiatus':
        return 'bg-[#18150f] text-[#c9b18f] border-[#30271c]';
      default:
        return 'bg-[#11141c] text-slate-400 border-[#1a1f2b]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ongoing':
        return t.ongoing;
      case 'completed':
        return t.completed;
      case 'hiatus':
        return t.hiatus;
      default:
        return status;
    }
  };

  return (
    <div
      onClick={() => onSelect(manhwa)}
      className="group relative flex flex-col bg-[#090b10] border border-[#141822] hover:border-[#222938] rounded-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/70 cursor-pointer text-left"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#050608]">
        <MediaImage
          src={manhwa.coverUrl}
          alt={manhwa.title}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-500 ease-out"
          fallbackSrc="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=80"
        />

        {/* Subtle Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#090b10] via-transparent to-black/25 pointer-events-none" />

        {/* Status Badge - Desaturated */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          <span
            className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded border backdrop-blur-md font-cyrillic ${getStatusStyle(
              manhwa.status
            )}`}
          >
            {getStatusLabel(manhwa.status)}
          </span>
        </div>

        {/* Release Year Badge */}
        {manhwa.releaseYear && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/70 text-slate-400 border border-white/5 backdrop-blur-md">
              {manhwa.releaseYear}
            </span>
          </div>
        )}

        {/* Chapter count overlay at bottom of image */}
        {typeof chapterCount === 'number' && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-[#07090e]/90 text-slate-300 border border-[#161c28] backdrop-blur-sm">
              <BookOpen className="w-3 h-3 text-slate-400" />
              <span>
                {chapterCount} {t.chapter.toLowerCase()}
              </span>
            </span>
          </div>
        )}

        {/* Admin Quick Action Floating Buttons - EXCLUSIVELY FOR ADMIN */}
        {isAdmin && (
          <div
            className="absolute bottom-2 left-2 flex items-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(manhwa);
                }}
                title={t.editManhwa}
                className="p-1.5 rounded-md bg-[#090b10]/90 hover:bg-[#151c28] text-slate-300 hover:text-white border border-[#1b2230] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(manhwa);
                }}
                title={t.deleteManhwa}
                className="p-1.5 rounded-md bg-[#090b10]/90 hover:bg-red-950/50 text-slate-300 hover:text-red-300 border border-[#1b2230] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2 font-cyrillic">
        <div>
          <h3 className="font-semibold text-xs sm:text-sm text-slate-100 group-hover:text-slate-300 line-clamp-1 transition-colors">
            {manhwa.title}
          </h3>
          {manhwa.altTitles && (
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-light">
              {manhwa.altTitles}
            </p>
          )}
        </div>

        {/* Genres */}
        {manhwa.genres && manhwa.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {manhwa.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="text-[9px] text-slate-400 bg-[#0d1017] border border-[#171b26] px-1.5 py-0.5 rounded font-normal"
              >
                {genre}
              </span>
            ))}
            {manhwa.genres.length > 3 && (
              <span className="text-[9px] text-slate-500 font-light">
                +{manhwa.genres.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
