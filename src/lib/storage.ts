import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, storage, handleFirestoreError, OperationType } from './firebase';

export const MEDIA_PREFIX = 'firestore-media://';
export const AVATAR_PREFIX = 'firestore-avatar://';
export const COMMENT_IMG_PREFIX = 'firestore-comment-img://';
const MEDIA_COLLECTION = 'media';
const AVATARS_COLLECTION = 'avatars';
const COMMENT_IMAGES_COLLECTION = 'commentImages';
const IDB_NAME = 'sapphire_media_cache_v1';
const IDB_STORE = 'media_blobs';
const MAX_SLICE_HEIGHT = 2800;

// In-memory resolved URL cache & in-flight deduplication
const memoryCache = new Map<string, string>();
const inFlightCache = new Map<string, Promise<string>>();

// Remember if Firebase Storage bucket is unavailable/unauthorized in this session
let storageUnavailable = false;
let storageProbePromise: Promise<string | null> | null = null;
let cachedPreferredMime: 'image/webp' | 'image/jpeg' | null = null;

function getPreferredOutputMime(): 'image/webp' | 'image/jpeg' {
  if (cachedPreferredMime) return cachedPreferredMime;
  try {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 2;
    testCanvas.height = 2;
    const out = testCanvas.toDataURL('image/webp', 0.8);
    cachedPreferredMime = out.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
  } catch {
    cachedPreferredMime = 'image/jpeg';
  }
  return cachedPreferredMime;
}

function openMediaDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getFromIDB(key: string): Promise<string | null> {
  try {
    const database = await openMediaDB();
    if (!database) return null;
    return await new Promise((resolve) => {
      const tx = database.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveToIDB(key: string, value: string): Promise<void> {
  try {
    const database = await openMediaDB();
    if (!database) return;
    await new Promise<void>((resolve) => {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore browser quota errors
  }
}

export function isMediaRef(url?: string): boolean {
  return Boolean(
    url &&
      (url.startsWith(MEDIA_PREFIX) ||
        url.startsWith(AVATAR_PREFIX) ||
        url.startsWith(COMMENT_IMG_PREFIX))
  );
}

export function getCachedMediaSync(url?: string): string | null {
  if (!url) return null;
  if (!isMediaRef(url)) return url;
  return memoryCache.get(url) ?? null;
}

export async function resolveMediaUrl(url: string): Promise<string> {
  if (!url || !isMediaRef(url)) return url;

  const cached = memoryCache.get(url);
  if (cached) return cached;

  const existingPromise = inFlightCache.get(url);
  if (existingPromise) return existingPromise;

  let collectionName = MEDIA_COLLECTION;
  let docId = url.slice(MEDIA_PREFIX.length);
  if (url.startsWith(AVATAR_PREFIX)) {
    collectionName = AVATARS_COLLECTION;
    docId = url.slice(AVATAR_PREFIX.length);
  } else if (url.startsWith(COMMENT_IMG_PREFIX)) {
    collectionName = COMMENT_IMAGES_COLLECTION;
    docId = url.slice(COMMENT_IMG_PREFIX.length);
  }

  const promise = (async () => {
    const idbHit = await getFromIDB(url);
    if (idbHit) {
      memoryCache.set(url, idbHit);
      return idbHit;
    }

    try {
      const snap = await getDoc(doc(db, collectionName, docId));
      if (snap.exists()) {
        const data = snap.data();
        const dataUrl = typeof data.dataUrl === 'string' ? data.dataUrl : '';
        if (dataUrl) {
          memoryCache.set(url, dataUrl);
          void saveToIDB(url, dataUrl);
          return dataUrl;
        }
      }
      return '';
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${collectionName}/${docId}`);
    } finally {
      inFlightCache.delete(url);
    }
  })();

  inFlightCache.set(url, promise);
  return promise;
}

export async function prefetchMediaUrls(urls: string[], concurrency = 4): Promise<void> {
  if (!urls || urls.length === 0) return;
  let index = 0;

  const worker = async () => {
    while (index < urls.length) {
      const current = urls[index++];
      if (!current) continue;
      try {
        const resolved = isMediaRef(current) ? await resolveMediaUrl(current) : current;
        if (resolved && typeof Image !== 'undefined') {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = resolved;
          });
        }
      } catch {
        // ignore prefetch failure
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
}

interface DecodedSource {
  width: number;
  height: number;
  drawRegion: (
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dw: number,
    dh: number
  ) => void;
  close: () => void;
}

async function decodeImageSource(file: File): Promise<DecodedSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        drawRegion: (ctx, sx, sy, sw, sh, dw, dh) =>
          ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh),
        close: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Зургийг уншиж чадсангүй (${file.name}).`));
      el.src = objectUrl;
    });

    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      drawRegion: (ctx, sx, sy, sw, sh, dw, dh) =>
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh),
      close: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

async function canvasToOutput(
  canvas: HTMLCanvasElement,
  mimeType: 'image/webp' | 'image/jpeg',
  quality: number
): Promise<{ dataUrl: string; blob: Blob; mimeType: string }> {
  let dataUrl = canvas.toDataURL(mimeType, quality);
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl === 'data:,') {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl === 'data:,') {
    throw new Error('Зургийг хөрвүүлж чадсангүй.');
  }

  const actualMime = dataUrl.startsWith('data:image/webp')
    ? 'image/webp'
    : dataUrl.startsWith('data:image/png')
    ? 'image/png'
    : 'image/jpeg';

  const blob = await new Promise<Blob>((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else {
            fetch(dataUrl)
              .then((r) => r.blob())
              .then(resolve)
              .catch(reject);
          }
        },
        actualMime,
        quality
      );
    } else {
      fetch(dataUrl)
        .then((r) => r.blob())
        .then(resolve)
        .catch(reject);
    }
  });

  return { dataUrl, blob, mimeType: actualMime };
}

interface OptimizedChunk {
  dataUrl: string;
  blob: Blob;
  mimeType: string;
}

async function renderCompressedRegion(
  source: DecodedSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  maxWidth: number,
  maxDataUrlLength: number
): Promise<OptimizedChunk> {
  let targetW = sw;
  let targetH = sh;
  if (targetW > maxWidth) {
    targetH = Math.max(1, Math.round((targetH * maxWidth) / targetW));
    targetW = maxWidth;
  }

  // Keep canvas safely within mobile/desktop browser limits
  if (targetH > 4096) {
    targetW = Math.max(1, Math.round((targetW * 4096) / targetH));
    targetH = 4096;
  }

  const preferredMime = getPreferredOutputMime();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  const qualities = maxDataUrlLength < 5000 ? [0.7, 0.52, 0.38] : [0.85, 0.74, 0.62, 0.48];
  let scale = 1;

  for (let attempt = 0; attempt < 6; attempt++) {
    const w = Math.max(1, Math.round(targetW * scale));
    const h = Math.max(1, Math.round(targetH * scale));
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    source.drawRegion(ctx, sx, sy, sw, sh, w, h);

    for (const q of qualities) {
      const res = await canvasToOutput(canvas, preferredMime, q);
      if (res.dataUrl.length <= maxDataUrlLength) {
        return res;
      }
    }
    scale *= 0.75;
  }

  const fallbackRes = await canvasToOutput(canvas, 'image/jpeg', 0.35);
  if (fallbackRes.dataUrl.length > maxDataUrlLength) {
    throw new Error('Зургийн хэмжээ хэт том байна.');
  }
  return fallbackRes;
}

async function optimizeImageToChunks(
  file: File,
  maxWidth: number,
  maxDataUrlLength: number,
  allowSlicing: boolean
): Promise<OptimizedChunk[]> {
  // Fast path: small standard web image that does not need slicing
  if (file.size <= 180 * 1024 && (file.type === 'image/webp' || file.type === 'image/jpeg')) {
    const rawDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') resolve(e.target.result);
        else reject(new Error('Failed to read file.'));
      };
      reader.onerror = () => reject(new Error('File reader failed.'));
      reader.readAsDataURL(file);
    });
    if (rawDataUrl.length <= maxDataUrlLength) {
      return [{ dataUrl: rawDataUrl, blob: file, mimeType: file.type }];
    }
  }

  const source = await decodeImageSource(file);
  try {
    // Automatically slice ultra-tall webtoon strips so text stays crisp and canvas never overflows
    if (allowSlicing && source.height > MAX_SLICE_HEIGHT) {
      const chunks: OptimizedChunk[] = [];
      for (let y = 0; y < source.height; y += MAX_SLICE_HEIGHT) {
        const sliceH = Math.min(MAX_SLICE_HEIGHT, source.height - y);
        const chunk = await renderCompressedRegion(
          source,
          0,
          y,
          source.width,
          sliceH,
          maxWidth,
          maxDataUrlLength
        );
        chunks.push(chunk);
      }
      return chunks;
    }

    const single = await renderCompressedRegion(
      source,
      0,
      0,
      source.width,
      source.height,
      maxWidth,
      maxDataUrlLength
    );
    return [single];
  } finally {
    source.close();
  }
}

