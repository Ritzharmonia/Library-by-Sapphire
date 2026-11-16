export type ManhwaStatus = 'ongoing' | 'completed' | 'hiatus';

export interface Manhwa {
  id: string;
  title: string;
  altTitles?: string;
  author?: string;
  artist?: string;
  genres: string[];
  status: ManhwaStatus;
  synopsis?: string;
  synopsisEn?: string;
  volumes?: string;
  chapterNote?: string;
  releaseYear?: string;
  coverUrl: string;
  orderIndex: number;
  chapterCount?: number;
  latestChapter?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Chapter {
  id: string;
  manhwaId: string;
  chapterNumber: number;
  title?: string;
  pages: string[];
  uploadDate?: string;
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  manhwaId: string;
  chapterId?: string;
  targetType: 'manhwa' | 'chapter';
  userId?: string;
  userName: string;
  userAvatar?: string;
  text: string;
  parentId?: string;
  replyToName?: string;
  likedBy?: string[];
  createdAt: string;
}

export interface Reader {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  pin: string;
  avatarUrl?: string;
  createdAt?: string;
}

export type Language = 'mn' | 'en';
