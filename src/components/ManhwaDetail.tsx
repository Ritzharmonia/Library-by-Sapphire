import React, { useState, useEffect, useMemo } from 'react';
import { Manhwa, Chapter, Reader } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  manhwaService,
  THIS_WITCH_OF_MINE_ID,
  THIS_WITCH_OF_MINE_CH1_ID,
  THIS_WITCH_OF_MINE_CH1_DATA,
} from '../lib/manhwaService';
import { CommentSection } from './CommentSection';
import { MediaImage } from './MediaImage';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  User,
  Palette,
  ArrowUpDown,
  PlusCircle,
  Edit2,
  Trash2,
  Clock,
  Layers,
  BookMarked,
  Hash,
} from 'lucide-react';

interface ManhwaDetailProps {
  manhwa: Manhwa;
  onBack: () => void;
  onReadChapter: (chapter: Chapter, allChapters: Chapter[]) => void;
  onEditManhwa: (manhwa: Manhwa) => void;
  onDeleteManhwa: (manhwa: Manhwa) => void;
  onAddChapter: (manhwa: Manhwa) => void;
  onEditChapter: (manhwa: Manhwa, chapter: Chapter) => void;
  onDeleteChapter: (chapter: Chapter) => void;
  currentReader: Reader | null;
  onOpenReaderAuth: () => void;
}

