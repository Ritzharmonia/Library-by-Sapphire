import React, { useState, useEffect } from 'react';
import { Manhwa, ManhwaStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { GENRE_PRESETS } from '../lib/translations';
import { uploadImage } from '../lib/storage';
import { MediaImage } from './MediaImage';
import { X, Upload, Loader2 } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (manhwaData: Omit<Manhwa, 'id'>, id?: string) => Promise<void>;
  initialData?: Manhwa | null;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [altTitles, setAltTitles] = useState('');
  const [author, setAuthor] = useState('');
  const [artist, setArtist] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [customGenre, setCustomGenre] = useState('');
  const [status, setStatus] = useState<ManhwaStatus>('ongoing');
  const [synopsis, setSynopsis] = useState('');
  const [synopsisEn, setSynopsisEn] = useState('');
  const [volumes, setVolumes] = useState('');
  const [chapterNote, setChapterNote] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setAltTitles(initialData.altTitles || '');
      setAuthor(initialData.author || '');
      setArtist(initialData.artist || '');
      setGenres(initialData.genres || []);
      setStatus(initialData.status || 'ongoing');
      setSynopsis(initialData.synopsis || '');
      setSynopsisEn(initialData.synopsisEn || '');
      setVolumes(initialData.volumes || '');
      setChapterNote(initialData.chapterNote || '');
      setReleaseYear(initialData.releaseYear || '');
      setCoverUrl(initialData.coverUrl || '');
      setOrderIndex(initialData.orderIndex ?? 0);
    } else {
      setTitle('');
      setAltTitles('');
      setAuthor('');
      setArtist('');
      setGenres(['Action', 'Fantasy']);
      setStatus('ongoing');
      setSynopsis('');
      setSynopsisEn('');
      setVolumes('');
      setChapterNote('');
      setReleaseYear(new Date().getFullYear().toString());
      setCoverUrl('');
      setOrderIndex(0);
    }
    setErrorMessage('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const toggleGenre = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter((g) => g !== genre));
    } else {
      setGenres([...genres, genre]);
    }
  };

  const handleAddCustomGenre = () => {
    const trimmed = customGenre.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres([...genres, trimmed]);
      setCustomGenre('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      setIsUploading(true);
      setErrorMessage('');
      const uploadedUrl = await uploadImage(file, 'manhwa-covers');
      setCoverUrl(uploadedUrl);
    } catch (err: any) {
      setErrorMessage('Зураг хуулахад алдаа гарлаа: ' + (err.message || 'Error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Манхвагийн нэрийг оруулна уу.');
      return;
    }
    if (!coverUrl.trim()) {
      setErrorMessage('Хавтасны зургийг оруулна уу.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      await onSave(
        {
          title: title.trim(),
          altTitles: altTitles.trim(),
          author: author.trim(),
          artist: artist.trim(),
          genres,
          status,
          synopsis: synopsis.trim(),
          synopsisEn: synopsisEn.trim(),
          volumes: volumes.trim(),
          chapterNote: chapterNote.trim(),
          releaseYear: releaseYear.trim(),
          coverUrl: coverUrl.trim(),
          orderIndex: Number(orderIndex) || 0,
        },
        initialData?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMessage('Хадгалахад алдаа гарлаа: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-cyrillic">
      <div className="relative w-full max-w-2xl bg-[#090c12] border border-[#171b26] rounded-xl shadow-2xl p-6 text-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#141822]">
          <h2 className="text-base sm:text-lg font-bold text-slate-100">
            {initialData ? t.editManhwa : t.addNewManhwa}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#141822] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Title & Alt Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.titleLabel} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Жишээ: Solo Leveling"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.altTitlesLabel}
              </label>
              <input
                type="text"
                value={altTitles}
                onChange={(e) => setAltTitles(e.target.value)}
                placeholder="Жишээ: 나 혼자만 레벨업"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
          </div>

          {/* Author, Artist, Release Year */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.author}
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Зохиолч"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.artist}
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Зураач"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.releaseYearLabel}
              </label>
              <input
                type="text"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder="2026"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
          </div>

          {/* Status & Order Index */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.statusLabel} *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ManhwaStatus)}
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              >
                <option value="ongoing">{t.ongoing}</option>
                <option value="completed">{t.completed}</option>
                <option value="hiatus">{t.hiatus}</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.orderIndexLabel}
              </label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                placeholder="1"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
          </div>

          {/* Volumes & Total Chapters Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.volumesLabel}
              </label>
              <input
                type="text"
                value={volumes}
                onChange={(e) => setVolumes(e.target.value)}
                placeholder="Жишээ: 4"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.chapterNoteLabel}
              </label>
              <input
                type="text"
                value={chapterNote}
                onChange={(e) => setChapterNote(e.target.value)}
                placeholder="Жишээ: 63 орчим"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
          </div>

          {/* Cover Image Upload / URL Input */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              {t.coverImage} *
            </label>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              {coverUrl && (
                <div className="w-16 h-22 rounded border border-[#1c2230] overflow-hidden flex-shrink-0 bg-black">
                  <MediaImage
                    src={coverUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 w-full space-y-2">
                <input
                  type="text"
                  required
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder={t.coverImageUrl}
                  className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
                />
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#10141d] hover:bg-[#161b27] text-slate-300 border border-[#19202e] transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? t.uploading : t.uploadCoverFile}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {isUploading && (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Genres Chips */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">
              {t.genres} ({genres.length} сонгосон)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#0b0e14] border border-[#161a25] rounded-md">
              {GENRE_PRESETS.map((genre) => {
                const isSelected = genres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-slate-700 text-white border border-slate-600'
                        : 'bg-[#0f131a] text-slate-400 hover:text-slate-200 border border-[#171b26]'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                placeholder="Өөр төрөл бичиж нэмэх..."
                className="flex-1 bg-[#0b0e14] border border-[#161a25] rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-[#2f384c] text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomGenre}
                className="px-3 py-1 rounded bg-[#121620] text-slate-300 hover:bg-[#191f2c] text-xs font-semibold border border-[#1a202d]"
              >
                + Нэмэх
              </button>
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              {t.synopsisLabel}
            </label>
            <textarea
              rows={4}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Манхвагийн дэлгэрэнгүй товч агуулга..."
              className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c] resize-y"
            />
          </div>

          {/* English Synopsis */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              {t.synopsisEnLabel}
            </label>
            <textarea
              rows={3}
              value={synopsisEn}
              onChange={(e) => setSynopsisEn(e.target.value)}
              placeholder="Optional English synopsis..."
              className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c] resize-y"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#141822]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-md bg-[#0c1017] text-slate-300 hover:bg-[#121620] transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="px-5 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center gap-2 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isSaving ? t.saving : t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
