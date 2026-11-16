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
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Manhwa, Chapter } from '../types';

const MANHWA_COLLECTION = 'manhwa';
const CHAPTERS_COLLECTION = 'chapters';

export const THIS_WITCH_OF_MINE_ID = 'this-witch-of-mine';

export const THIS_WITCH_OF_MINE_DATA: Omit<Manhwa, 'id'> = {
  title: 'This Witch Of Mine',
  altTitles: 'Миний Шулам / 나의 마녀',
  author: 'Haeyoon',
  artist: 'MAS',
  genres: ['Fantasy', 'Romance', 'Drama', 'Supernatural', 'Tragedy'],
  status: 'completed',
  volumes: '4',
  chapterNote: '63 орчим (нэмэлт бүлгүүдийг оруулсан тооллоос хамаарч өөр)',
  synopsis:
    'Хайр ба хараалын хоорондох нарийн заагийг өгүүлэх уран зөгнөлт, романтик манхвагийн сэтгэл шимшрүүлэм ертөнцөд тавтай морил.\n\nХэт үзэсгэлэнтэй эсвэл ер бусын авьяастай хэнийг ч шулам хэмээн цоллодог нийгэмд ганцаардсан, гадуурхагдсан нэгэн хүү болон хүчирхэг, мөнх наст нэгэн шулам санаанд оромгүй байдлаар учран холбогдоно.\n\nЭнэхүү сэтгэл татам бүтээл нь үе үеийн турш үргэлжлэх хайр дурлал, эмгэнэл, цаг хугацааны урсгалыг харуулсан олон түүхийг хооронд нь сүлжин өгүүлдэг.\n\nГайхалтай уран зураглал, сэтгэлд хоногших үйл явдлаараа энэхүү манхва нь сэтгэл хөдөлгөм, ер бусын сэдэвт зохиолд дуртай уншигчдын заавал унших бүтээлүүдийн нэг юм.\n\nХувь тавиланг сорьж, ид шидээс ч илүү хүчтэй зүйл бол хүний зүрх сэтгэл гэдгийг батлах энэхүү аялалд нэгдээрэй.',
  synopsisEn:
    'Discover the heart-wrenching world of This Witch of Mine, a fantasy romance manhwa that explores the thin line between a blessing and a curse. In a society where anyone too beautiful or talented is branded a witch, a lonely outcast boy and a powerful immortal find an unexpected connection. This captivating series weaves together multiple stories of love, tragedy, and the passage of time across generations. With its stunning art and poignant narrative, it’s a must-read for fans of emotional supernatural dramas. Experience a journey that challenges fate and proves that magic is nothing compared to the power of the human heart.',
  releaseYear: '2017',
  coverUrl: '/assets/aistudio/8629f7252da94061e956872f7fb4165d_7b9c989e.jpg',
  orderIndex: 0,
};

export const THIS_WITCH_OF_MINE_CH1_ID = 'this-witch-of-mine-ch-1';

