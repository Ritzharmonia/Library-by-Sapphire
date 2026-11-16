import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { ManhwaCard } from './components/ManhwaCard';
import { ManhwaDetail } from './components/ManhwaDetail';
import { ChapterReader } from './components/ChapterReader';
import { AdminModal } from './components/AdminModal';
import { ChapterModal } from './components/ChapterModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ReaderAuthModal } from './components/ReaderAuthModal';
import { ConfirmModal } from './components/ConfirmModal';
import {
  manhwaService,
  THIS_WITCH_OF_MINE_ID,
  THIS_WITCH_OF_MINE_DATA,
  THIS_WITCH_OF_MINE_CH1_ID,
  THIS_WITCH_OF_MINE_CH1_DATA,
} from './lib/manhwaService';
import { MediaImage } from './components/MediaImage';
import { commentService } from './lib/commentService';
import { Manhwa, Chapter, ManhwaStatus, Reader } from './types';
import {
  BookOpen,
  Filter,
  Sparkles,
  LayoutGrid,
  List,
  ArrowUpDown,
  Database,
  CheckCircle,
} from 'lucide-react';

function LibraryMain() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();

  // Reader profile (Simple Name + 4-digit PIN)
  const [currentReader, setCurrentReader] = useState<Reader | null>(() => {
    return commentService.getCurrentReader();
  });
  const [isReaderAuthOpen, setIsReaderAuthOpen] = useState(false);

  // Navigation states
  const [currentView, setCurrentView] = useState<'home' | 'detail' | 'reader'>('home');
  const [selectedManhwa, setSelectedManhwa] = useState<Manhwa | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [allChaptersForReader, setAllChaptersForReader] = useState<Chapter[]>([]);

  // Data states
  const [manhwas, setManhwas] = useState<Manhwa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | ManhwaStatus>('all');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'newest'>('default');
  const [viewLayout, setViewLayout] = useState<'grid' | 'compact'>('grid');

  // Modals
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [editingManhwa, setEditingManhwa] = useState<Manhwa | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [targetManhwaForChapter, setTargetManhwaForChapter] = useState<Manhwa | null>(null);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    type: 'manhwa' | 'chapter';
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: 'manhwa',
    id: '',
    title: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Subscribe to manhwa list in real-time
  useEffect(() => {
    setLoading(true);
    const unsubscribe = manhwaService.subscribeManhwaList((list) => {
      setManhwas(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auto-persist "This Witch Of Mine" and Chapter 1 into Firestore when Admin is authenticated
  useEffect(() => {
    if (loading || !isAdmin) return;

    const syncWitchAndChapter1 = async () => {
      const alreadyInDb = manhwas.some(
        (m) =>
          m.id === THIS_WITCH_OF_MINE_ID ||
          m.title.trim().toLowerCase() === 'this witch of mine'
      );
      const manhwaSynced = localStorage.getItem('sapphire_witch_synced_v1') === 'true';

      if (alreadyInDb) {
        if (!manhwaSynced) {
          localStorage.setItem('sapphire_witch_synced_v1', 'true');
        }
      } else if (!manhwaSynced) {
        try {
          localStorage.setItem('sapphire_witch_synced_v1', 'true');
          await manhwaService.upsertManhwa(THIS_WITCH_OF_MINE_ID, THIS_WITCH_OF_MINE_DATA);
          showToast('«This Witch Of Mine» сан руу хадгалагдлаа.');
        } catch (err) {
          localStorage.removeItem('sapphire_witch_synced_v1');
          console.error('Failed to sync This Witch Of Mine:', err);
          return;
        }
      }

      const ch1Synced = localStorage.getItem('sapphire_witch_ch1_synced_v1') === 'true';
      if (!ch1Synced) {
        try {
          const existsCh1 = await manhwaService.hasChapter(THIS_WITCH_OF_MINE_ID, 1);
          if (existsCh1) {
            localStorage.setItem('sapphire_witch_ch1_synced_v1', 'true');
          } else {
            localStorage.setItem('sapphire_witch_ch1_synced_v1', 'true');
            await manhwaService.upsertChapter(
              THIS_WITCH_OF_MINE_CH1_ID,
              THIS_WITCH_OF_MINE_CH1_DATA
            );
            showToast('«This Witch Of Mine» — Бүлэг 1 сан руу хадгалагдлаа.');
          }
        } catch (err) {
          localStorage.removeItem('sapphire_witch_ch1_synced_v1');
          console.error('Failed to sync This Witch Of Mine Chapter 1:', err);
        }
      }
    };

    void syncWitchAndChapter1();
  }, [isAdmin, loading, manhwas]);

  // Catalog combining Firestore records with pending "This Witch Of Mine" before admin sync
  const catalogManhwas = useMemo(() => {
    const alreadyInDb = manhwas.some(
      (m) =>
        m.id === THIS_WITCH_OF_MINE_ID ||
        m.title.trim().toLowerCase() === 'this witch of mine'
    );
    const alreadySynced = localStorage.getItem('sapphire_witch_synced_v1') === 'true';

    if (!loading && !alreadyInDb && !alreadySynced) {
      return [
        {
          id: THIS_WITCH_OF_MINE_ID,
          ...THIS_WITCH_OF_MINE_DATA,
          createdAt: '2026-11-14T23:23:33Z',
          updatedAt: '2026-11-14T23:23:33Z',
        },
        ...manhwas,
      ];
    }
    return manhwas;
  }, [manhwas, loading]);

  // Filtered and sorted manhwas
  const filteredManhwas = useMemo(() => {
    let result = [...catalogManhwas];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }

    // Genre filter
    if (selectedGenre) {
      result = result.filter(
        (m) => m.genres && m.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())
      );
    }

    // Search query filter (title, altTitles, author, artist, genre)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.altTitles?.toLowerCase().includes(q) ||
          m.author?.toLowerCase().includes(q) ||
          m.artist?.toLowerCase().includes(q) ||
          m.genres?.some((g) => g.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    } else {
      result.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    }

    return result;
  }, [catalogManhwas, statusFilter, selectedGenre, searchQuery, sortBy]);

  // All unique genres from catalog
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    catalogManhwas.forEach((m) => {
      m.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [catalogManhwas]);

  // Handle Manhwa selection
  const handleSelectManhwa = (manhwa: Manhwa) => {
    setSelectedManhwa(manhwa);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Handle Reading Chapter
  const handleReadChapter = (chapter: Chapter, allChapters: Chapter[]) => {
    setSelectedChapter(chapter);
    setAllChaptersForReader(allChapters);
    setCurrentView('reader');
  };

  // Admin Actions
  const handleSaveManhwa = async (data: Omit<Manhwa, 'id'>, id?: string) => {
    if (id) {
      const existsInDb = manhwas.some((m) => m.id === id);
      if (existsInDb) {
        await manhwaService.updateManhwa(id, data);
      } else {
        await manhwaService.upsertManhwa(id, data);
      }
      if (selectedManhwa && selectedManhwa.id === id) {
        setSelectedManhwa({ ...selectedManhwa, ...data });
      }
      showToast(t.savedSuccessfully);
    } else {
      await manhwaService.createManhwa(data);
      showToast(t.savedSuccessfully);
    }
  };

  const handleSaveChapter = async (data: Omit<Chapter, 'id'>, id?: string) => {
    if (id) {
      if (id === THIS_WITCH_OF_MINE_CH1_ID) {
        const exists = await manhwaService.hasChapter(THIS_WITCH_OF_MINE_ID, 1);
        if (exists) {
          await manhwaService.updateChapter(id, data);
        } else {
          await manhwaService.upsertChapter(id, data);
        }
        localStorage.setItem('sapphire_witch_ch1_synced_v1', 'true');
      } else {
        await manhwaService.updateChapter(id, data);
      }
      showToast(t.savedSuccessfully);
    } else {
      await manhwaService.createChapter(data);
      showToast(t.savedSuccessfully);
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      if (confirmDelete.type === 'manhwa') {
        if (confirmDelete.id === THIS_WITCH_OF_MINE_ID) {
          localStorage.setItem('sapphire_witch_synced_v1', 'true');
          localStorage.setItem('sapphire_witch_ch1_synced_v1', 'true');
        }
        await manhwaService.deleteManhwa(confirmDelete.id);
        if (selectedManhwa?.id === confirmDelete.id) {
          setCurrentView('home');
          setSelectedManhwa(null);
        }
      } else if (confirmDelete.type === 'chapter') {
        if (confirmDelete.id === THIS_WITCH_OF_MINE_CH1_ID) {
          localStorage.setItem('sapphire_witch_ch1_synced_v1', 'true');
        }
        await manhwaService.deleteChapter(confirmDelete.id);
      }
      showToast(t.deletedSuccessfully);
    } catch (err: any) {
      console.error(err);
    } finally {
      setConfirmDelete({ isOpen: false, type: 'manhwa', id: '', title: '' });
    }
  };

  const handleSeedInitialLibrary = async () => {
    try {
      setLoading(true);
      await manhwaService.seedInitialLibrary();
      showToast(t.seedSuccess);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-slate-200 flex flex-col font-cyrillic selection:bg-slate-700">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#0c1017] border border-[#202738] text-slate-200 px-4 py-2.5 rounded-lg shadow-2xl text-xs font-semibold backdrop-blur-md">
          <CheckCircle className="w-4 h-4 text-slate-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Navbar (Only hidden during Reader view) */}
      {currentView !== 'reader' && (
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          onOpenAddManhwa={() => {
            setEditingManhwa(null);
            setIsAdminModalOpen(true);
          }}
          onGoHome={() => {
            setCurrentView('home');
            setSelectedManhwa(null);
          }}
          currentReader={currentReader}
          onOpenReaderAuth={() => setIsReaderAuthOpen(true)}
        />
      )}

      {/* VIEW ROUTING */}
      {currentView === 'reader' && selectedManhwa && selectedChapter ? (
        <ChapterReader
          manhwa={selectedManhwa}
          chapter={selectedChapter}
          allChapters={allChaptersForReader}
          onBackToDetails={() => setCurrentView('detail')}
          onGoHome={() => {
            setCurrentView('home');
            setSelectedManhwa(null);
          }}
          onSelectChapter={(nextCh) => setSelectedChapter(nextCh)}
          currentReader={currentReader}
          onOpenReaderAuth={() => setIsReaderAuthOpen(true)}
        />
      ) : currentView === 'detail' && selectedManhwa ? (
        <ManhwaDetail
          manhwa={selectedManhwa}
          onBack={() => {
            setCurrentView('home');
            setSelectedManhwa(null);
          }}
          onReadChapter={handleReadChapter}
          onEditManhwa={(m) => {
            setEditingManhwa(m);
            setIsAdminModalOpen(true);
          }}
          onDeleteManhwa={(m) => {
            setConfirmDelete({
              isOpen: true,
              type: 'manhwa',
              id: m.id,
              title: m.title,
            });
          }}
          onAddChapter={(m) => {
            setTargetManhwaForChapter(m);
            setEditingChapter(null);
            setIsChapterModalOpen(true);
          }}
          onEditChapter={(m, ch) => {
            setTargetManhwaForChapter(m);
            setEditingChapter(ch);
            setIsChapterModalOpen(true);
          }}
          onDeleteChapter={(ch) => {
            setConfirmDelete({
              isOpen: true,
              type: 'chapter',
              id: ch.id,
              title: `Бүлэг ${ch.chapterNumber}`,
            });
          }}
          currentReader={currentReader}
          onOpenReaderAuth={() => setIsReaderAuthOpen(true)}
        />
      ) : (
        /* HOMEPAGE VIEW */
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {/* Hero Library Header Banner - Desaturated Matte Dark */}
          <section className="relative overflow-hidden rounded-2xl bg-[#080b10] border border-[#141822] p-6 sm:p-8 mb-8 shadow-xl">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0e121a] border border-[#1a1f2c] text-[10px] font-semibold text-slate-400 mb-3 tracking-widest uppercase">
                <Sparkles className="w-3 h-3 text-slate-400" />
                <span>SAPPHIRE MANHWA ARCHIVE</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white font-cyrillic">
                {t.siteName} — {t.siteSub}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-light mt-2 leading-relaxed">
                Шилдэг соло, үйл явдалт, уран зөгнөлт вебтүүн манхвануудын тав тухтай
                унших зориулалттай цахим сан. Сэтгэгдлээ чөлөөтэй хуваалцаарай.
              </p>

              {/* Status counter chips */}
              <div className="flex items-center gap-4 mt-5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <strong className="text-slate-200 font-semibold">{catalogManhwas.length}</strong>{' '}
                  {t.totalTitles}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                  <strong className="text-slate-200 font-semibold">
                    {catalogManhwas.filter((m) => m.status === 'ongoing').length}
                  </strong>{' '}
                  {t.ongoing}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <strong className="text-slate-200 font-semibold">
                    {catalogManhwas.filter((m) => m.status === 'completed').length}
                  </strong>{' '}
                  {t.completed}
                </span>
              </div>
            </div>

            {/* Quick Admin Seed Button for Empty State */}
            {isAdmin && catalogManhwas.length === 0 && (
              <div className="mt-6 pt-4 border-t border-[#141822] flex items-center gap-3">
                <button
                  onClick={handleSeedInitialLibrary}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
                >
                  <Database className="w-4 h-4 text-slate-300" />
                  <span>{t.seedSampleData}</span>
                </button>
                <span className="text-xs text-slate-400">
                  Solo Leveling, Omniscient Reader зэрэг шилдэг сангуудыг суулгах
                </span>
              </div>
            )}
          </section>

          {/* Controls Bar: Filters, Genres & Sorting */}
          <div className="space-y-3 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Status Filters: All, Ongoing, Completed, Hiatus */}
              <div className="flex items-center gap-1 p-1 bg-[#090b10] border border-[#141822] rounded-lg overflow-x-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-slate-700 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
                  }`}
                >
                  {t.all}
                </button>
                <button
                  onClick={() => setStatusFilter('ongoing')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === 'ongoing'
                      ? 'bg-[#14261f] text-[#93bfa9] font-semibold border border-[#234034]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
                  }`}
                >
                  {t.ongoing}
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === 'completed'
                      ? 'bg-[#161c28] text-slate-200 font-semibold border border-[#232c3f]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
                  }`}
                >
                  {t.completed}
                </button>
                <button
                  onClick={() => setStatusFilter('hiatus')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    statusFilter === 'hiatus'
                      ? 'bg-[#261f14] text-[#c9b18f] font-semibold border border-[#423623]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
                  }`}
                >
                  {t.hiatus}
                </button>
              </div>

              {/* Right Sort & Layout Controls */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                {/* Sort dropdown */}
                <div className="flex items-center gap-1.5 bg-[#090b10] border border-[#141822] px-2.5 py-1.5 rounded-lg text-xs">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer"
                  >
                    <option value="default" className="bg-[#090b10]">
                      {t.sortDefault}
                    </option>
                    <option value="title" className="bg-[#090b10]">
                      {t.sortTitle}
                    </option>
                    <option value="newest" className="bg-[#090b10]">
                      {t.sortNewest}
                    </option>
                  </select>
                </div>

                {/* Grid / Compact View Toggle */}
                <div className="flex items-center bg-[#090b10] border border-[#141822] p-1 rounded-lg">
                  <button
                    onClick={() => setViewLayout('grid')}
                    title={t.gridView}
                    className={`p-1 rounded ${
                      viewLayout === 'grid'
                        ? 'bg-[#141924] text-slate-200'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewLayout('compact')}
                    title={t.compactView}
                    className={`p-1 rounded ${
                      viewLayout === 'compact'
                        ? 'bg-[#141924] text-slate-200'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Seed button if admin */}
                {isAdmin && (
                  <button
                    onClick={handleSeedInitialLibrary}
                    title={t.seedSampleData}
                    className="p-2 rounded-lg bg-[#090b10] border border-[#141822] text-slate-400 hover:text-slate-200 hover:border-[#1d2433] transition-colors"
                  >
                    <Database className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Genre Quick Filter Chips */}
            {availableGenres.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
                <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1 flex-shrink-0">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Жанр:
                </span>
                <button
                  onClick={() => setSelectedGenre(null)}
                  className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
                    selectedGenre === null
                      ? 'bg-slate-700 text-white font-semibold'
                      : 'bg-[#090b10] text-slate-400 hover:text-slate-200 border border-[#141822]'
                  }`}
                >
                  Бүх төрөл
                </button>
                {availableGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() =>
                      setSelectedGenre(selectedGenre === genre ? null : genre)
                    }
                    className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-colors ${
                      selectedGenre === genre
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'bg-[#090b10] text-slate-400 hover:text-slate-200 border border-[#141822]'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manhwa Content Grid */}
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-xs">Номын санг ачаалж байна...</p>
            </div>
          ) : filteredManhwas.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center bg-[#080a0f] border border-[#131722] rounded-xl p-8">
              <BookOpen className="w-12 h-12 text-slate-600 mb-3 stroke-1" />
              <h3 className="text-base font-semibold text-slate-200">
                {t.noManhwaFound}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                {searchQuery || statusFilter !== 'all' || selectedGenre
                  ? t.noManhwaSub
                  : t.emptyLibraryTip}
              </p>

              {(searchQuery || statusFilter !== 'all' || selectedGenre) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setSelectedGenre(null);
                  }}
                  className="mt-4 px-3.5 py-1.5 rounded-md bg-[#0e121a] hover:bg-[#151a24] text-slate-300 text-xs font-medium border border-[#1b212e] transition-colors"
                >
                  {t.clearFilters}
                </button>
              )}

              {isAdmin && manhwas.length === 0 && (
                <button
                  onClick={handleSeedInitialLibrary}
                  className="mt-4 px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2"
                >
                  <Database className="w-4 h-4 text-slate-300" />
                  <span>{t.seedSampleData}</span>
                </button>
              )}
            </div>
          ) : viewLayout === 'grid' ? (
            /* Responsive Grid: 2 cols on mobile, 3 on tablet, 4-5 on desktop */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {filteredManhwas.map((manhwa) => (
                <ManhwaCard
                  key={manhwa.id}
                  manhwa={manhwa}
                  onSelect={handleSelectManhwa}
                  onEdit={
                    isAdmin
                      ? (m) => {
                          setEditingManhwa(m);
                          setIsAdminModalOpen(true);
                        }
                      : undefined
                  }
                  onDelete={
                    isAdmin
                      ? (m) => {
                          setConfirmDelete({
                            isOpen: true,
                            type: 'manhwa',
                            id: m.id,
                            title: m.title,
                          });
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            /* Compact / List View */
            <div className="bg-[#080b10] border border-[#141822] rounded-xl divide-y divide-[#10141e] overflow-hidden">
              {filteredManhwas.map((manhwa) => (
                <div
                  key={manhwa.id}
                  onClick={() => handleSelectManhwa(manhwa)}
                  className="p-3.5 hover:bg-[#0c1017] transition-colors flex items-center gap-4 cursor-pointer"
                >
                  <div className="w-12 h-16 rounded overflow-hidden bg-black flex-shrink-0 border border-[#171b26]">
                    <MediaImage
                      src={manhwa.coverUrl}
                      alt={manhwa.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs sm:text-sm text-slate-100 hover:text-white truncate">
                        {manhwa.title}
                      </h3>
                      <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-[#10141d] text-slate-400 border border-[#1a202d]">
                        {manhwa.status}
                      </span>
                    </div>
                    {manhwa.altTitles && (
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {manhwa.altTitles}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {manhwa.genres?.slice(0, 3).map((g) => (
                        <span
                          key={g}
                          className="text-[9px] text-slate-400 bg-[#0d1017] border border-[#171b26] px-1.5 py-0.2 rounded"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">
                      {manhwa.releaseYear || ''}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      Үзэх →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Global Minimalist Dark Footer */}
      {currentView !== 'reader' && (
        <footer className="mt-auto border-t border-[#121620] bg-[#050608] py-6 text-xs text-slate-500 font-cyrillic">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-slate-300">
                {t.siteName}
              </span>
              <span>—</span>
              <span>Darkest Dark Minimalist Manhwa Library</span>
            </div>

            <div className="flex items-center gap-4">
              <span>{catalogManhwas.length} titles in archive</span>
              <span>•</span>
              <button
                onClick={() => setIsAdminLoginOpen(true)}
                className="hover:text-slate-300 underline font-medium"
              >
                {isAdmin ? 'Админ Самбар (montaqve@gmail.com)' : 'Админ Нэвтрэх'}
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* READER AUTH MODAL */}
      <ReaderAuthModal
        isOpen={isReaderAuthOpen}
        onClose={() => setIsReaderAuthOpen(false)}
        onSuccess={(reader) => {
          setCurrentReader(reader);
          showToast(`Тавтай морил, ${reader.fullName}!`);
        }}
        currentReader={currentReader}
      />

      {/* ADMIN MODALS */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setEditingManhwa(null);
        }}
        initialData={editingManhwa}
        onSave={handleSaveManhwa}
      />

      {targetManhwaForChapter && (
        <ChapterModal
          isOpen={isChapterModalOpen}
          manhwa={targetManhwaForChapter}
          initialData={editingChapter}
          onClose={() => {
            setIsChapterModalOpen(false);
            setEditingChapter(null);
          }}
          onSave={handleSaveChapter}
        />
      )}

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onOpenAddManhwa={() => {
          setEditingManhwa(null);
          setIsAdminModalOpen(true);
        }}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={t.deleteConfirmTitle}
        description={`"${confirmDelete.title}" нэртэй бичлэгийг устгах гэж байна. ${t.deleteConfirmDesc}`}
        onConfirm={handleDeleteConfirmed}
        onCancel={() =>
          setConfirmDelete({ isOpen: false, type: 'manhwa', id: '', title: '' })
        }
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <LibraryMain />
      </LanguageProvider>
    </AuthProvider>
  );
}