export const ManhwaDetail: React.FC<ManhwaDetailProps> = ({
  manhwa,
  onBack,
  onReadChapter,
  onEditManhwa,
  onDeleteManhwa,
  onAddChapter,
  onEditChapter,
  onDeleteChapter,
  currentReader,
  onOpenReaderAuth,
}) => {
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState<boolean>(true);
  const [isAscending, setIsAscending] = useState<boolean>(true);
  const [showFullSynopsis, setShowFullSynopsis] = useState<boolean>(false);
  const [lastReadChapterNum, setLastReadChapterNum] = useState<number | null>(null);

  // Check last read chapter from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`aetheria_read_${manhwa.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.chapterNumber) {
          setLastReadChapterNum(parsed.chapterNumber);
        }
      }
    } catch {
      // ignore
    }
  }, [manhwa.id]);

  // Subscribe to chapters for this manhwa
  useEffect(() => {
    setLoadingChapters(true);
    const unsubscribe = manhwaService.subscribeChapters(manhwa.id, (list) => {
      setChapters(list);
      setLoadingChapters(false);
    });
    return () => unsubscribe();
  }, [manhwa.id]);

  const displayedChapters = useMemo(() => {
    const isWitch = manhwa.id === THIS_WITCH_OF_MINE_ID;
    const hasCh1 = chapters.some(
      (c) => c.id === THIS_WITCH_OF_MINE_CH1_ID || c.chapterNumber === 1
    );
    const alreadySynced = localStorage.getItem('sapphire_witch_ch1_synced_v1') === 'true';

    if (isWitch && !loadingChapters && !hasCh1 && !alreadySynced) {
      return [
        {
          id: THIS_WITCH_OF_MINE_CH1_ID,
          ...THIS_WITCH_OF_MINE_CH1_DATA,
          createdAt: '2026-11-14T23:45:00Z',
          updatedAt: '2026-11-14T23:45:00Z',
        },
        ...chapters,
      ];
    }
    return chapters;
  }, [chapters, loadingChapters, manhwa.id]);

  const sortedChapters = [...displayedChapters].sort((a, b) => {
    return isAscending
      ? a.chapterNumber - b.chapterNumber
      : b.chapterNumber - a.chapterNumber;
  });

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

  const handleStartReading = () => {
    if (displayedChapters.length === 0) return;
    const firstChapter = [...displayedChapters].sort((a, b) => a.chapterNumber - b.chapterNumber)[0];
    onReadChapter(firstChapter, displayedChapters);
  };

  const handleContinueReading = () => {
    if (!lastReadChapterNum) {
      handleStartReading();
      return;
    }
    const found = displayedChapters.find((c) => c.chapterNumber === lastReadChapterNum);
    if (found) {
      onReadChapter(found, displayedChapters);
    } else {
      handleStartReading();
    }
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-200 pb-20 font-cyrillic">
      {/* Top back navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-md bg-[#0a0d14] border border-[#141822] hover:border-[#222938]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.backToLibrary}</span>
        </button>
      </div>

      {/* Hero Manhwa Information Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
        <div className="relative bg-[#080b10] border border-[#141824] rounded-xl p-5 sm:p-8 backdrop-blur-sm shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: Cover Art Card */}
            <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center">
              <div className="relative aspect-[3/4] w-full max-w-[250px] rounded-lg overflow-hidden border border-[#1b212f] shadow-xl bg-[#050608]">
                <MediaImage
                  src={manhwa.coverUrl}
                  alt={manhwa.title}
                  className="w-full h-full object-cover"
                  fallbackSrc="https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=80"
                />
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span
                    className={`text-[9px] uppercase font-semibold px-2 py-0.5 rounded border backdrop-blur-md ${getStatusStyle(
                      manhwa.status
                    )}`}
                  >
                    {getStatusLabel(manhwa.status)}
                  </span>
                </div>
              </div>

              {/* Primary Call to Action Button */}
              {displayedChapters.length > 0 && (
                <div className="w-full max-w-[250px] mt-4 flex flex-col gap-2">
                  {lastReadChapterNum ? (
                    <button
                      onClick={handleContinueReading}
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all shadow-md"
                    >
                      <BookOpen className="w-4 h-4 text-slate-300" />
                      <span>
                        {t.continueReading} (Ch. {lastReadChapterNum})
                      </span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStartReading}
                      className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all shadow-md"
                    >
                      <BookOpen className="w-4 h-4 text-slate-300" />
                      <span>{t.readNow} (Ch. 1)</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Detailed Metadata */}
            <div className="md:col-span-8 lg:col-span-9 flex flex-col gap-4">
              {/* Header Titles & Admin Controls */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#141822] pb-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                    {manhwa.title}
                  </h1>
                  {manhwa.altTitles && (
                    <p className="text-xs sm:text-sm text-slate-400 font-light mt-1">
                      {manhwa.altTitles}
                    </p>
                  )}
                </div>

                {/* Admin Management Buttons - ONLY FOR ADMIN */}
                {isAdmin && (
                  <div className="flex items-center gap-2 self-start">
                    <button
                      onClick={() => onEditManhwa(manhwa)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0f131c] hover:bg-[#161c28] text-xs font-medium text-slate-300 hover:text-white border border-[#1b2230] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{t.editManhwa}</span>
                    </button>
                    <button
                      onClick={() => onDeleteManhwa(manhwa)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-950/30 hover:bg-red-900/40 text-xs font-medium text-red-300 border border-red-800/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.deleteManhwa}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Meta properties grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {manhwa.author && (
                  <div className="bg-[#0b0e14] border border-[#151924] p-2.5 rounded-lg">
                    <span className="text-slate-500 flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {t.author}
                    </span>
                    <span className="font-medium text-slate-200 line-clamp-1">
                      {manhwa.author}
                    </span>
                  </div>
                )}

                {manhwa.artist && (
                  <div className="bg-[#0b0e14] border border-[#151924] p-2.5 rounded-lg">
                    <span className="text-slate-500 flex items-center gap-1 mb-1">
                      <Palette className="w-3 h-3 text-slate-400" />
                      {t.artist}
                    </span>
                    <span className="font-medium text-slate-200 line-clamp-1">
                      {manhwa.artist}
                    </span>
                  </div>
                )}

                {manhwa.releaseYear && (
                  <div className="bg-[#0b0e14] border border-[#151924] p-2.5 rounded-lg">
                    <span className="text-slate-500 flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {t.releaseYear}
                    </span>
                    <span className="font-medium text-slate-200">
                      {manhwa.releaseYear}
                    </span>
                  </div>
                )}

                <div className="bg-[#0b0e14] border border-[#151924] p-2.5 rounded-lg">
                  <span className="text-slate-500 flex items-center gap-1 mb-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    {t.chapters}
                  </span>
                  <span className="font-medium text-slate-300">
                    {displayedChapters.length} {t.chapter.toLowerCase()}
                  </span>
                </div>

                {manhwa.volumes && (
                  <div className="bg-[#0b0e14] border border-[#151924] p-2.5 rounded-lg">
                    <span className="text-slate-500 flex items-center gap-1 mb-1">
                      <BookMarked className="w-3 h-3 text-slate-400" />
                      {t.volumes}
                    </span>
                    <span className="font-medium text-slate-200">
                      {manhwa.volumes}
                    </span>
                  </div>
                )}

                {manhwa.chapterNote && (
                  <div className="bg-[#0b0e14] border border-[#151924] p-2.5 rounded-lg col-span-2 sm:col-span-3">
                    <span className="text-slate-500 flex items-center gap-1 mb-1">
                      <Hash className="w-3 h-3 text-slate-400" />
                      {t.totalChaptersInfo}
                    </span>
                    <span className="font-medium text-slate-200">
                      {manhwa.chapterNote}
                    </span>
                  </div>
                )}
              </div>

              {/* Genres list */}
              {manhwa.genres && manhwa.genres.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-500 mr-1">{t.genres}:</span>
                  {manhwa.genres.map((genre) => (
                    <span
                      key={genre}
                      className="text-xs px-2.5 py-1 rounded-md bg-[#0d1017] text-slate-300 border border-[#171b26] font-normal"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              <div className="mt-2">
                <h4 className="text-xs uppercase font-semibold text-slate-400 tracking-wider mb-2">
                  {t.synopsis}
                </h4>
                <div className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-light">
                  {(() => {
                    const activeSynopsis =
                      lang === 'en' && manhwa.synopsisEn
                        ? manhwa.synopsisEn
                        : manhwa.synopsis || manhwa.synopsisEn || '';
                    if (!activeSynopsis) {
                      return <p className="text-slate-500 italic text-xs">{t.noSynopsis}</p>;
                    }
                    return (
                      <div>
                        <p
                          className={
                            !showFullSynopsis && activeSynopsis.length > 350
                              ? 'line-clamp-5'
                              : ''
                          }
                        >
                          {activeSynopsis}
                        </p>
                        {activeSynopsis.length > 350 && (
                          <button
                            onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                            className="mt-1 text-xs text-slate-400 hover:text-slate-200 underline font-medium focus:outline-none"
                          >
                            {showFullSynopsis ? 'Хураангуйлах' : 'Цааш унших...'}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-[#080b10] border border-[#141824] rounded-xl p-5 sm:p-7 shadow-lg">
          {/* Chapter header bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#141822]">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-400" />
                <span>{t.chapters}</span>
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#0e121a] text-slate-400 border border-[#171c28]">
                {displayedChapters.length} {t.chapter.toLowerCase()}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Sort Order Toggle */}
              <button
                onClick={() => setIsAscending(!isAscending)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0d1017] hover:bg-[#141822] text-xs text-slate-300 border border-[#171b26] transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAscending ? t.orderAsc : t.orderDesc}</span>
              </button>

              {/* Admin Add Chapter Button */}
              {isAdmin && (
                <button
                  onClick={() => onAddChapter(manhwa)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{t.addChapter}</span>
                </button>
              )}
            </div>
          </div>

          {/* Chapters List */}
          <div className="mt-4">
            {loadingChapters ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                <p>Бүлгүүдийг ачаалж байна...</p>
              </div>
            ) : sortedChapters.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                <BookOpen className="w-8 h-8 text-slate-600 stroke-1" />
                <p className="text-slate-400 text-xs">{t.noChapters}</p>
                {isAdmin && (
                  <button
                    onClick={() => onAddChapter(manhwa)}
                    className="mt-2 text-xs font-semibold text-slate-300 hover:underline"
                  >
                    + {t.addChapter}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-[#10141e]">
                {sortedChapters.map((chapter) => {
                  const isLastRead = lastReadChapterNum === chapter.chapterNumber;
                  return (
                    <div
                      key={chapter.id}
                      onClick={() => onReadChapter(chapter, displayedChapters)}
                      className="group py-3.5 px-3 -mx-3 rounded-lg hover:bg-[#0c0f16] transition-colors flex items-center justify-between gap-4 cursor-pointer"
                    >
                      {/* Chapter info */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                            isLastRead
                              ? 'bg-[#18202d] text-slate-200 border border-[#2b3548]'
                              : 'bg-[#0d1017] text-slate-400 border border-[#171b26] group-hover:text-slate-200 group-hover:border-[#22293a]'
                          }`}
                        >
                          #{chapter.chapterNumber}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-slate-200 group-hover:text-white transition-colors">
                              {t.chapter} {chapter.chapterNumber}
                              {chapter.title ? `: ${chapter.title}` : ''}
                            </span>
                            {isLastRead && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#131924] text-slate-300 border border-[#1d2738] font-medium">
                                Сүүлд уншсан
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            {chapter.uploadDate && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {chapter.uploadDate}
                              </span>
                            )}
                            <span>
                              {chapter.pages?.length || 0} {t.pagesCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right actions */}
                      <div className="flex items-center gap-3">
                        {/* Read CTA */}
                        <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all">
                          {t.readNow} →
                        </span>

                        {/* Admin Chapter Tools - ONLY VISIBLE TO ADMIN */}
                        {isAdmin && (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditChapter(manhwa, chapter);
                              }}
                              title={t.editChapter}
                              className="p-1.5 rounded text-slate-500 hover:text-slate-200 hover:bg-[#151a24] transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChapter(chapter);
                              }}
                              title={t.deleteChapter}
                              className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-[#151a24] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments Section for Manhwa Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <CommentSection
          manhwaId={manhwa.id}
          targetType="manhwa"
          currentReader={currentReader}
          onOpenReaderAuth={onOpenReaderAuth}
        />
      </div>
    </div>
  );
};