export const THIS_WITCH_OF_MINE_CH1_DATA: Omit<Chapter, 'id'> = {
  manhwaId: THIS_WITCH_OF_MINE_ID,
  chapterNumber: 1,
  title: 'Шулам ба хүү',
  uploadDate: '2026.11.14',
  orderIndex: 1,
  pages: [
    '/assets/aistudio/Messenger_creation_B3C9490B-AD71-463E-8AD4-AD2460D2A3AE_1451ba2e.jpeg',
    '/assets/aistudio/Messenger_creation_747554EA-DE00-41D5-9F01-B54BF62D8FD6_ad858686.jpeg',
    '/assets/aistudio/Messenger_creation_86752054-05BC-4FA8-AD08-9936143C4FD4_7e811fb6.jpeg',
    '/assets/aistudio/Messenger_creation_74B770B3-411D-4ADC-97ED-8581698CC890_90d9e1c3.jpeg',
    '/assets/aistudio/Messenger_creation_47824F82-8A74-4586-A614-7D565EADDB01_67647b02.jpeg',
    '/assets/aistudio/Messenger_creation_59872A19-63F4-477A-831C-E7A191F4A577_f99021cd.jpeg',
    '/assets/aistudio/Messenger_creation_C9DDCD16-B294-4595-9B2C-0ABCCF2D4142_64590b28.jpeg',
    '/assets/aistudio/Messenger_creation_48D82002-5CA4-4EC8-B2D8-61CD3D7D3DEB_f73d964d.jpeg',
    '/assets/aistudio/Messenger_creation_08BBE3CA-FF4B-44C1-8517-3615F66D3010_be12bcc2.jpeg',
    '/assets/aistudio/Messenger_creation_26F1EFE6-3A2B-4E26-93C7-EBA9F91C57C4_fedb0fbc.jpeg',
    '/assets/aistudio/Messenger_creation_EA8EB1DE-D0AB-4B41-B660-0431436371D1_1391b0ae.jpeg',
    '/assets/aistudio/Messenger_creation_DD448944-263A-4E5D-A209-FCFE8F78C470_37251826.jpeg',
    '/assets/aistudio/Messenger_creation_F9C420D0-F48D-4876-80CA-2E03D84DE86C_27b036f3.jpeg',
    '/assets/aistudio/Messenger_creation_8FDBCABD-1E98-4ABB-AB90-0D7D28592581_7a4459d2.jpeg',
    '/assets/aistudio/Messenger_creation_0D7476B0-80C1-41A2-B376-76A985B22736_3abd00bd.jpeg',
    '/assets/aistudio/Messenger_creation_C4D2E280-C4BE-430D-AC24-CABA938F4AC2_e36cdb50.jpeg',
    '/assets/aistudio/Messenger_creation_00D21963-5B39-485E-A8CE-4E3310DECEEB_fb92d319.jpeg',
    '/assets/aistudio/Messenger_creation_25491516-4B5B-4C00-8F18-9CD03F20317D_6a08cfbe.jpeg',
    '/assets/aistudio/Messenger_creation_01E6CB07-C6FD-4D5D-A891-26602627821B_037c8061.jpeg',
    '/assets/aistudio/Messenger_creation_89BC7CA5-22B3-4DD0-AF14-2957336AEF34_f32bdb36.jpeg',
    '/assets/aistudio/Messenger_creation_53DC4D9B-F6A3-4710-9340-253FC938B573_f5d03b9a.jpeg',
    '/assets/aistudio/Messenger_creation_19226103-F3E4-4DAA-8209-FD6F24EF2262_1ab89dd5.jpeg',
    '/assets/aistudio/Messenger_creation_DC4AEA94-8F8C-4682-AD68-E64CC51B5C68_72f96f71.jpeg',
    '/assets/aistudio/Messenger_creation_1713D215-FBBA-49AD-B9B6-8E0C3BBC51F5_d3852219.jpeg',
  ],
};