async function tryFirebaseStorageUpload(
  path: string,
  blob: Blob,
  mimeType: string
): Promise<string | null> {
  if (storageUnavailable) return null;

  const runUpload = async () => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: mimeType,
      cacheControl: 'public,max-age=31536000,immutable',
    });
    return await getDownloadURL(snapshot.ref);
  };

  // Serialize the very first Storage probe across concurrent workers so 4 workers don't all stall
  if (storageProbePromise) {
    const probeResult = await storageProbePromise;
    if (!probeResult || storageUnavailable) return null;
  }

  const currentAttempt = (async (): Promise<string | null> => {
    const uploadPromise = runUpload();
    uploadPromise.catch(() => {});

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timeout')), 2500)
    );

    try {
      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Firebase Storage unavailable, using permanent Firestore media store:', err);
      storageUnavailable = true;
      return null;
    }
  })();

  if (!storageProbePromise) {
    storageProbePromise = currentAttempt;
    const res = await currentAttempt;
    if (res) storageProbePromise = null;
    return res;
  }

  return await currentAttempt;
}

function makeMediaId(prefix = 'med'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

async function optimizeAvatarChunk(
  file: File,
  targetSize = 480,
  maxDataUrlLength = 135000
): Promise<OptimizedChunk> {
  const source = await decodeImageSource(file);
  try {
    const side = Math.min(source.width, source.height);
    const sx = Math.max(0, Math.floor((source.width - side) / 2));
    const sy = Math.max(0, Math.floor((source.height - side) / 2));
    const outputSize = Math.min(targetSize, Math.max(side, 256));
    return await renderCompressedRegion(
      source,
      sx,
      sy,
      side,
      side,
      outputSize,
      maxDataUrlLength
    );
  } finally {
    source.close();
  }
}

async function persistAvatarToSite(
  chunk: OptimizedChunk,
  sanitizedFileName: string
): Promise<string> {
  const ext = chunk.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const baseName = sanitizedFileName.replace(/\.[^.]+$/, '');
  const storagePath = `avatars/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${baseName}.${ext}`;

  const remoteUrl = await tryFirebaseStorageUpload(storagePath, chunk.blob, chunk.mimeType);
  if (remoteUrl) return remoteUrl;

  const avatarId = makeMediaId('av');
  const refUrl = `${AVATAR_PREFIX}${avatarId}`;
  try {
    await setDoc(doc(db, AVATARS_COLLECTION, avatarId), {
      dataUrl: chunk.dataUrl,
      mimeType: chunk.mimeType,
      size: chunk.dataUrl.length,
      createdAt: new Date().toISOString(),
    });
    memoryCache.set(refUrl, chunk.dataUrl);
    void saveToIDB(refUrl, chunk.dataUrl);
    return refUrl;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${AVATARS_COLLECTION}/${avatarId}`);
  }
}

async function persistCommentImageToSite(
  chunk: OptimizedChunk,
  sanitizedFileName: string
): Promise<string> {
  const ext =
    chunk.mimeType === 'image/gif'
      ? 'gif'
      : chunk.mimeType === 'image/webp'
      ? 'webp'
      : 'jpg';
  const baseName = sanitizedFileName.replace(/\.[^.]+$/, '');
  const storagePath = `commentImages/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${baseName}.${ext}`;

  const remoteUrl = await tryFirebaseStorageUpload(storagePath, chunk.blob, chunk.mimeType);
  if (remoteUrl) return remoteUrl;

  const imageId = makeMediaId('cimg');
  const refUrl = `${COMMENT_IMG_PREFIX}${imageId}`;
  try {
    await setDoc(doc(db, COMMENT_IMAGES_COLLECTION, imageId), {
      dataUrl: chunk.dataUrl,
      mimeType: chunk.mimeType,
      size: chunk.dataUrl.length,
      createdAt: new Date().toISOString(),
    });
    memoryCache.set(refUrl, chunk.dataUrl);
    void saveToIDB(refUrl, chunk.dataUrl);
    return refUrl;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${COMMENT_IMAGES_COLLECTION}/${imageId}`);
  }
}

