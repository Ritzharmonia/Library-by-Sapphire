import React, { useState, useEffect, useMemo } from 'react';
import { Comment, Reader } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { commentService } from '../lib/commentService';
import { uploadImage } from '../lib/storage';
import { MediaImage } from './MediaImage';
import {
  MessageSquare,
  Send,
  Trash2,
  User,
  Clock,
  Loader2,
  LogIn,
  Heart,
  CornerDownRight,
  X,
  ImagePlus,
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
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Reply state
  const [replyTarget, setReplyTarget] = useState<{
    rootCommentId: string;
    replyToName: string;
  } | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [isUploadingReplyImage, setIsUploadingReplyImage] = useState<boolean>(false);
  const [isPostingReply, setIsPostingReply] = useState<boolean>(false);
  const [togglingHeartId, setTogglingHeartId] = useState<string | null>(null);
  const [readerAvatars, setReaderAvatars] = useState<Record<string, string>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const targetId = targetType === 'chapter' && chapterId ? chapterId : manhwaId;

  // Real-time comments listener (shows all users' comments and replies persistently)
  useEffect(() => {
    setLoading(true);
    setErrorMsg('');
    setReplyTarget(null);
    setReplyText('');
    setReplyImages([]);
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

  const commenterIdsKey = useMemo(() => {
    const ids = Array.from(
      new Set(
        comments
          .map((c) => c.userId)
          .filter((id): id is string => Boolean(id))
      )
    ).sort();
    return ids.join(',');
  }, [comments]);

  // Real-time reader profile picture listener so every commenter displays their own live HD avatar
  useEffect(() => {
    if (!commenterIdsKey) return;
    const ids = commenterIdsKey.split(',');
    const unsubscribe = commentService.subscribeReaderAvatars(ids, (avatars) => {
      setReaderAvatars((prev) => ({ ...prev, ...avatars }));
    });
    return () => unsubscribe();
  }, [commenterIdsKey]);

  // Group comments into top-level threads + chronological replies
  const { topLevelComments, repliesByParent } = useMemo(() => {
    const idSet = new Set(comments.map((c) => c.id));
    const topLevel: Comment[] = [];
    const grouped: Record<string, Comment[]> = {};

    for (const c of comments) {
      if (c.parentId && idSet.has(c.parentId)) {
        if (!grouped[c.parentId]) grouped[c.parentId] = [];
        grouped[c.parentId].push(c);
      } else {
        topLevel.push(c);
      }
    }

    // Top-level newest first; replies oldest first for natural conversation flow
    topLevel.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    Object.keys(grouped).forEach((pid) => {
      grouped[pid].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });

    return { topLevelComments: topLevel, repliesByParent: grouped };
  }, [comments]);

  const handlePickGalleryImages = async (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: 'comment' | 'reply'
  ) => {
    const inputEl = e.currentTarget;
    const files = Array.from(inputEl.files || []);
    inputEl.value = '';
    if (files.length === 0) return;

    const currentList = mode === 'comment' ? commentImages : replyImages;
    const remainingSlots = Math.max(0, 4 - currentList.length);
    if (remainingSlots === 0) {
      setErrorMsg('Нэг сэтгэгдэлд хамгийн ихдээ 4 зураг оруулах боломжтой.');
      return;
    }

    const validFiles = files
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (validFiles.length === 0) {
      setErrorMsg('Зөвхөн зургийн файл сонгоно уу.');
      return;
    }

    const setUploading = mode === 'comment' ? setIsUploadingImage : setIsUploadingReplyImage;
    const setImages = mode === 'comment' ? setCommentImages : setReplyImages;

    try {
      setUploading(true);
      setErrorMsg('');
      const uploadedUrls: string[] = [];
      for (const file of validFiles) {
        const url = await uploadImage(file, 'commentImages');
        uploadedUrls.push(url);
      }
      setImages((prev) => [...prev, ...uploadedUrls].slice(0, 4));
    } catch (err: any) {
      setErrorMsg('Зураг оруулахад алдаа гарлаа: ' + (err?.message || 'Error'));
    } finally {
      setUploading(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReader) {
      onOpenReaderAuth();
      return;
    }

    const trimmed = text.trim();
    if (!trimmed && commentImages.length === 0) return;

    try {
      setIsPosting(true);
      setErrorMsg('');
      await commentService.postComment(
        manhwaId,
        targetType,
        trimmed,
        currentReader,
        chapterId,
        commentImages.length > 0 ? { imageUrls: commentImages } : undefined
      );
      setText('');
      setCommentImages([]);
    } catch (err: any) {
      setErrorMsg('Сэтгэгдэл илгээхэд алдаа гарлаа: ' + (err?.message || 'Error'));
    } finally {
      setIsPosting(false);
    }
  };

  const handleOpenReply = (rootCommentId: string, replyToName: string) => {
    if (!currentReader) {
      onOpenReaderAuth();
      return;
    }
    setReplyTarget({ rootCommentId, replyToName });
    setReplyText('');
    setReplyImages([]);
  };

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReader) {
      onOpenReaderAuth();
      return;
    }
    if (!replyTarget) return;

    const trimmed = replyText.trim();
    if (!trimmed && replyImages.length === 0) return;

    try {
      setIsPostingReply(true);
      setErrorMsg('');
      await commentService.postComment(
        manhwaId,
        targetType,
        trimmed,
        currentReader,
        chapterId,
        {
          parentId: replyTarget.rootCommentId,
          replyToName: replyTarget.replyToName,
          ...(replyImages.length > 0 ? { imageUrls: replyImages } : {}),
        }
      );
      setReplyText('');
      setReplyImages([]);
      setReplyTarget(null);
    } catch (err: any) {
      setErrorMsg('Хариу илгээхэд алдаа гарлаа: ' + (err?.message || 'Error'));
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleToggleHeart = async (comment: Comment) => {
    if (!currentReader) {
      onOpenReaderAuth();
      return;
    }
    if (togglingHeartId === comment.id) return;

    const likedList = comment.likedBy || [];
    const currentlyLiked = likedList.includes(currentReader.id);

    try {
      setTogglingHeartId(comment.id);
      await commentService.toggleHeart(comment.id, currentReader, currentlyLiked);
    } catch (err: any) {
      setErrorMsg('Зүрх дарахад алдаа гарлаа: ' + (err?.message || 'Error'));
    } finally {
      setTogglingHeartId(null);
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

  const renderCommentItem = (
    comment: Comment,
    rootId: string,
    isReply: boolean
  ) => {
    const likedList = comment.likedBy || [];
    const heartCount = likedList.length;
    const isLiked = Boolean(currentReader && likedList.includes(currentReader.id));
    const displayAvatar =
      (comment.userId && currentReader && comment.userId === currentReader.id
        ? currentReader.avatarUrl
        : undefined) ||
      (comment.userId ? readerAvatars[comment.userId] : undefined) ||
      comment.userAvatar;
    const fallbackAvatar = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
      comment.userName || 'Reader'
    )}`;

    return (
      <div className="flex items-start gap-2.5 sm:gap-3">
        {/* Commenter Avatar */}
        <div
          className={`${
            isReply ? 'w-7 h-7' : 'w-8 h-8'
          } rounded-full overflow-hidden bg-black/40 border border-[#1b212e] flex-shrink-0 mt-0.5`}
        >
          {displayAvatar ? (
            <MediaImage
              src={displayAvatar}
              fallbackSrc={fallbackAvatar}
              alt={comment.userName}
              className="w-full h-full object-cover"
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-slate-200">
                {comment.userName}
              </span>
              {isReply && comment.replyToName && (
                <span className="text-[10px] text-slate-400 bg-[#0d1119] border border-[#19202e] px-1.5 py-0.2 rounded">
                  @{comment.replyToName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-shrink-0">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(comment.createdAt)}
              </span>

              {/* Admin moderation delete */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDeleteComment(comment.id)}
                  title="Сэтгэгдэл устгах (Админ)"
                  className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {comment.text && (
            <p className="text-xs text-slate-300 font-light mt-1.5 leading-relaxed whitespace-pre-line break-words">
              {comment.text}
            </p>
          )}

          {/* Attached Gallery Images */}
          {comment.imageUrls && comment.imageUrls.length > 0 && (
            <div
              className={`mt-2 grid gap-2 ${
                comment.imageUrls.length === 1
                  ? 'grid-cols-1 max-w-xs sm:max-w-sm'
                  : 'grid-cols-2 max-w-md'
              }`}
            >
              {comment.imageUrls.map((imgUrl, idx) => (
                <button
                  key={`${comment.id}-img-${idx}`}
                  type="button"
                  onClick={() => setLightboxImage(imgUrl)}
                  className="group relative overflow-hidden rounded-lg border border-[#1d2434] bg-[#05070b] text-left focus:outline-none hover:border-slate-500 transition-colors"
                >
                  <MediaImage
                    src={imgUrl}
                    alt={`${comment.userName} зураг ${idx + 1}`}
                    className={
                      comment.imageUrls!.length === 1
                        ? 'max-h-72 w-auto max-w-full object-contain mx-auto'
                        : 'w-full h-36 sm:h-40 object-cover group-hover:scale-[1.02] transition-transform'
                    }
                  />
                </button>
              ))}
            </div>
          )}

          {/* Actions Row: ONLY Heart + Reply */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              disabled={togglingHeartId === comment.id}
              onClick={() => handleToggleHeart(comment)}
              title="Зүрх дарах"
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                isLiked
                  ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                  : 'bg-[#0b0e15] border-[#161b26] text-slate-400 hover:text-rose-300 hover:border-[#242c3d]'
              } disabled:opacity-60`}
            >
              <Heart
                className={`w-3 h-3 transition-transform ${
                  isLiked ? 'fill-rose-400 text-rose-400 scale-110' : ''
                }`}
              />
              {heartCount > 0 && <span className="font-mono text-[10px]">{heartCount}</span>}
            </button>

            <button
              type="button"
              onClick={() => handleOpenReply(rootId, comment.userName)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-slate-400 hover:text-slate-200 hover:bg-[#11151f] transition-colors"
            >
              <CornerDownRight className="w-3 h-3" />
              <span>Хариулах</span>
            </button>
          </div>
        </div>
      </div>
    );
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
                <MediaImage
                  src={currentReader.avatarUrl}
                  fallbackSrc={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
                    currentReader.fullName
                  )}`}
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
                <MediaImage
                  src={currentReader.avatarUrl}
                  fallbackSrc={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
                    currentReader.fullName
                  )}`}
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

              {/* Attached Images Preview (Main Composer) */}
              {commentImages.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {commentImages.map((imgUrl, idx) => (
                    <div
                      key={`draft-img-${idx}`}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#22293a] bg-[#05070b]"
                    >
                      <MediaImage
                        src={imgUrl}
                        alt={`Хавсаргасан зураг ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCommentImages((prev) => prev.filter((_, i) => i !== idx))
                        }
                        title="Зураг хасах"
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/80 hover:bg-red-900/90 text-slate-200 flex items-center justify-center border border-slate-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <label
                    title="Утасны зургийн цомгоос зураг оруулах (камер биш)"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0e121a] hover:bg-[#151b28] text-[11px] font-medium text-slate-300 border border-[#1c2333] transition-colors cursor-pointer ${
                      isUploadingImage || commentImages.length >= 4
                        ? 'opacity-50 pointer-events-none'
                        : ''
                    }`}
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    ) : (
                      <ImagePlus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {isUploadingImage
                        ? 'Бэлдэж байна...'
                        : `Зураг (${commentImages.length}/4)`}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                      multiple
                      disabled={isUploadingImage || commentImages.length >= 4}
                      onChange={(e) => handlePickGalleryImages(e, 'comment')}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500 font-light hidden sm:inline">
                    {currentReader.fullName} ({text.length}/2000)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={
                    isPosting ||
                    isUploadingImage ||
                    (!text.trim() && commentImages.length === 0)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-40 ml-auto"
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
        ) : topLevelComments.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2 stroke-1" />
            <p className="text-xs font-medium text-slate-400">{t.noComments}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{t.firstToComment}</p>
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-[#121620]">
            {topLevelComments.map((comment) => {
              const replies = repliesByParent[comment.id] || [];
              const isReplyingHere = replyTarget?.rootCommentId === comment.id;

              return (
                <div key={comment.id} className="pt-4 first:pt-0 space-y-3">
                  {renderCommentItem(comment, comment.id, false)}

                  {/* Nested Replies */}
                  {replies.length > 0 && (
                    <div className="ml-5 sm:ml-9 pl-3 sm:pl-4 border-l border-[#1a202e] space-y-3 pt-1">
                      {replies.map((reply) => (
                        <div key={reply.id}>
                          {renderCommentItem(reply, comment.id, true)}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Reply Composer */}
                  {isReplyingHere && currentReader && (
                    <form
                      onSubmit={handlePostReply}
                      className="ml-5 sm:ml-9 pl-3 sm:pl-4 border-l border-[#252e42] pt-1"
                    >
                      <div className="bg-[#0b0e15] border border-[#192030] rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            <strong className="text-slate-200 font-medium">
                              @{replyTarget.replyToName}
                            </strong>{' '}
                            хэрэглэгчид хариу бичиж байна
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReplyTarget(null);
                              setReplyText('');
                            }}
                            className="p-0.5 rounded text-slate-500 hover:text-slate-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <textarea
                          rows={2}
                          autoFocus
                          maxLength={2000}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Хариу сэтгэгдлээ бичнэ үү..."
                          className="w-full bg-[#07090e] border border-[#171c28] rounded-md px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#2f384c] resize-y"
                        />

                        {/* Attached Images Preview (Reply Composer) */}
                        {replyImages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {replyImages.map((imgUrl, idx) => (
                              <div
                                key={`reply-draft-img-${idx}`}
                                className="relative w-16 h-16 rounded-md overflow-hidden border border-[#22293a] bg-[#05070b]"
                              >
                                <MediaImage
                                  src={imgUrl}
                                  alt={`Хариу зураг ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReplyImages((prev) =>
                                      prev.filter((_, i) => i !== idx)
                                    )
                                  }
                                  title="Зураг хасах"
                                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/80 hover:bg-red-900/90 text-slate-200 flex items-center justify-center border border-slate-700"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <label
                            title="Утасны зургийн цомгоос зураг оруулах (камер биш)"
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded bg-[#07090e] hover:bg-[#131824] text-[11px] text-slate-300 border border-[#1b2232] transition-colors cursor-pointer ${
                              isUploadingReplyImage || replyImages.length >= 4
                                ? 'opacity-50 pointer-events-none'
                                : ''
                            }`}
                          >
                            {isUploadingReplyImage ? (
                              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                            ) : (
                              <ImagePlus className="w-3 h-3 text-slate-400" />
                            )}
                            <span>
                              {isUploadingReplyImage
                                ? 'Бэлдэж байна...'
                                : `Зураг (${replyImages.length}/4)`}
                            </span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                              multiple
                              disabled={isUploadingReplyImage || replyImages.length >= 4}
                              onChange={(e) => handlePickGalleryImages(e, 'reply')}
                              className="hidden"
                            />
                          </label>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyTarget(null);
                                setReplyText('');
                                setReplyImages([]);
                              }}
                              className="px-2.5 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200"
                            >
                              {t.cancel}
                            </button>
                            <button
                              type="submit"
                              disabled={
                                isPostingReply ||
                                isUploadingReplyImage ||
                                (!replyText.trim() && replyImages.length === 0)
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-semibold border border-slate-700 disabled:opacity-40"
                            >
                              {isPostingReply ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              <span>Хариу илгээх</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Image Lightbox */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-[#11151f] hover:bg-[#1c2333] text-slate-200 border border-[#242c3f] transition-colors"
            title="Хаах"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[90vh] flex items-center justify-center"
          >
            <MediaImage
              src={lightboxImage}
              alt="Сэтгэгдлийн зураг"
              className="max-w-full max-h-[88vh] object-contain rounded-lg border border-[#1f2636] shadow-2xl"
            />
          </div>
        </div>
      )}
    </section>
  );
};
