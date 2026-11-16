import React, { useState, useEffect, useRef } from 'react';
import { Chapter, Manhwa, Reader } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { CommentSection } from './CommentSection';
import { MediaImage } from './MediaImage';
import { prefetchMediaUrls } from '../lib/storage';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  List,
  ScrollText,
  BookOpen,
  Home,
  MessageSquare,
} from 'lucide-react';

interface ChapterReaderProps {
  manhwa: Manhwa;
  chapter: Chapter;
  allChapters: Chapter[];
  onBackToDetails: () => void;
  onGoHome: () => void;
  onSelectChapter: (chapter: Chapter) => void;
  currentReader: Reader | null;
  onOpenReaderAuth: () => void;
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  manhwa,
  chapter,
  allChapters,
  onBackToDetails,
  onGoHome,
  onSelectChapter,
  currentReader,
  onOpenReaderAuth,
}) => {
  const { t } = useLanguage();
  const [readingMode, setReadingMode] = useState<'scroll' | 'paged'>('scroll');
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const controlsTimeoutRef = useRef<number | null>(null);
  const readerContainerRef = useRef<HTMLDivElement>(null);

  const sortedChapters = [...allChapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  const currentIndex = sortedChapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < sortedChapters.length - 1
      ? sortedChapters[currentIndex + 1]
      : null;

  const pages = chapter.pages || [];

  // Save read history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        `aetheria_read_${manhwa.id}`,
        JSON.stringify({
          chapterId: chapter.id,
          chapterNumber: chapter.chapterNumber,
          timestamp: Date.now(),
        })
      );
    } catch {
      // ignore
    }
  }, [manhwa.id, chapter.id, chapter.chapterNumber]);

  // Scroll to top on chapter change and prefetch all pages quickly
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setCurrentPageIndex(0);
    if (chapter.pages && chapter.pages.length > 0) {
      void prefetchMediaUrls(chapter.pages, 4);
    }
  }, [chapter.id, chapter.pages]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(progress);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (readingMode === 'paged') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          if (currentPageIndex < pages.length - 1) {
            setCurrentPageIndex((prev) => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (nextChapter) {
            onSelectChapter(nextChapter);
          }
        } else if (e.key === 'ArrowLeft') {
          if (currentPageIndex > 0) {
            setCurrentPageIndex((prev) => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (prevChapter) {
            onSelectChapter(prevChapter);
          }
        }
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, currentPageIndex, pages.length, nextChapter, prevChapter]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (window.scrollY > 200 && readingMode === 'scroll') {
        setShowControls(false);
      }
    }, 3500);
  };

  return (
    <div
      ref={readerContainerRef}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      className="min-h-screen bg-[#050608] text-slate-200 flex flex-col selection:bg-slate-700 font-cyrillic"
    >
      {/* Top Floating Reading Progress Bar - Desaturated Steel */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-[#0a0d14]">
        <div
          className="h-full bg-slate-400 transition-all duration-150 ease-out"
          style={{
            width: `${
              readingMode === 'scroll'
                ? scrollProgress
                : pages.length > 0
                ? ((currentPageIndex + 1) / pages.length) * 100
                : 0
            }%`,
          }}
        />
      </div>

      {/* Top Fixed Control Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-[#07090e]/95 backdrop-blur-md border-b border-[#141822] transition-transform duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Back Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onBackToDetails}
              title={t.backToDetails}
              className="p-2 rounded-md hover:bg-[#121620] text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onGoHome}
              title={t.backToLibrary}
              className="p-2 rounded-md hover:bg-[#121620] text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              <Home className="w-4 h-4" />
            </button>

            <div className="border-l border-[#191e2b] pl-2.5 sm:pl-3">
              <h2 className="text-xs sm:text-sm font-bold text-slate-200 line-clamp-1 max-w-[150px] sm:max-w-xs">
                {manhwa.title}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">
                {t.chapter} {chapter.chapterNumber}
                {chapter.title ? ` - ${chapter.title}` : ''}
              </p>
            </div>
          </div>

          {/* Center: Chapter Selector Dropdown */}
          <div className="flex items-center gap-1">
            <button
              disabled={!prevChapter}
              onClick={() => prevChapter && onSelectChapter(prevChapter)}
              className="p-1.5 rounded-md hover:bg-[#121620] disabled:opacity-30 disabled:pointer-events-none text-slate-400 hover:text-white transition-colors"
              title={t.prevChapter}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={chapter.id}
              onChange={(e) => {
                const target = allChapters.find((c) => c.id === e.target.value);
                if (target) onSelectChapter(target);
              }}
              className="bg-[#0b0e14] border border-[#161a25] text-slate-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:border-[#2f384c] max-w-[140px] sm:max-w-[200px]"
            >
              {sortedChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {t.chapter} {c.chapterNumber} {c.title ? `(${c.title})` : ''}
                </option>
              ))}
            </select>

            <button
              disabled={!nextChapter}
              onClick={() => nextChapter && onSelectChapter(nextChapter)}
              className="p-1.5 rounded-md hover:bg-[#121620] disabled:opacity-30 disabled:pointer-events-none text-slate-400 hover:text-white transition-colors"
              title={t.nextChapter}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Mode & Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Reading Mode Switcher */}
            <button
              onClick={() =>
                setReadingMode(readingMode === 'scroll' ? 'paged' : 'scroll')
              }
              title={readingMode === 'scroll' ? t.pagedMode : t.scrollMode}
              className="p-2 rounded-md hover:bg-[#121620] text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
            >
              {readingMode === 'scroll' ? (
                <ScrollText className="w-4 h-4 text-slate-400" />
              ) : (
                <BookOpen className="w-4 h-4 text-slate-400" />
              )}
              <span className="hidden md:inline text-slate-400">
                {readingMode === 'scroll' ? 'Webtoon' : 'Paged'}
              </span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? t.exitFullscreen : t.fullscreen}
              className="p-2 rounded-md hover:bg-[#121620] text-slate-400 hover:text-white transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Reader Canvas */}
      <main className="flex-1 flex flex-col items-center pt-14 pb-16">
        {pages.length === 0 ? (
          <div className="my-auto py-24 text-center">
            <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3 stroke-1" />
            <p className="text-slate-400 text-xs font-medium">{t.noChapters}</p>
            <button
              onClick={onBackToDetails}
              className="mt-4 px-4 py-2 rounded-md bg-[#0e121a] text-xs text-slate-300 hover:underline border border-[#161b26]"
            >
              {t.backToDetails}
            </button>
          </div>
        ) : readingMode === 'scroll' ? (
          /* Webtoon Continuous Vertical Scroll Mode */
          <div className="w-full max-w-3xl flex flex-col items-center bg-[#000000]">
            {pages.map((pageUrl, idx) => (
              <div key={`${chapter.id}_${idx}`} className="w-full relative">
                <MediaImage
                  src={pageUrl}
                  alt={`Page ${idx + 1}`}
                  loading={idx < 5 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="w-full h-auto min-h-[260px] block select-none pointer-events-auto"
                  fallbackSrc="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85"
                />
              </div>
            ))}
          </div>
        ) : (
          /* Paginated Mode */
          <div className="w-full max-w-3xl flex flex-col items-center my-auto px-4">
            <div className="relative w-full max-w-2xl bg-black rounded-lg overflow-hidden border border-[#141822] shadow-2xl">
              <MediaImage
                src={pages[currentPageIndex]}
                alt={`Page ${currentPageIndex + 1}`}
                decoding="async"
                className="w-full h-auto max-h-[85vh] object-contain mx-auto select-none"
                fallbackSrc="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85"
              />
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-4 mt-6">
              <button
                disabled={currentPageIndex === 0}
                onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2 rounded-md bg-[#0b0e14] border border-[#161a25] text-xs font-semibold text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-[#121620] transition-colors flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Өмнөх хуудас</span>
              </button>

              <span className="text-xs text-slate-500 font-mono">
                {t.page} {currentPageIndex + 1} {t.of} {pages.length}
              </span>

              <button
                disabled={currentPageIndex >= pages.length - 1}
                onClick={() =>
                  setCurrentPageIndex((prev) => Math.min(pages.length - 1, prev + 1))
                }
                className="px-4 py-2 rounded-md bg-[#0b0e14] border border-[#161a25] text-xs font-semibold text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-[#121620] transition-colors flex items-center gap-1.5"
              >
                <span>Дараах хуудас</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* End of Chapter Navigation Card */}
        {pages.length > 0 && (
          <div className="w-full max-w-3xl mt-12 px-4 space-y-8">
            <div className="bg-[#080b10] border border-[#141824] rounded-xl p-6 text-center flex flex-col items-center gap-4 shadow-xl">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                {t.chapter} {chapter.chapterNumber} уншиж дууслаа
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {prevChapter && (
                  <button
                    onClick={() => onSelectChapter(prevChapter)}
                    className="px-4 py-2.5 rounded-lg bg-[#0d1017] border border-[#181d2a] text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#131722] transition-colors flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{t.prevChapter}</span>
                  </button>
                )}

                <button
                  onClick={onBackToDetails}
                  className="px-4 py-2.5 rounded-lg bg-[#0d1017] border border-[#181d2a] text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#131722] transition-colors flex items-center gap-2"
                >
                  <List className="w-4 h-4 text-slate-400" />
                  <span>{t.backToDetails}</span>
                </button>

                {nextChapter ? (
                  <button
                    onClick={() => onSelectChapter(nextChapter)}
                    className="px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-all flex items-center gap-2 border border-slate-700 shadow-md"
                  >
                    <span>
                      {t.nextChapter} ({nextChapter.chapterNumber})
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 font-medium px-4 py-2.5">
                    Та хамгийн сүүлийн бүлгийг уншлаа 🎉
                  </span>
                )}
              </div>
            </div>

            {/* Individual Chapter Comments Section */}
            <CommentSection
              manhwaId={manhwa.id}
              chapterId={chapter.id}
              targetType="chapter"
              currentReader={currentReader}
              onOpenReaderAuth={onOpenReaderAuth}
            />
          </div>
        )}
      </main>
    </div>
  );
};