async function persistChunkToSite(
  chunk: OptimizedChunk,
  folder: string,
  sanitizedFileName: string
): Promise<string> {
  const ext = chunk.mimeType === 'image/webp' ? 'webp' : 'jpg';
  const baseName = sanitizedFileName.replace(/\.[^.]+$/, '');
  const storagePath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${baseName}.${ext}`;

  const remoteUrl = await tryFirebaseStorageUpload(storagePath, chunk.blob, chunk.mimeType);
  if (remoteUrl) return remoteUrl;

  const mediaId = makeMediaId('med');
  const refUrl = `${MEDIA_PREFIX}${mediaId}`;
  try {
    await setDoc(doc(db, MEDIA_COLLECTION, mediaId), {
      dataUrl: chunk.dataUrl,
      mimeType: chunk.mimeType,
      folder: folder.slice(0, 200),
      fileName: sanitizedFileName.slice(0, 255),
      size: chunk.dataUrl.length,
      createdAt: new Date().toISOString(),
    });
    memoryCache.set(refUrl, chunk.dataUrl);
    void saveToIDB(refUrl, chunk.dataUrl);
    return refUrl;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${MEDIA_COLLECTION}/${mediaId}`);
  }
}

/**
 * Optimizes and permanently stores a single image (cover, HD avatar, or comment attachment).
 */
export async function uploadImage(file: File, folder = 'covers'): Promise<string> {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  if (folder === 'avatars') {
    const avatarChunk = await optimizeAvatarChunk(file, 480, 135000);
    return await persistAvatarToSite(avatarChunk, sanitizedFileName);
  }

  if (folder === 'commentImages') {
    // Preserve animated GIFs directly if they fit within 540KB encoded
    if (file.type === 'image/gif' && file.size <= 380 * 1024) {
      const gifDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (typeof e.target?.result === 'string') resolve(e.target.result);
          else reject(new Error('Failed to read GIF.'));
        };
        reader.onerror = () => reject(new Error('File reader failed.'));
        reader.readAsDataURL(file);
      });
      if (gifDataUrl.length <= 540000) {
        return await persistCommentImageToSite(
          { dataUrl: gifDataUrl, blob: file, mimeType: 'image/gif' },
          sanitizedFileName
        );
      }
    }

    const chunks = await optimizeImageToChunks(file, 1080, 540000, false);
    return await persistCommentImageToSite(chunks[0], sanitizedFileName);
  }

  const maxWidth = folder.includes('cover') ? 900 : 1200;
  const chunks = await optimizeImageToChunks(file, maxWidth, 860000, false);
  return await persistChunkToSite(chunks[0], folder, sanitizedFileName);
}

