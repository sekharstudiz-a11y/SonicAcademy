export const NOTE_MAP: Record<string, string> = {
  'a': 'C4',
  'w': 'C#4',
  's': 'D4',
  'e': 'D#4',
  'd': 'E4',
  'f': 'F4',
  't': 'F#4',
  'g': 'G4',
  'y': 'G#4',
  'h': 'A4',
  'u': 'A#4',
  'j': 'B4',
  'k': 'C5',
  'o': 'C#5',
  'l': 'D5',
  'p': 'D#5',
  ';': 'E5',
  '\'': 'F5',
  '[': 'F#5',
  ']': 'G5',
};

export const NOTE_TO_KEY_MAP: Record<string, string> = Object.entries(NOTE_MAP).reduce((acc, [key, note]) => {
  acc[note] = key;
  return acc;
}, {} as Record<string, string>);

export const PIANO_KEYS = [
  { note: 'C4', type: 'white', key: 'a' },
  { note: 'C#4', type: 'black', key: 'w' },
  { note: 'D4', type: 'white', key: 's' },
  { note: 'D#4', type: 'black', key: 'e' },
  { note: 'E4', type: 'white', key: 'd' },
  { note: 'F4', type: 'white', key: 'f' },
  { note: 'F#4', type: 'black', key: 't' },
  { note: 'G4', type: 'white', key: 'g' },
  { note: 'G#4', type: 'black', key: 'y' },
  { note: 'A4', type: 'white', key: 'h' },
  { note: 'A#4', type: 'black', key: 'u' },
  { note: 'B4', type: 'white', key: 'j' },
  { note: 'C5', type: 'white', key: 'k' },
  { note: 'C#5', type: 'black', key: 'o' },
  { note: 'D5', type: 'white', key: 'l' },
  { note: 'D#5', type: 'black', key: 'p' },
  { note: 'E5', type: 'white', key: ';' },
  { note: 'F5', type: 'white', key: '\'' },
  { note: 'F#5', type: 'black', key: '[' },
  { note: 'G5', type: 'white', key: ']' },
];

export type InstrumentType = 'piano' | 'synth' | 'pad' | 'lead';
export type LevelType = 'beginner' | 'intermediate' | 'advanced';

export interface SongNote {
  note: string;
  time: number;
  duration: string;
}

export interface Song {
  id: string;
  name: string;
  level: LevelType;
  instruments: InstrumentType[];
  notes: SongNote[];
  key: string;
  suggestedBpm: number;
}

export interface InstrumentInfo {
  id: InstrumentType;
  name: string;
  icon: string;
  description: string;
  history: string;
  famousPlayers: string[];
  imageUrl: string;
}

export const INSTRUMENTS: InstrumentInfo[] = [
  { 
    id: 'piano', 
    name: 'Grand Piano', 
    icon: 'Piano', 
    description: 'Classic acoustic sound with rich harmonics.',
    history: 'Invented by Bartolomeo Cristofori in Italy around 1700, the piano evolved from the harpsichord by allowing players to control volume through touch (piano e forte).',
    famousPlayers: ['Ludwig van Beethoven', 'Frederic Chopin', 'Lang Lang', 'Alicia Keys'],
    imageUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=800&auto=format&fit=crop'
  },
  { 
    id: 'synth', 
    name: 'Electric Synth', 
    icon: 'Zap', 
    description: 'Modern sawtooth wave with sharp attack.',
    history: 'Synthesizers emerged in the mid-20th century, with Robert Moog\'s 1964 modular synth revolutionizing music by using electronic oscillators to create infinite new sounds.',
    famousPlayers: ['Keith Emerson', 'Rick Wakeman', 'Kraftwerk', 'Jean-Michel Jarre'],
    imageUrl: 'https://images.unsplash.com/photo-1552239658-0fa998e3759a?q=80&w=800&auto=format&fit=crop'
  },
  { 
    id: 'pad', 
    name: 'Atmospheric Pad', 
    icon: 'Cloud', 
    description: 'Soft, ethereal textures for ambient soundscapes.',
    history: 'Ambient pads became popular in the 1970s and 80s with the rise of digital synthesis and reverb units, used to create "sonic wallpaper" and emotional depth.',
    famousPlayers: ['Brian Eno', 'Vangelis', 'Enya', 'Hans Zimmer'],
    imageUrl: 'https://images.unsplash.com/photo-1514525253344-f81f3f77ed96?q=80&w=800&auto=format&fit=crop'
  },
  { 
    id: 'lead', 
    name: 'Digital Lead', 
    icon: 'Music', 
    description: 'Punchy square wave for melodic lines.',
    history: 'Digital leads gained prominence with the FM synthesis of the Yamaha DX7 in 1983, providing the bright, cutting sounds that defined 80s pop and modern EDM.',
    famousPlayers: ['Jan Hammer', 'Jordan Rudess', 'Skrillex', 'Deadmau5'],
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop'
  },
];

