import React, { useState, useEffect, useRef } from 'react';
import { Chapter, Manhwa } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { uploadImagesBatch, UploadSortMode } from '../lib/storage';
import { MediaImage } from './MediaImage';
import {
  X,
  Upload,
  Loader2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  FolderPlus,
  GripVertical,
} from 'lucide-react';

interface ChapterModalProps {
  isOpen: boolean;
  manhwa: Manhwa;
  initialData?: Chapter | null;
  onClose: () => void;
  onSave: (chapterData: Omit<Chapter, 'id'>, id?: string) => Promise<void>;
}

export const ChapterModal: React.FC<ChapterModalProps> = ({
  isOpen,
  manhwa,
  initialData,
  onClose,
  onSave,
}) => {
  const { t } = useLanguage();
  const [chapterNumber, setChapterNumber] = useState<number | string>(1);
  const [title, setTitle] = useState('');
  const [uploadDate, setUploadDate] = useState('');
  const [pagesText, setPagesText] = useState('');
  const [pagesList, setPagesList] = useState<string[]>([]);
  const [uploadSortMode, setUploadSortMode] = useState<UploadSortMode>('auto');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPageIdx, setDraggedPageIdx] = useState<number | null>(null);
  const [dragOverPageIdx, setDragOverPageIdx] = useState<number | null>(null);
  const [editingPositionIdx, setEditingPositionIdx] = useState<number | null>(null);
  const [editingPositionVal, setEditingPositionVal] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setChapterNumber(initialData.chapterNumber);
      setTitle(initialData.title || '');
      setUploadDate(initialData.uploadDate || '');
      setPagesList(initialData.pages || []);
      setPagesText((initialData.pages || []).join('\n'));
    } else {
      setChapterNumber(1);
      setTitle('');
      setUploadDate(new Date().toISOString().split('T')[0]);
      setPagesList([]);
      setPagesText('');
    }
    setEditingPositionIdx(null);
    setErrorMessage('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Sync pagesText to pagesList
  const handleTextChange = (text: string) => {
    setPagesText(text);
    const urls = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    setPagesList(urls);
  };

  // Parallel optimized upload for multiple image files
  const processFilesUpload = async (fileArr: File[]) => {
    const imageFiles = fileArr.filter(
      (f) =>
        f.type.startsWith('image/') ||
        /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(f.name)
    );
    if (imageFiles.length === 0) {
      setErrorMessage('Зөвхөн зураг файл (JPG, PNG, WEBP) сонгоно уу.');
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage('');
      setUploadPercent(0);
      setUploadProgress(`0/${imageFiles.length} зураг бэлдэж байна...`);

      const { urls, failedFiles, lastError } = await uploadImagesBatch(
        imageFiles,
        `chapters/${manhwa.id}`,
        (done, total) => {
          setUploadPercent(Math.round((done / total) * 100));
          setUploadProgress(`${done}/${total} хуудас хадгалагдлаа...`);
        },
        4,
        uploadSortMode
      );

      if (urls.length > 0) {
        setPagesList((prev) => {
          const updated = [...prev, ...urls];
          setPagesText(updated.join('\n'));
          return updated;
        });
      }

      if (failedFiles.length > 0) {
        setErrorMessage(
          `${failedFiles.length} зураг орсонгүй (${failedFiles.slice(0, 3).join(', ')}${
            failedFiles.length > 3 ? '...' : ''
          })${lastError ? ': ' + lastError : ''}`
        );
      }
    } catch (err: any) {
      setErrorMessage('Зураг хуулахад алдаа гарлаа: ' + (err.message || 'Error'));
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      setUploadPercent(0);
    }
  };

  const handleBatchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const files = inputEl.files;
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    try {
      await processFilesUpload(fileArr);
    } finally {
      inputEl.value = '';
    }
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    const fileArr = Array.from(e.dataTransfer.files || []);
    if (fileArr.length > 0) {
      await processFilesUpload(fileArr);
    }
  };

  const handlePasteImages = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isUploading) return;
    const clipboardFiles = Array.from(e.clipboardData?.files || []).filter((f) =>
      f.type.startsWith('image/')
    );
    if (clipboardFiles.length > 0) {
      e.preventDefault();
      await processFilesUpload(clipboardFiles);
    }
  };

  const removePage = (index: number) => {
    setPagesList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setPagesText(updated.join('\n'));
      return updated;
    });
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    setPagesList((prev) => {
      if (fromIndex === toIndex || toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setPagesText(updated.join('\n'));
      return updated;
    });
  };

  const reverseAllPages = () => {
    setPagesList((prev) => {
      const updated = [...prev].reverse();
      setPagesText(updated.join('\n'));
      return updated;
    });
  };

  const clearAllPages = () => {
    setPagesList([]);
    setPagesText('');
  };

  const commitPositionJump = (fromIndex: number) => {
    const parsed = parseInt(editingPositionVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= pagesList.length) {
      movePage(fromIndex, parsed - 1);
    }
    setEditingPositionIdx(null);
    setEditingPositionVal('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(chapterNumber);
    if (isNaN(num) || num <= 0) {
      setErrorMessage('Бүлгийн дугаар зөв оруулна уу.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      await onSave(
        {
          manhwaId: manhwa.id,
          chapterNumber: num,
          title: title.trim(),
          uploadDate: uploadDate.trim() || new Date().toISOString().split('T')[0],
          pages: pagesList,
          orderIndex: num,
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
    <div
      onPaste={handlePasteImages}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-cyrillic"
    >
      <div className="relative w-full max-w-3xl bg-[#090c12] border border-[#171b26] rounded-xl shadow-2xl p-5 sm:p-6 text-slate-200 my-4 sm:my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#141822]">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {initialData ? t.editChapter : t.addChapter}
            </h2>
            <p className="text-xs text-slate-400 font-medium">{manhwa.title}</p>
          </div>
          <button
            type="button"
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
          {/* Chapter Number, Title & Upload Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.chapterNumberLabel} *
              </label>
              <input
                type="number"
                step="any"
                required
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                placeholder="1"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.chapterTitleLabel}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Жишээ: Эхлэл"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                {t.uploadDateLabel}
              </label>
              <input
                type="text"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                placeholder="2026.11.08"
                className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 focus:outline-none focus:border-[#2f384c]"
              />
            </div>
          </div>

          {/* Upload Multiple Pages Dropzone + Order Selector + File/Folder Pickers */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDropFiles}
            onClick={() => {
              if (!isUploading) fileInputRef.current?.click();
            }}
            className={`bg-[#0b0e14] border border-dashed rounded-lg p-4 transition-colors cursor-pointer ${
              isDragging
                ? 'border-slate-400 bg-[#101520]'
                : 'border-[#252c3d] hover:border-slate-500'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleBatchFileUpload}
              disabled={isUploading}
              className="sr-only"
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              accept="image/*"
              {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
              onChange={handleBatchFileUpload}
              disabled={isUploading}
              className="sr-only"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-slate-200 block">
                  {pagesList.length > 0
                    ? `Нэмж зураг оруулах (Одоо ${pagesList.length} хуудастай)`
                    : t.uploadMultiplePages}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Энд дарж олон зураг зэрэг сонгох, чирж тавих, эсвэл Ctrl+V дарж оруулна уу
                </span>
              </div>

              <div
                className="flex flex-wrap items-center gap-2 self-start sm:self-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-slate-300" />
                  <span>{isUploading ? uploadProgress || t.uploading : 'Олон зураг сонгох'}</span>
                </button>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => folderInputRef.current?.click()}
                  title="Бүтэн хавтаснаас бүх зургийг авах"
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md bg-[#11151f] hover:bg-[#181e2c] text-slate-300 font-medium text-xs border border-[#22293a] transition-colors disabled:opacity-50"
                >
                  <FolderPlus className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Хавтас</span>
                </button>
              </div>
            </div>

            {/* Import Sort Mode Selector */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 pt-2.5 border-t border-[#151a26] flex flex-wrap items-center justify-between gap-2 text-[11px]"
            >
              <span className="text-slate-400">Оруулах үеийн дараалал:</span>
              <select
                value={uploadSortMode}
                disabled={isUploading}
                onChange={(e) => setUploadSortMode(e.target.value as UploadSortMode)}
                className="bg-[#080a0f] border border-[#1d2332] text-slate-200 rounded px-2.5 py-1 text-[11px] focus:outline-none focus:border-slate-500 cursor-pointer"
              >
                <option value="auto">Ухаалаг (дугаартай бол нэрээр, үгүй бол сонгосон дарааллаар)</option>
                <option value="selected">Сонгосон дарааллаар хэвээр нь</option>
                <option value="name">Файлын нэрээр (1, 2, 10...)</option>
                <option value="timeAsc">Татаж авсан цагаар (хуучнаас шинэ)</option>
                <option value="timeDesc">Татаж авсан цагаар (шинээс хуучин)</option>
              </select>
            </div>

            {isUploading && (
              <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{uploadProgress || t.uploading}</span>
                  </span>
                  <span className="font-mono">{uploadPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-[#06080d] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 transition-all duration-200"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Paste URLs / Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium">
                {t.chapterPagesLabel} ({pagesList.length} {t.pageCountBadge})
              </label>
              <span className="text-[11px] text-slate-500 font-light">
                {t.pasteUrlsHelp}
              </span>
            </div>
            <textarea
              rows={3}
              value={pagesText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="https://example.com/page1.jpg&#10;https://example.com/page2.jpg"
              className="w-full bg-[#0b0e14] border border-[#161a25] rounded-md px-3 py-2 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-[#2f384c]"
            />
          </div>

          {/* Visual Thumbnails & Easy Drag/Tap Reorder Grid */}
          {pagesList.length > 0 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-slate-400 font-medium">
                  Хуудасны дараалал ({pagesList.length}) — чирэх, ← → дарах, эсвэл # дугаар дээр дарж дурын байр руу зөөнө үү:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={reverseAllPages}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#10141e] hover:bg-[#181e2c] text-slate-300 border border-[#1e2536] text-[11px] transition-colors"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    <span>Урвуулах</span>
                  </button>
                  <button
                    type="button"
                    onClick={clearAllPages}
                    className="text-[11px] text-slate-500 hover:text-red-400 transition-colors px-1.5 py-1"
                  >
                    Бүгдийг цэвэрлэх
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-72 overflow-y-auto p-2.5 bg-[#06080d] border border-[#141822] rounded-lg">
                {pagesList.map((url, idx) => (
                  <div
                    key={`${idx}_${url.slice(0, 24)}`}
                    draggable
                    onDragStart={() => setDraggedPageIdx(idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedPageIdx !== null && draggedPageIdx !== idx) {
                        setDragOverPageIdx(idx);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverPageIdx === idx) setDragOverPageIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedPageIdx !== null && draggedPageIdx !== idx) {
                        movePage(draggedPageIdx, idx);
                      }
                      setDraggedPageIdx(null);
                      setDragOverPageIdx(null);
                    }}
                    onDragEnd={() => {
                      setDraggedPageIdx(null);
                      setDragOverPageIdx(null);
                    }}
                    className={`relative flex flex-col bg-[#0a0d14] border rounded-md overflow-hidden transition-all cursor-grab active:cursor-grabbing ${
                      dragOverPageIdx === idx
                        ? 'border-slate-300 ring-1 ring-slate-400 scale-[1.02]'
                        : draggedPageIdx === idx
                        ? 'opacity-40 border-slate-500'
                        : 'border-[#191f2d]'
                    }`}
                  >
                    {/* Top page number & drag handle bar */}
                    <div className="flex items-center justify-between px-1.5 py-1 bg-[#0d111a] border-b border-[#161b28]">
                      {editingPositionIdx === idx ? (
                        <input
                          type="number"
                          min={1}
                          max={pagesList.length}
                          autoFocus
                          value={editingPositionVal}
                          onChange={(e) => setEditingPositionVal(e.target.value)}
                          onBlur={() => commitPositionJump(idx)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitPositionJump(idx);
                            } else if (e.key === 'Escape') {
                              setEditingPositionIdx(null);
                            }
                          }}
                          className="w-12 bg-[#06080d] border border-slate-500 rounded px-1 py-0.5 text-[10px] font-mono text-white focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPositionIdx(idx);
                            setEditingPositionVal(String(idx + 1));
                          }}
                          title="Дарж дурын байрлалын дугаар бичих"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#141926] hover:bg-[#1e2638] text-[10px] font-mono text-slate-200 border border-[#232b3d]"
                        >
                          <GripVertical className="w-2.5 h-2.5 text-slate-400" />
                          <span>#{idx + 1}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removePage(idx)}
                        title="Устгах"
                        className="p-0.5 rounded text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Thumbnail preview */}
                    <div className="aspect-[3/4] w-full bg-black overflow-hidden">
                      <MediaImage
                        src={url}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-cover pointer-events-none"
                        fallbackSrc="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80"
                      />
                    </div>

                    {/* Always-visible mobile-friendly move buttons */}
                    <div className="grid grid-cols-2 divide-x divide-[#161b28] bg-[#0c1018] border-t border-[#161b28]">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => movePage(idx, idx - 1)}
                        title="Урагш зөөх"
                        className="py-1 flex items-center justify-center text-slate-300 hover:bg-[#151c29] hover:text-white disabled:opacity-25 transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === pagesList.length - 1}
                        onClick={() => movePage(idx, idx + 1)}
                        title="Хойш зөөх"
                        className="py-1 flex items-center justify-center text-slate-300 hover:bg-[#151c29] hover:text-white disabled:opacity-25 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
