import React, { useState, useEffect } from 'react';
import { Comment, Reader } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { commentService } from '../lib/commentService';
import {
  MessageSquare,
  Send,
  Trash2,
  User,
  Clock,
  Loader2,
  LogIn,
} from 'lucide-react';

interface CommentSectionProps {
  manhwaId: string;
  chapterId?: string;
  targetType: 'manhwa' | 'chapter';
  currentReader: Reader | null;
  onOpenReaderAuth: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  manhwaId,
  chapterId,
  targetType,
  currentReader,
  onOpenReaderAuth,
}) => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [text, setText] = useState<string>('');
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const targetId = targetType === 'chapter' && chapterId ? chapterId : manhwaId;

  // Real-time comments listener (shows all users' comments persistently)
  useEffect(() => {
    setLoading(true);
    setErrorMsg('');
    const unsubscribe = commentService.subscribeComments(
      targetType,
      targetId,
      (list) => {
        setComments(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setErrorMsg('Сэтгэгдэл уншихад алдаа гарлаа: ' + err.message);
      }
    );
    return () => unsubscribe();
  }, [targetType, targetId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReader) {
      onOpenReaderAuth();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      setIsPosting(true);
      setErrorMsg('');
      await commentService.postComment(
        manhwaId,
        targetType,
        trimmed,
        currentReader,
        chapterId
      );
      setText('');
    } catch (err: any) {
      setErrorMsg('Сэтгэгдэл илгээхэд алдаа гарлаа: ' + (err?.message || 'Error'));
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
    } catch (err: any) {
      console.error('Delete comment error:', err);
    }
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('mn-MN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <section className="w-full bg-[#080a0f] border border-[#141824] rounded-xl p-5 sm:p-7 shadow-lg text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#131722] mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0e121a] border border-[#1a1f2c] flex items-center justify-center text-slate-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>{t.comments}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#0e131d] text-slate-400 border border-[#19202e] font-normal">
                {comments.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-light">
              {targetType === 'chapter' ? 'Энэ бүлгийн сэтгэгдлүүд' : 'Манхвагийн нийт сэтгэгдлүүд'}
            </p>
          </div>
        </div>

        {/* Reader Profile summary or Login Trigger */}
        {currentReader ? (
          <button
            onClick={onOpenReaderAuth}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0e121a] hover:bg-[#141824] border border-[#191e2b] transition-colors text-left"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-black/50 border border-[#232a3b] flex-shrink-0">
              {currentReader.avatarUrl ? (
                <img
                  src={currentReader.avatarUrl}
                  alt={currentReader.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-slate-400 m-1" />
              )}
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-semibold text-slate-300 block line-clamp-1">
                {currentReader.fullName}
              </span>
            </div>
          </button>
        ) : (
          <button
            onClick={onOpenReaderAuth}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#11151f] hover:bg-[#181d2a] text-xs font-medium text-slate-300 border border-[#1b212e] transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.readerLogin}</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Comment Input Box */}
      {currentReader ? (
        <form onSubmit={handlePostComment} className="mb-6 space-y-2">
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-black/40 border border-[#202738] flex-shrink-0 mt-0.5">
              {currentReader.avatarUrl ? (
                <img
                  src={currentReader.avatarUrl}
                  alt={currentReader.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-slate-500 m-2" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <textarea
                rows={3}
                maxLength={2000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.commentPlaceholder}
                className="w-full bg-[#0a0d14] border border-[#171c28] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#2f384c] resize-y transition-colors"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-light">
                  {currentReader.fullName} нэрээр сэтгэгдэл үлдээх ({text.length}/2000)
                </span>
                <button
                  type="submit"
                  disabled={isPosting || !text.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-40"
                >
                  {isPosting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isPosting ? t.postingComment : t.postComment}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 rounded-lg bg-[#0a0d14] border border-[#151924] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-300">
              {t.loginToComment}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t.guestPrompt}
            </p>
          </div>
          <button
            onClick={onOpenReaderAuth}
            className="px-4 py-2 rounded-md bg-[#131722] hover:bg-[#1a202e] text-slate-200 text-xs font-semibold border border-[#202738] transition-colors self-start sm:self-auto"
          >
            {t.registerOrLogin}
          </button>
        </div>
      )}

      {/* Comments List */}
      <div>
        {loading ? (
          <div className="py-8 text-center text-slate-600 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-500" />
            <p>Сэтгэгдлүүдийг ачаалж байна...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2 stroke-1" />
            <p className="text-xs font-medium text-slate-400">{t.noComments}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{t.firstToComment}</p>
          </div>
        ) : (
          <div className="space-y-3.5 divide-y divide-[#121620]">
            {comments.map((comment) => (
              <div key={comment.id} className="pt-3.5 first:pt-0 flex items-start gap-3">
                {/* Commenter Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-black/40 border border-[#1b212e] flex-shrink-0 mt-0.5">
                  {comment.userAvatar ? (
                    <img
                      src={comment.userAvatar}
                      alt={comment.userName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
                          comment.userName
                        )}`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold bg-[#141824]">
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Comment Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-200">
                        {comment.userName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(comment.createdAt)}
                      </span>

                      {/* Admin moderation delete */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          title="Сэтгэгдэл устгах (Админ)"
                          className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-light mt-1.5 leading-relaxed whitespace-pre-line">
                    {comment.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