export const SONGS: Song[] = [
  // BEGINNER MELODIC
  {
    id: 'twinkle',
    name: 'Twinkle Twinkle',
    level: 'beginner',
    instruments: ['piano', 'synth', 'pad', 'lead'],
    notes: [
      { note: 'C4', time: 0, duration: '4n' }, { note: 'C4', time: 0.5, duration: '4n' },
      { note: 'G4', time: 1, duration: '4n' }, { note: 'G4', time: 1.5, duration: '4n' },
      { note: 'A4', time: 2, duration: '4n' }, { note: 'A4', time: 2.5, duration: '4n' },
      { note: 'G4', time: 3, duration: '2n' },
    ],
    key: 'C Major',
    suggestedBpm: 120
  },
  {
    id: 'mary',
    name: 'Mary Had a Little Lamb',
    level: 'beginner',
    instruments: ['piano', 'synth', 'pad', 'lead'],
    notes: [
      { note: 'E4', time: 0, duration: '4n' }, { note: 'D4', time: 0.5, duration: '4n' },
      { note: 'C4', time: 1, duration: '4n' }, { note: 'D4', time: 1.5, duration: '4n' },
      { note: 'E4', time: 2, duration: '4n' }, { note: 'E4', time: 2.5, duration: '4n' },
      { note: 'E4', time: 3, duration: '2n' },
    ],
    key: 'C Major',
    suggestedBpm: 90
  },
  // INTERMEDIATE MELODIC
  {
    id: 'ode',
    name: 'Ode to Joy',
    level: 'intermediate',
    instruments: ['piano', 'synth', 'pad', 'lead'],
    notes: [
      { note: 'E4', time: 0, duration: '4n' }, { note: 'E4', time: 0.5, duration: '4n' },
      { note: 'F4', time: 1, duration: '4n' }, { note: 'G4', time: 1.5, duration: '4n' },
      { note: 'G4', time: 2, duration: '4n' }, { note: 'F4', time: 2.5, duration: '4n' },
      { note: 'E4', time: 3, duration: '4n' }, { note: 'D4', time: 3.5, duration: '4n' },
    ],
    key: 'G Major',
    suggestedBpm: 120
  },
  {
    id: 'minuet',
    name: 'Minuet in G',
    level: 'intermediate',
    instruments: ['piano', 'synth', 'pad', 'lead'],
    notes: [
      { note: 'G4', time: 0, duration: '4n' }, { note: 'D4', time: 0.5, duration: '8n' },
      { note: 'E4', time: 0.75, duration: '8n' }, { note: 'F#4', time: 1, duration: '8n' },
      { note: 'G4', time: 1.25, duration: '8n' }, { note: 'D4', time: 1.5, duration: '4n' },
      { note: 'B4', time: 2, duration: '4n' },
    ],
    key: 'G Major',
    suggestedBpm: 110
  },
  // ADVANCED MELODIC
  {
    id: 'furelise',
    name: 'Für Elise (Intro)',
    level: 'advanced',
    instruments: ['piano', 'synth', 'pad', 'lead'],
    notes: [
      { note: 'E5', time: 0, duration: '8n' }, { note: 'D#5', time: 0.25, duration: '8n' },
      { note: 'E5', time: 0.5, duration: '8n' }, { note: 'D#5', time: 0.75, duration: '8n' },
      { note: 'E5', time: 1, duration: '8n' }, { note: 'B4', time: 1.25, duration: '8n' },
      { note: 'D5', time: 1.5, duration: '8n' }, { note: 'C5', time: 1.75, duration: '8n' },
      { note: 'A4', time: 2, duration: '2n' },
    ],
    key: 'A Minor',
    suggestedBpm: 100
  },
  {
    id: 'moonlight',
    name: 'Moonlight Sonata',
    level: 'advanced',
    instruments: ['piano', 'synth', 'pad', 'lead'],
    notes: [
      { note: 'C#4', time: 0, duration: '8n' }, { note: 'E4', time: 0.25, duration: '8n' },
      { note: 'G#4', time: 0.5, duration: '8n' }, { note: 'C#4', time: 0.75, duration: '8n' },
      { note: 'E4', time: 1, duration: '8n' }, { note: 'G#4', time: 1.25, duration: '8n' },
    ],
    key: 'C# Minor',
    suggestedBpm: 60
  },
  {
    id: 'howls',
    name: 'Merry-Go-Round of Life',
    level: 'advanced',
    instruments: ['piano', 'synth', 'pad', 'lead'],
    notes: [
      { note: 'G4', time: 0, duration: '4n' },
      { note: 'D5', time: 0.75, duration: '8n' },
      { note: 'G5', time: 1, duration: '4n' },
      { note: 'F#5', time: 1.75, duration: '8n' },
      { note: 'F5', time: 2, duration: '4n' },
      { note: 'E5', time: 2.75, duration: '8n' },
      { note: 'D#5', time: 3, duration: '4n' },
      { note: 'D5', time: 3.75, duration: '8n' },
    ],
    key: 'G Minor',
    suggestedBpm: 120
  },
  {
    id: 'tulaali',
    name: 'Tu Laali Hai Savere Wali',
    level: 'intermediate',
    instruments: ['piano', 'synth', 'lead'],
    notes: [
      { note: 'D4', time: 0, duration: '4n' },
      { note: 'F#4', time: 0.5, duration: '4n' },
      { note: 'A4', time: 1, duration: '4n' },
      { note: 'A4', time: 1.5, duration: '4n' },
      { note: 'G4', time: 2, duration: '8n' },
      { note: 'F#4', time: 2.25, duration: '8n' },
      { note: 'G4', time: 2.5, duration: '4n' },
      { note: 'F#4', time: 3, duration: '2n' },
    ],
    key: 'D Major',
    suggestedBpm: 95
  },
];

export const LEVELS = [
  { id: 'beginner', name: 'Beginner', description: 'Note names visible on keys' },
  { id: 'intermediate', name: 'Intermediate', description: 'Only active note displayed' },
  { id: 'advanced', name: 'Advanced', description: 'No visual aids, ear training focus' },
];