export const manhwaService = {
  /**
   * Realtime subscription for all manhwas
   */
  subscribeManhwaList(callback: (list: Manhwa[]) => void): Unsubscribe {
    const colRef = collection(db, MANHWA_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: Manhwa[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            title: data.title || '',
            altTitles: data.altTitles || '',
            author: data.author || '',
            artist: data.artist || '',
            genres: Array.isArray(data.genres) ? data.genres : [],
            status: data.status || 'ongoing',
            synopsis: data.synopsis || '',
            synopsisEn: data.synopsisEn || '',
            volumes: data.volumes || '',
            chapterNote: data.chapterNote || '',
            releaseYear: data.releaseYear || '',
            coverUrl: data.coverUrl || '',
            orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        // Sort by orderIndex ascending or title
        items.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
        callback(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, MANHWA_COLLECTION);
      }
    );
  },

  /**
   * Get single manhwa by ID
   */
  async getManhwa(id: string): Promise<Manhwa | null> {
    try {
      const docRef = doc(db, MANHWA_COLLECTION, id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      const data = snap.data();
      return {
        id: snap.id,
        title: data.title || '',
        altTitles: data.altTitles || '',
        author: data.author || '',
        artist: data.artist || '',
        genres: Array.isArray(data.genres) ? data.genres : [],
        status: data.status || 'ongoing',
        synopsis: data.synopsis || '',
        synopsisEn: data.synopsisEn || '',
        volumes: data.volumes || '',
        chapterNote: data.chapterNote || '',
        releaseYear: data.releaseYear || '',
        coverUrl: data.coverUrl || '',
        orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${MANHWA_COLLECTION}/${id}`);
    }
  },

  /**
   * Add new manhwa
   */
  async createManhwa(data: Omit<Manhwa, 'id'>): Promise<string> {
    try {
      const colRef = collection(db, MANHWA_COLLECTION);
      const payload = {
        title: data.title.trim(),
        altTitles: data.altTitles?.trim() || '',
        author: data.author?.trim() || '',
        artist: data.artist?.trim() || '',
        genres: data.genres || [],
        status: data.status,
        synopsis: data.synopsis?.trim() || '',
        synopsisEn: data.synopsisEn?.trim() || '',
        volumes: data.volumes?.trim() || '',
        chapterNote: data.chapterNote?.trim() || '',
        releaseYear: data.releaseYear?.trim() || '',
        coverUrl: data.coverUrl.trim(),
        orderIndex: data.orderIndex ?? 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const res = await addDoc(colRef, payload);
      return res.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, MANHWA_COLLECTION);
    }
  },

  /**
   * Upsert manhwa with a deterministic ID
   */
  async upsertManhwa(id: string, data: Omit<Manhwa, 'id'>): Promise<void> {
    try {
      const docRef = doc(db, MANHWA_COLLECTION, id);
      const payload = {
        title: data.title.trim(),
        altTitles: data.altTitles?.trim() || '',
        author: data.author?.trim() || '',
        artist: data.artist?.trim() || '',
        genres: data.genres || [],
        status: data.status,
        synopsis: data.synopsis?.trim() || '',
        synopsisEn: data.synopsisEn?.trim() || '',
        volumes: data.volumes?.trim() || '',
        chapterNote: data.chapterNote?.trim() || '',
        releaseYear: data.releaseYear?.trim() || '',
        coverUrl: data.coverUrl.trim(),
        orderIndex: data.orderIndex ?? 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${MANHWA_COLLECTION}/${id}`);
    }
  },

  /**
   * Update manhwa
   */
  async updateManhwa(id: string, data: Partial<Manhwa>): Promise<void> {
    try {
      const docRef = doc(db, MANHWA_COLLECTION, id);
      const payload: Record<string, any> = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      delete payload.id;
      await updateDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${MANHWA_COLLECTION}/${id}`);
    }
  },

  /**
   * Delete manhwa and all associated chapters
   */
  async deleteManhwa(id: string): Promise<void> {
    try {
      // 1. Delete associated chapters
      const chapQ = query(collection(db, CHAPTERS_COLLECTION), where('manhwaId', '==', id));
      const chapSnaps = await getDocs(chapQ);
      for (const cDoc of chapSnaps.docs) {
        await deleteDoc(doc(db, CHAPTERS_COLLECTION, cDoc.id));
      }

      // 2. Delete manhwa doc
      await deleteDoc(doc(db, MANHWA_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${MANHWA_COLLECTION}/${id}`);
    }
  },

  /**
   * Subscribe to chapters for a specific manhwa
   */
  subscribeChapters(manhwaId: string, callback: (chapters: Chapter[]) => void): Unsubscribe {
    const q = query(collection(db, CHAPTERS_COLLECTION), where('manhwaId', '==', manhwaId));
    return onSnapshot(
      q,
      (snapshot) => {
        const chapters: Chapter[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          chapters.push({
            id: docSnap.id,
            manhwaId: data.manhwaId,
            chapterNumber: typeof data.chapterNumber === 'number' ? data.chapterNumber : 0,
            title: data.title || '',
            pages: Array.isArray(data.pages) ? data.pages : [],
            uploadDate: data.uploadDate || '',
            orderIndex: typeof data.orderIndex === 'number' ? data.orderIndex : data.chapterNumber,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        // Sort chapters by chapterNumber ascending
        chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
        callback(chapters);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, CHAPTERS_COLLECTION);
      }
    );
  },

  /**
   * Create chapter
   */
  async createChapter(data: Omit<Chapter, 'id'>): Promise<string> {
    try {
      const colRef = collection(db, CHAPTERS_COLLECTION);
      const payload = {
        manhwaId: data.manhwaId,
        chapterNumber: Number(data.chapterNumber),
        title: data.title?.trim() || '',
        pages: data.pages || [],
        uploadDate: data.uploadDate || new Date().toISOString().split('T')[0],
        orderIndex: Number(data.orderIndex ?? data.chapterNumber),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const res = await addDoc(colRef, payload);
      return res.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, CHAPTERS_COLLECTION);
    }
  },

  /**
   * Check whether a chapter already exists for a manhwa
   */
  async hasChapter(manhwaId: string, chapterNumber: number): Promise<boolean> {
    try {
      const q = query(
        collection(db, CHAPTERS_COLLECTION),
        where('manhwaId', '==', manhwaId),
        where('chapterNumber', '==', chapterNumber)
      );
      const snaps = await getDocs(q);
      return !snaps.empty;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, CHAPTERS_COLLECTION);
    }
  },

  /**
   * Upsert chapter with deterministic ID
   */
  async upsertChapter(id: string, data: Omit<Chapter, 'id'>): Promise<void> {
    try {
      const docRef = doc(db, CHAPTERS_COLLECTION, id);
      const payload = {
        manhwaId: data.manhwaId,
        chapterNumber: Number(data.chapterNumber),
        title: data.title?.trim() || '',
        pages: data.pages || [],
        uploadDate: data.uploadDate || new Date().toISOString().split('T')[0],
        orderIndex: Number(data.orderIndex ?? data.chapterNumber),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${CHAPTERS_COLLECTION}/${id}`);
    }
  },

  /**
   * Update chapter
   */
  async updateChapter(id: string, data: Partial<Chapter>): Promise<void> {
    try {
      const docRef = doc(db, CHAPTERS_COLLECTION, id);
      const payload: Record<string, any> = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      delete payload.id;
      if (typeof payload.chapterNumber !== 'undefined') {
        payload.chapterNumber = Number(payload.chapterNumber);
      }
      await updateDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${CHAPTERS_COLLECTION}/${id}`);
    }
  },

  /**
   * Delete chapter
   */
  async deleteChapter(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, CHAPTERS_COLLECTION, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${CHAPTERS_COLLECTION}/${id}`);
    }
  },

  /**
   * Seeds initial sample library with iconic titles and sample webtoon panels
   */
  async seedInitialLibrary(): Promise<void> {
    await this.upsertManhwa(THIS_WITCH_OF_MINE_ID, THIS_WITCH_OF_MINE_DATA);
    await this.upsertChapter(THIS_WITCH_OF_MINE_CH1_ID, THIS_WITCH_OF_MINE_CH1_DATA);

    const curatedTitles = [
      {
        title: 'Solo Leveling',
        altTitles: '나 혼자만 레벨업 / Only I Level Up',
        author: 'Chugong',
        artist: 'DUBU (REDICE Studio)',
        genres: ['Action', 'Fantasy', 'System', 'Supernatural'],
        status: 'completed' as const,
        synopsis:
          '10 жилийн өмнө бодит ертөнц болон мангасуудын ертөнцийг холбосон "Хаалга" нээгдэж, зарим хүмүүс "Ангууч" болох ер бусын хүчийг хүлээн авчээ. Сон Жин-Ү бол "Хүн төрөлхтний хамгийн сул ангууч" гэгддэг E-зэрэглэлийн сул дорой нэгэн. Гэвч давхар гянданд үхлийн ирмэгт тулахдаа тэрээр зөвхөн түүнд л харагдах "Систем"-ийн нууцлаг даалгаврыг нээж, хязгааргүй хүчирхэгжих цорын ганц Ангууч болон хувирна.',
        releaseYear: '2018',
        coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=80',
        orderIndex: 1,
        chapters: [
          {
            chapterNumber: 1,
            title: 'Эхлэл: Дэлхийн хамгийн сул ангууч',
            uploadDate: '2026.01.10',
            pages: [
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85',
            ],
          },
          {
            chapterNumber: 2,
            title: 'Давхар гяндангийн аймшиг',
            uploadDate: '2026.01.15',
            pages: [
              'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=85',
            ],
          },
        ],
      },
      {
        title: "Omniscient Reader's Viewpoint",
        altTitles: '전지적 독자 시점 / Бүхнийг мэдэгч уншигчийн ертөнц',
        author: 'Sing Shong',
        artist: 'Sleepy-C (REDICE Studio)',
        genres: ['Action', 'Fantasy', 'Psychological', 'System'],
        status: 'ongoing' as const,
        synopsis:
          'Ким Докжа бол 10 жилийн турш хэний ч уншаагүй "Сүйрсэн ертөнцөд амьд үлдэх гурван арга" гэх веб романы цорын ганц тууштай уншигч. Тэрээр эцсийн бүлгийг уншиж дуусмагц түүний сууж явсан метро гэнэт зогсож, романы үйл явдал бодит амьдрал дээр шууд эхэлнэ. Энэ ертөнцийн төгсгөлийг мэддэг ганцхан хүн бол Докжа өөрөө юм.',
        releaseYear: '2020',
        coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80',
        orderIndex: 2,
        chapters: [
          {
            chapterNumber: 1,
            title: 'Төлбөртэй хувилбар эхэллээ',
            uploadDate: '2026.02.01',
            pages: [
              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=85',
            ],
          },
        ],
      },
      {
        title: 'The Beginning After the End',
        altTitles: 'Төгсгөлийн дараах эхлэл / TBATE',
        author: 'TurtleMe',
        artist: 'Fuyuki23',
        genres: ['Action', 'Adventure', 'Fantasy', 'Reincarnation'],
        status: 'ongoing' as const,
        synopsis:
          'Хосгүй хүч чадал, эд хөрөнгө, эрх мэдлээр дүүрэн өөрийн улсыг захирч асан Грэй Хаан учир битүүлгээр өөд болж, ид шид, мангасуудын Дикатен тивд Артур Лейвин хэмээх нялх хүү болон дахин төрдөг. Өмнөх амьдралынхаа алдааг засч, гэр бүл, найз нөхдөө хамгаалахын тулд тэр шинэ ертөнцийн аугаа шидтэн болж өснө.',
        releaseYear: '2018',
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80',
        orderIndex: 3,
        chapters: [
          {
            chapterNumber: 1,
            title: 'Хааны сүүлчийн өдөр',
            uploadDate: '2026.02.10',
            pages: [
              'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=85',
            ],
          },
        ],
      },
      {
        title: 'Return of the Mount Hua Sect',
        altTitles: '화산귀환 / Хуашань уулын уулчин эргэн ирсэн нь',
        author: 'Biga',
        artist: 'LICO',
        genres: ['Martial Arts', 'Murim', 'Comedy', 'Action', 'Reincarnation'],
        status: 'ongoing' as const,
        synopsis:
          'Хуашань уулын 13 дахь үеийн Агуу Илдний Мастер Чон Мён "Тэнгэрийн чөтгөр"-ийг дарж унагаан ертөнцийг аварсан боловч өөрөө шархаа даалгүй 100 жилийн дараа бяцхан өнчин хүүгийн биед дахин төрдөг. Гэтэл нэгэн цагт Муримын оргил байсан түүний хайрт Хуашань уулын урсгал дампуурлын ирмэгт очсоныг олж мэдээд уур хилэн, эр зоригоор дүүрэн сэргээн босгож эхэлнэ.',
        releaseYear: '2021',
        coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=700&q=80',
        orderIndex: 4,
        chapters: [
          {
            chapterNumber: 1,
            title: 'Цэцэгт сэлэмний эргэн ирэлт',
            uploadDate: '2026.03.01',
            pages: [
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=85',
              'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=85',
            ],
          },
        ],
      },
    ];

    for (const item of curatedTitles) {
      const { chapters, ...manhwaData } = item;
      const manhwaId = await this.createManhwa(manhwaData);
      for (const ch of chapters) {
        await this.createChapter({
          manhwaId,
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          uploadDate: ch.uploadDate,
          pages: ch.pages,
          orderIndex: ch.chapterNumber,
        });
      }
    }
  },
};