export type UploadSortMode = 'auto' | 'selected' | 'name' | 'timeAsc' | 'timeDesc';

function smartCompareFileNames(aName: string, bName: string): number {
  const stripExt = (s: string) => s.replace(/\.[^.]+$/, '');
  const aBase = stripExt(aName);
  const bBase = stripExt(bName);

  // Ensure "image.jpg" comes before "image (1).jpg", "image (2).jpg", etc.
  const aParen = aBase.match(/^(.*?)\s*\((\d+)\)$/);
  const bParen = bBase.match(/^(.*?)\s*\((\d+)\)$/);
  const aStem = (aParen ? aParen[1] : aBase).trim();
  const bStem = (bParen ? bParen[1] : bBase).trim();
  if (aStem.toLowerCase() === bStem.toLowerCase()) {
    const aNum = aParen ? Number(aParen[2]) : 0;
    const bNum = bParen ? Number(bParen[2]) : 0;
    if (aNum !== bNum) return aNum - bNum;
  }

  return aBase.localeCompare(bBase, undefined, { numeric: true, sensitivity: 'base' });
}

function isUuidLikeFileName(name: string): boolean {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(name);
}

function sortFilesForUpload(files: File[], sortMode: UploadSortMode): File[] {
  const copy = [...files];
  if (sortMode === 'selected') {
    return copy;
  }
  if (sortMode === 'timeAsc') {
    return copy.sort((a, b) => a.lastModified - b.lastModified || smartCompareFileNames(a.name, b.name));
  }
  if (sortMode === 'timeDesc') {
    return copy.sort((a, b) => b.lastModified - a.lastModified || smartCompareFileNames(a.name, b.name));
  }
  if (sortMode === 'name') {
    return copy.sort((a, b) => smartCompareFileNames(a.name, b.name));
  }

  // 'auto': keep selection order if filenames are random UUIDs (e.g. Messenger downloads),
  // otherwise use smart natural filename sorting (1, 2, ..., 10)
  const uuidCount = copy.filter((f) => isUuidLikeFileName(f.name)).length;
  if (uuidCount > 0 && uuidCount >= copy.length / 2) {
    return copy;
  }
  return copy.sort((a, b) => smartCompareFileNames(a.name, b.name));
}

/**
 * Sorts files according to the chosen UploadSortMode,
 * slices any ultra-tall webtoon strips cleanly, and uploads them concurrently
 * while strictly preserving exact output order.
 */
export async function uploadImagesBatch(
  files: File[],
  folder: string,
  onProgress?: (completed: number, total: number) => void,
  concurrency = 4,
  sortMode: UploadSortMode = 'auto'
): Promise<{ urls: string[]; failedFiles: string[]; lastError?: string }> {
  const sorted = sortFilesForUpload(files, sortMode);

  const perFileResults = new Array<string[]>(sorted.length);
  const failedFiles: string[] = [];
  let lastError: string | undefined;
  let nextIndex = 0;
  let completed = 0;

  const worker = async () => {
    while (nextIndex < sorted.length) {
      const currentIndex = nextIndex++;
      const file = sorted[currentIndex];
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      try {
        const chunks = await optimizeImageToChunks(file, 1200, 860000, true);
        const chunkUrls: string[] = [];
        for (const chunk of chunks) {
          const url = await persistChunkToSite(chunk, folder, sanitized);
          chunkUrls.push(url);
        }
        perFileResults[currentIndex] = chunkUrls;
      } catch (err: any) {
        failedFiles.push(file.name);
        lastError = err?.message || String(err);
        perFileResults[currentIndex] = [];
      } finally {
        completed += 1;
        onProgress?.(completed, sorted.length);
      }
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, sorted.length) },
    () => worker()
  );
  await Promise.all(workers);

  const urls = perFileResults.flat();
  return { urls, failedFiles, lastError };
}
