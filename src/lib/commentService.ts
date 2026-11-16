import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  arrayUnion,
  arrayRemove,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Comment, Reader } from '../types';

const COMMENTS_COLLECTION = 'comments';
const READERS_COLLECTION = 'readers';

function isAsciiValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(id);
}

/**
 * Generates a Firestore-safe ASCII document ID for any Unicode/Cyrillic name.
 */
function makeReaderId(lastName: string, firstName: string): string {
  const normalized = `${lastName.trim().toLowerCase()}_${firstName.trim().toLowerCase()}`.replace(
    /\s+/g,
    '_'
  );
  const asciiSlug = normalized.replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
  }
  const hash = `${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
  return `reader_${asciiSlug ? `${asciiSlug}_` : ''}${hash}`.slice(0, 100);
}

function makeLegacyAsciiReaderId(lastName: string, firstName: string): string | null {
  const candidate = `reader_${`${lastName.trim().toLowerCase()}_${firstName.trim().toLowerCase()}`.replace(
    /\s+/g,
    '_'
  )}`.slice(0, 100);
  return isAsciiValidId(candidate) ? candidate : null;
}

function safeAvatarUrl(avatarUrl: string | undefined, fallbackName: string): string {
  const trimmed = (avatarUrl || '').trim();
  if (trimmed && trimmed.length <= 1950) {
    return trimmed;
  }
  return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
    fallbackName || 'Reader'
  )}`.slice(0, 1950);
}

