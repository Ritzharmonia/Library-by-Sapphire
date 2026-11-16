import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Comment, Reader } from '../types';

const COMMENTS_COLLECTION = 'comments';
const READERS_COLLECTION = 'readers';

export const commentService = {
  /**
   * Simple 4-digit PIN reader authentication (Login or Register)
   */
  async loginOrRegisterReader(
    firstName: string,
    lastName: string,
    pin: string,
    avatarUrl?: string
  ): Promise<Reader> {
    const fName = firstName.trim();
    const lName = lastName.trim();
    const cleanPin = pin.trim();

    // Unique deterministic document ID based on normalized name
    const docId = `reader_${encodeURIComponent(
      `${lName.toLowerCase()}_${fName.toLowerCase()}`.replace(/\s+/g, '_')
    )}`.slice(0, 100);

    try {
      const docRef = doc(db, READERS_COLLECTION, docId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.pin !== cleanPin) {
          throw new Error('Оруулсан 4 оронтой нууц код (PIN) буруу байна.');
        }

        // If new avatar provided, update it
        let currentAvatar = data.avatarUrl;
        if (avatarUrl && avatarUrl !== data.avatarUrl) {
          await setDoc(docRef, { ...data, avatarUrl }, { merge: true });
          currentAvatar = avatarUrl;
        }

        const reader: Reader = {
          id: snap.id,
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: data.fullName || `${data.lastName} ${data.firstName}`,
          pin: data.pin,
          avatarUrl: currentAvatar,
          createdAt: data.createdAt,
        };
        localStorage.setItem('sapphire_reader', JSON.stringify(reader));
        return reader;
      } else {
        // Register new reader profile
        const fullName = `${lName} ${fName}`;
        const newReaderData = {
          firstName: fName,
          lastName: lName,
          fullName,
          pin: cleanPin,
          avatarUrl:
            avatarUrl ||
            `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
              fullName
            )}`,
          createdAt: new Date().toISOString(),
        };

        await setDoc(docRef, newReaderData);
        const reader: Reader = {
          id: docId,
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
    try {
      const docRef = doc(db, READERS_COLLECTION, readerId);
      await setDoc(docRef, { avatarUrl }, { merge: true });

      const saved = localStorage.getItem('sapphire_reader');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.avatarUrl = avatarUrl;
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
      return saved ? JSON.parse(saved) : null;
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
   * Subscribe to comments for a specific manhwa or chapter in real-time
   */
  subscribeComments(
    targetType: 'manhwa' | 'chapter',
    targetId: string,
    callback: (comments: Comment[]) => void
  ): Unsubscribe {
    const colRef = collection(db, COMMENTS_COLLECTION);
    const q =
      targetType === 'chapter'
        ? query(colRef, where('chapterId', '==', targetId))
        : query(colRef, where('manhwaId', '==', targetId), where('targetType', '==', 'manhwa'));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: Comment[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            manhwaId: d.manhwaId,
            chapterId: d.chapterId,
            targetType: d.targetType || 'manhwa',
            userId: d.userId,
            userName: d.userName || 'Anonymous',
            userAvatar: d.userAvatar,
            text: d.text || '',
            createdAt: d.createdAt || new Date().toISOString(),
          });
        });
        // Sort newest first
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        callback(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, COMMENTS_COLLECTION);
      }
    );
  },

  /**
   * Post a new comment
   */
  async postComment(
    manhwaId: string,
    targetType: 'manhwa' | 'chapter',
    text: string,
    reader: Reader,
    chapterId?: string
  ): Promise<string> {
    const colRef = collection(db, COMMENTS_COLLECTION);
    const payload = {
      manhwaId,
      targetType,
      text: text.trim(),
      userId: reader.id,
      userName: reader.fullName || `${reader.lastName} ${reader.firstName}`,
      userAvatar: reader.avatarUrl || '',
      createdAt: new Date().toISOString(),
      ...(chapterId ? { chapterId } : {}),
    };

    try {
      const docRes = await addDoc(colRef, payload);
      return docRes.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COMMENTS_COLLECTION);
    }
  },

  /**
   * Delete comment (Admin moderation)
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COMMENTS_COLLECTION, commentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${COMMENTS_COLLECTION}/${commentId}`);
    }
  },
};
