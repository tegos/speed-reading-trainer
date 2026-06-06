export interface LibraryText {
  id: string;
  title: string;
  content: string;
  position: number; // word index
  addedAt: number; // epoch ms
}

export type Mode = 'book' | 'rsvp';

export interface Settings {
  wpm: number;
  chunkSize: number; // 1–5 words
  fontSize: number; // px, 14–24
  mode: Mode;
  autoProgress: boolean;
  activeTextId: string | null;
}

export interface Session {
  date: number; // epoch ms, session start
  words: number;
  minutes: number;
  wpm: number; // effective
}

export interface State {
  settings: Settings;
  library: LibraryText[];
  sessions: Session[];
  words: string[]; // active text, split
  position: number; // current word index
  running: boolean;
  overlay: 'library' | 'stats' | null;
}