export const commentService = {
  /**
   * Simple 4-digit PIN reader authentication (Login or Register).
   * Works with Mongolian Cyrillic and Latin names alike.
   */
  async loginOrRegisterReader(
    firstName: string,
    lastName: string,
    pin: string,
    avatarUrl?: string
  ): Promise<Reader> {
    const fName = firstName.trim().slice(0, 60);
    const lName = lastName.trim().slice(0, 60);
    const cleanPin = pin.trim().slice(0, 10);
    const fullName = `${lName} ${fName}`.slice(0, 120);

    const primaryDocId = makeReaderId(lName, fName);
    const legacyDocId = makeLegacyAsciiReaderId(lName, fName);

    try {
      let docRef = doc(db, READERS_COLLECTION, primaryDocId);
      let snap = await getDoc(docRef);

      // Check legacy ASCII ID if primary hashed ID doesn't exist yet
      if (!snap.exists() && legacyDocId && legacyDocId !== primaryDocId) {
        const legacyRef = doc(db, READERS_COLLECTION, legacyDocId);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          docRef = legacyRef;
          snap = legacySnap;
        }
      }

      if (snap.exists()) {
        const data = snap.data();
        if (data.pin !== cleanPin) {
          throw new Error('Оруулсан 4 оронтой нууц код (PIN) буруу байна.');
        }

        const safeExistingAvatar = safeAvatarUrl(data.avatarUrl, fullName);
        const safeIncomingAvatar = avatarUrl ? safeAvatarUrl(avatarUrl, fullName) : safeExistingAvatar;

        if (avatarUrl && safeIncomingAvatar !== data.avatarUrl) {
          await setDoc(
            docRef,
            {
              firstName: data.firstName || fName,
              lastName: data.lastName || lName,
              fullName: data.fullName || fullName,
              pin: data.pin,
              avatarUrl: safeIncomingAvatar,
              createdAt: data.createdAt || new Date().toISOString(),
            },
            { merge: true }
          );
        }

        const reader: Reader = {
          id: snap.id,
          firstName: data.firstName || fName,
          lastName: data.lastName || lName,
          fullName: data.fullName || fullName,
          pin: data.pin,
          avatarUrl: avatarUrl ? safeIncomingAvatar : safeExistingAvatar,
          createdAt: data.createdAt,
        };
        localStorage.setItem('sapphire_reader', JSON.stringify(reader));
        return reader;
      } else {
        const newReaderData = {
          firstName: fName,
          lastName: lName,
          fullName,
          pin: cleanPin,
          avatarUrl: safeAvatarUrl(avatarUrl, fullName),
          createdAt: new Date().toISOString(),
        };

        await setDoc(docRef, newReaderData);
        const reader: Reader = {
          id: primaryDocId,
          ...newReaderData,
        };
        localStorage.setItem('sapphire_reader', JSON.stringify(reader));
        return reader;
      }
    } catch (error: any) {
      if (error?.message?.includes('нууц код')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.WRITE, READERS_COLLECTION);
    }
  },

  /**
   * Update reader avatar
   */
  async updateReaderAvatar(readerId: string, avatarUrl: string): Promise<void> {
    const safeId = isAsciiValidId(readerId) ? readerId : null;
    try {
      const saved = localStorage.getItem('sapphire_reader');
      const parsed: Reader | null = saved ? JSON.parse(saved) : null;
      const targetId =
        safeId || (parsed ? makeReaderId(parsed.lastName, parsed.firstName) : makeReaderId('user', readerId));
      const safeAvatar = safeAvatarUrl(avatarUrl, parsed?.fullName || 'Reader');

      const docRef = doc(db, READERS_COLLECTION, targetId);
      await setDoc(docRef, { avatarUrl: safeAvatar }, { merge: true });

      if (parsed) {
        parsed.id = targetId;
        parsed.avatarUrl = safeAvatar;
        localStorage.setItem('sapphire_reader', JSON.stringify(parsed));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${READERS_COLLECTION}/${readerId}`);
    }
  },

  /**
   * Get cached reader from localStorage
   */
  getCurrentReader(): Reader | null {
    try {
      const saved = localStorage.getItem('sapphire_reader');
      if (!saved) return null;
      const parsed = JSON.parse(saved) as Reader;
      // Migrate legacy non-ASCII IDs (e.g. containing % from encodeURIComponent) cleanly
      if (parsed && parsed.id && !isAsciiValidId(parsed.id)) {
        const migrated: Reader = {
          ...parsed,
          id: makeReaderId(parsed.lastName || '', parsed.firstName || ''),
        };
        localStorage.setItem('sapphire_reader', JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  /**
   * Logout reader
   */
  logoutReader(): void {
    localStorage.removeItem('sapphire_reader');
  },

  /**
   * Subscribe to ALL users' comments for a specific manhwa or chapter in real-time.
   * Uses a single-field Firestore query (no composite index required) so every visitor sees everyone's comments.
   */
  subscribeComments(
    targetType: 'manhwa' | 'chapter',
    targetId: string,
    callback: (comments: Comment[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const colRef = collection(db, COMMENTS_COLLECTION);
    const q =
      targetType === 'chapter'
        ? query(colRef, where('chapterId', '==', targetId))
        : query(colRef, where('manhwaId', '==', targetId));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Comment[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const docTargetType = d.targetType || 'manhwa';
          if (targetType === 'manhwa' && docTargetType !== 'manhwa') {
            return;
          }
          list.push({
            id: docSnap.id,
            manhwaId: d.manhwaId,
            chapterId: d.chapterId,
            targetType: docTargetType,
            userId: d.userId,
            userName: d.userName || 'Anonymous',
            userAvatar: d.userAvatar,
            text: d.text || '',
            parentId: d.parentId || undefined,
            replyToName: d.replyToName || undefined,
            likedBy: Array.isArray(d.likedBy) ? d.likedBy : [],
            createdAt: d.createdAt || new Date().toISOString(),
          });
        });
        // Sort newest first
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        callback(list);
      },
      (error) => {
        console.error('Comments subscription error:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    );
  },

  /**
   * Post a new comment or reply persistently to Firestore
   */
  async postComment(
    manhwaId: string,
    targetType: 'manhwa' | 'chapter',
    text: string,
    reader: Reader,
    chapterId?: string,
    replyOptions?: { parentId?: string; replyToName?: string }
  ): Promise<string> {
    const colRef = collection(db, COMMENTS_COLLECTION);
    const userName = (reader.fullName || `${reader.lastName} ${reader.firstName}`).trim().slice(0, 120);
    const safeUserId = isAsciiValidId(reader.id)
      ? reader.id
      : makeReaderId(reader.lastName || '', reader.firstName || '');

    const payload = {
      manhwaId: manhwaId.slice(0, 128),
      targetType,
      text: text.trim().slice(0, 2000),
      userId: safeUserId.slice(0, 128),
      userName,
      userAvatar: safeAvatarUrl(reader.avatarUrl, userName),
      likedBy: [] as string[],
      createdAt: new Date().toISOString(),
      ...(chapterId ? { chapterId: chapterId.slice(0, 128) } : {}),
      ...(replyOptions?.parentId ? { parentId: replyOptions.parentId.slice(0, 128) } : {}),
      ...(replyOptions?.replyToName
        ? { replyToName: replyOptions.replyToName.trim().slice(0, 120) }
        : {}),
    };

    try {
      // Ensure reader profile exists in Firestore even if cached locally before
      if (reader.firstName && reader.lastName && reader.pin) {
        const readerRef = doc(db, READERS_COLLECTION, safeUserId);
        void setDoc(
          readerRef,
          {
            firstName: reader.firstName.trim().slice(0, 60),
            lastName: reader.lastName.trim().slice(0, 60),
            fullName: userName,
            pin: reader.pin.trim().slice(0, 10),
            avatarUrl: payload.userAvatar,
            createdAt: reader.createdAt || new Date().toISOString(),
          },
          { merge: true }
        ).catch(() => {});
      }

      const docRes = await addDoc(colRef, payload);
      return docRes.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COMMENTS_COLLECTION);
    }
  },

  /**
   * Toggle heart reaction on a comment or reply atomically
   */
  async toggleHeart(
    commentId: string,
    reader: Reader,
    currentlyLiked: boolean
  ): Promise<void> {
    const safeReaderId = isAsciiValidId(reader.id)
      ? reader.id
      : makeReaderId(reader.lastName || '', reader.firstName || '');
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);

    try {
      await updateDoc(docRef, {
        likedBy: currentlyLiked ? arrayRemove(safeReaderId) : arrayUnion(safeReaderId),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${COMMENTS_COLLECTION}/${commentId}`);
    }
  },

  /**
   * Delete comment and any child replies (Admin moderation)
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      const repliesQ = query(
        collection(db, COMMENTS_COLLECTION),
        where('parentId', '==', commentId)
      );
      const replySnaps = await getDocs(repliesQ);
      for (const rDoc of replySnaps.docs) {
        await deleteDoc(doc(db, COMMENTS_COLLECTION, rDoc.id));
      }
      await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COMMENTS_COLLECTION}/${commentId}`);
    }
  },
};
