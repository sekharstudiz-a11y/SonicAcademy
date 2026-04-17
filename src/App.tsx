/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { motion, AnimatePresence } from 'motion/react';
import { transcribeSongFromLink } from './services/geminiService';
import { 
  Piano, 
  Zap, 
  Cloud, 
  Music, 
  Settings, 
  Volume2, 
  VolumeX,
  ChevronRight,
  Trophy,
  Keyboard as KeyboardIcon,
  Circle,
  Square,
  Download,
  Play,
  Pause,
  RotateCcw,
  Info,
  X,
  History,
  Users,
  Link as LinkIcon,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  NOTE_MAP, 
  NOTE_TO_KEY_MAP,
  PIANO_KEYS, 
  INSTRUMENTS, 
  LEVELS, 
  SONGS,
  InstrumentType, 
  LevelType,
  Song,
  InstrumentInfo
} from './constants';

export default function App() {
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [level, setLevel] = useState<LevelType>('beginner');
  const [showKeyMap, setShowKeyMap] = useState(true);
  const [volume, setVolume] = useState(-12);
  const [isMuted, setIsMuted] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [lastNote, setLastNote] = useState<string | null>(null);
  const [isAudioStarted, setIsAudioStarted] = useState(false);
  const [selectedInstrumentInfo, setSelectedInstrumentInfo] = useState<InstrumentInfo | null>(null);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<Tone.Recorder | null>(null);

  // Song playback state
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlayingSong, setIsPlayingSong] = useState(false);
  const [activeSongNoteIndex, setActiveSongNoteIndex] = useState<number>(-1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitchShift, setPitchShift] = useState(0); // in semitones
  const [toneCutoff, setToneCutoff] = useState(20000); // in Hz
  const [isSongFinished, setIsSongFinished] = useState(false);
  
  // AI Transcription State
  const [transcriptionUrl, setTranscriptionUrl] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sessionSongs, setSessionSongs] = useState<Song[]>([]);
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(null);

  const partRef = useRef<Tone.Part | null>(null);

  const filteredSongs = useMemo(() => {
    const allSongs = [...SONGS, ...sessionSongs];
    return allSongs.filter(s => s.level === level && s.instruments.includes(instrument));
  }, [level, instrument, sessionSongs]);

  // Reset current song if it's no longer in filtered list
  useEffect(() => {
    if (currentSong && !filteredSongs.find(s => s.id === currentSong.id)) {
      console.log(`[SonicAcademy] Resetting current song: ${currentSong.id} not in filtered list`);
      setCurrentSong(null);
      if (isPlayingSong) {
        Tone.getTransport().stop();
        partRef.current?.stop();
        setIsPlayingSong(false);
        setActiveSongNoteIndex(-1);
      }
    }
  }, [filteredSongs, currentSong, isPlayingSong]);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);

  // Theme synchronization with level
  useEffect(() => {
    const root = document.documentElement;
    const colors = {
      beginner: { hex: '#22c55e', rgb: '34, 197, 94' },
      intermediate: { hex: '#3b82f6', rgb: '59, 130, 246' },
      advanced: { hex: '#ef4444', rgb: '239, 68, 68' }
    };
    const current = colors[level];
    root.style.setProperty('--accent-color', current.hex);
    root.style.setProperty('--accent-color-rgb', current.rgb);
  }, [level]);

  // Update playback rate, pitch, and tone
  useEffect(() => {
    const baseBpm = currentSong?.suggestedBpm || 120;
    Tone.getTransport().bpm.value = baseBpm * playbackRate;
  }, [playbackRate, currentSong]);

  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.set({ detune: pitchShift * 100 });
    }
  }, [pitchShift]);

  useEffect(() => {
    if (filterRef.current) {
      filterRef.current.frequency.rampTo(toneCutoff, 0.1);
    }
  }, [toneCutoff]);

  // Initialize synth and recorder
  useEffect(() => {
    const createSynth = () => {
      if (synthRef.current) synthRef.current.dispose();
      if (filterRef.current) filterRef.current.dispose();
      if (recorderRef.current) recorderRef.current.dispose();

      recorderRef.current = new Tone.Recorder();
      filterRef.current = new Tone.Filter(toneCutoff, "lowpass")
        .connect(recorderRef.current)
        .toDestination();

      let options: any = {};
      switch (instrument) {
        case 'piano':
          options = {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
          };
          break;
        case 'synth':
          options = {
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.8 }
          };
          break;
        case 'pad':
          options = {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 2 }
          };
          break;
        case 'lead':
          options = {
            oscillator: { type: 'square' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.5 }
          };
          break;
      }
      
      const synth = new Tone.PolySynth(Tone.Synth, options).connect(filterRef.current!);
      synth.set({ detune: pitchShift * 100 });
      synthRef.current = synth;
      
      if (synthRef.current) {
        synthRef.current.volume.value = isMuted ? -Infinity : volume;
      }
    };

    createSynth();

    return () => {
      synthRef.current?.dispose();
      recorderRef.current?.dispose();
    };
  }, [instrument]);

  // Update volume
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = isMuted ? -Infinity : volume;
    }
  }, [volume, isMuted]);

  const playNote = useCallback((note: string, time?: number) => {
    if (!isAudioStarted || !synthRef.current) return;
    
    try {
      (synthRef.current as Tone.PolySynth).triggerAttack(note, time);

      if (time !== undefined) {
        Tone.getDraw().schedule(() => {
          setActiveNotes(prev => new Set(prev).add(note));
          setLastNote(note);
        }, time);
      } else {
        setActiveNotes(prev => new Set(prev).add(note));
        setLastNote(note);
      }
    } catch (e) {
      console.error('[SonicAcademy] Error playing note:', e);
    }
  }, [isAudioStarted, instrument]);

  const releaseNote = useCallback((note: string, time?: number) => {
    if (!synthRef.current) return;
    
    try {
      (synthRef.current as Tone.PolySynth).triggerRelease(note, time);

      if (time !== undefined) {
        Tone.getDraw().schedule(() => {
          setActiveNotes(prev => {
            const next = new Set(prev);
            next.delete(note);
            return next;
          });
        }, time);
      } else {
        setActiveNotes(prev => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
      }
    } catch (e) {
      console.error('[SonicAcademy] Error releasing note:', e);
    }
  }, [instrument]);

  // Song Playback Logic
  const toggleSong = useCallback(() => {
    if (!currentSong || !isAudioStarted || !synthRef.current) return;

    if (isPlayingSong) {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      partRef.current?.stop();
      if (synthRef.current && 'releaseAll' in synthRef.current) {
        (synthRef.current as any).releaseAll();
      }
      setIsPlayingSong(false);
      setIsSongFinished(false);
      setActiveNotes(new Set());
      setActiveSongNoteIndex(-1);
    } else {
      if (partRef.current) partRef.current.dispose();
      Tone.getTransport().cancel();

      setActiveSongNoteIndex(0);
      
      // Calculate end time to schedule a stop
      const lastNote = currentSong.notes[currentSong.notes.length - 1];
      const endTime = lastNote.time + Tone.Time(lastNote.duration).toSeconds();

      partRef.current = new Tone.Part((time, value) => {
        const index = currentSong.notes.indexOf(value);
        
        // Trigger audio precisely at 'time'
        playNote(value.note, time);
        
        // Schedule release
        const durationSeconds = Tone.Time(value.duration).toSeconds();
        releaseNote(value.note, time + durationSeconds);

        // Update current note index visually
        Tone.getDraw().schedule(() => {
          setActiveSongNoteIndex(index);
        }, time);

      }, currentSong.notes).start(0);

      // Schedule the end of the song
      Tone.getTransport().schedule((time) => {
        Tone.getTransport().stop(time);
        if (synthRef.current && 'releaseAll' in synthRef.current) {
          (synthRef.current as any).releaseAll(time);
        }
        Tone.getDraw().schedule(() => {
          setIsPlayingSong(false);
          setIsSongFinished(true);
          setActiveSongNoteIndex(-1);
          setActiveNotes(new Set());
        }, time);
      }, endTime + 0.1);

      Tone.getTransport().start();
      setIsPlayingSong(true);
      setIsSongFinished(false);
    }
  }, [currentSong, isAudioStarted, isPlayingSong, playNote, releaseNote, instrument]);

  // Stop song if instrument, level, or song changes
  useEffect(() => {
    if (isPlayingSong) {
      Tone.getTransport().stop();
      Tone.getTransport().cancel();
      partRef.current?.stop();
      if (synthRef.current && 'releaseAll' in synthRef.current) {
        (synthRef.current as any).releaseAll();
      }
      setIsPlayingSong(false);
      setActiveNotes(new Set());
      setActiveSongNoteIndex(-1);
    }
    setIsSongFinished(false);
  }, [instrument, level, currentSong?.id]);

  // Recording Logic
  const startRecording = async () => {
    if (!recorderRef.current || isRecording) return;
    setIsRecording(true);
    setRecordedBlob(null);
    recorderRef.current.start();
  };

  const stopRecording = async () => {
    if (!recorderRef.current || !isRecording) return;
    const blob = await recorderRef.current.stop();
    setRecordedBlob(blob);
    setIsRecording(false);
  };

  const downloadRecording = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const anchor = document.createElement("a");
    anchor.download = `sonic-academy-recording-${Date.now()}.webm`;
    anchor.href = url;
    anchor.click();
  };

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = NOTE_MAP[e.key.toLowerCase()];
      if (note) {
        playNote(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = NOTE_MAP[e.key.toLowerCase()];
      if (note) {
        releaseNote(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playNote, releaseNote]);

  const startAudio = async () => {
    await Tone.start();
    setIsAudioStarted(true);
  };

  const getInstrumentIcon = (id: string) => {
    switch (id) {
      case 'piano': return <Piano className="w-4 h-4" />;
      case 'synth': return <Zap className="w-4 h-4" />;
      case 'pad': return <Cloud className="w-4 h-4" />;
      case 'lead': return <Music className="w-4 h-4" />;
      default: return <Music className="w-4 h-4" />;
    }
  };

  const handleAiTranscribe = async () => {
    if (!transcriptionUrl || isTranscribing) return;
    
    setIsTranscribing(true);
    setTranscriptionStatus("Analyzing melody for " + instrument + "...");
    console.log('[SonicAcademy] Starting AI Transcription for:', transcriptionUrl);
    
    try {
      const generatedSong = await transcribeSongFromLink(transcriptionUrl, level, instrument);
      if (generatedSong) {
        setSessionSongs(prev => [generatedSong, ...prev]);
        setCurrentSong(generatedSong);
        setTranscriptionStatus("Transcribed! Loading to library...");
        setTimeout(() => setTranscriptionStatus(null), 3000);
        console.log('[SonicAcademy] Transcription successful:', generatedSong.name);
      } else {
        setTranscriptionStatus("Failed to transcribe. Please try a different song.");
        setTimeout(() => setTranscriptionStatus(null), 4000);
      }
    } catch (e) {
      setTranscriptionStatus("Error connecting to transcription lab.");
      setTimeout(() => setTranscriptionStatus(null), 4000);
      console.error('[SonicAcademy] Transcription Error:', e);
    } finally {
      setIsTranscribing(false);
      setTranscriptionUrl("");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center gap-8">
      {/* Header Section */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter text-white">SONIC ACADEMY</h1>
          <p className="text-hardware-muted font-mono text-sm mt-1 tracking-widest uppercase">Interactive Music Learning Lab</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge 
            variant="outline" 
            className="px-3 py-1 font-bold border-2 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] bg-hardware-accent/20 border-hardware-accent text-hardware-accent"
          >
            <Trophy className="w-3 h-3 mr-2" />
            {level.toUpperCase()}
          </Badge>
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 hover:bg-white/10 rounded-md transition-colors text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="w-24 px-2">
              <Slider 
                value={[volume]} 
                min={-40} 
                max={0} 
                step={1} 
                onValueChange={(v) => setVolume(v[0])}
              />
            </div>
          </div>
        </div>
      </div>

      {!isAudioStarted ? (
        <Card className="w-full max-w-md hardware-widget overflow-hidden border-none">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-hardware-accent/10 rounded-full flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-hardware-accent" />
            </div>
            <CardTitle className="text-2xl">Ready to Play?</CardTitle>
            <CardDescription className="text-hardware-muted">Click below to initialize the audio engine and start your session.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <button 
              onClick={startAudio}
              className="w-full py-4 bg-hardware-accent hover:bg-hardware-accent/90 text-white rounded-lg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-hardware-accent/20 flex items-center justify-center gap-2"
            >
              INITIALIZE AUDIO <ChevronRight className="w-5 h-5" />
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="hardware-widget border-none shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-hardware-accent" />
                  <span className="mono-label">Acoustic Tuning</span>
                </div>
                <CardTitle className="text-xl">Tone & Pitch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="mono-label">Pitch Shift</Label>
                    <span className="text-xs font-mono text-hardware-accent">
                      {pitchShift > 0 ? `+${pitchShift}` : pitchShift} ST
                    </span>
                  </div>
                  <Slider 
                    value={[pitchShift]} 
                    min={-12} 
                    max={12} 
                    step={1} 
                    onValueChange={(v) => setPitchShift(v[0])}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-hardware-muted uppercase font-mono tracking-widest">
                    <span>-1 Octave</span>
                    <span>Standard</span>
                    <span>+1 Octave</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="mono-label">Instrument Tone</Label>
                    <span className="text-xs font-mono text-hardware-accent">
                      {Math.round((toneCutoff / 20000) * 100)}%
                    </span>
                  </div>
                  <Slider 
                    value={[toneCutoff]} 
                    min={200} 
                    max={20000} 
                    step={100} 
                    onValueChange={(v) => setToneCutoff(v[0])}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-hardware-muted uppercase font-mono tracking-widest">
                    <span>Muted</span>
                    <span>Balanced</span>
                    <span>Bright</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPitchShift(0);
                    setToneCutoff(20000);
                  }}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-[10px] font-bold uppercase tracking-[0.2em] text-hardware-muted hover:text-white transition-all"
                >
                  Reset to Native Defaults
                </button>
              </CardContent>
            </Card>

            <Card className="hardware-widget border-none shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-4 h-4 text-hardware-accent" />
                  <span className="mono-label">Configuration</span>
                </div>
                <CardTitle className="text-xl">Instrument & Level</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="mono-label">Select Instrument</Label>
                  <div className="flex flex-col gap-2">
                    {INSTRUMENTS.map((inst) => (
                      <div
                        key={inst.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setInstrument(inst.id as InstrumentType);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setInstrument(inst.id as InstrumentType);
                          }
                        }}
                        className={cn(
                          "flex items-center p-3 rounded-lg border transition-all gap-4 group w-full relative z-10 cursor-pointer outline-none",
                          instrument === inst.id 
                            ? "bg-hardware-accent border-hardware-accent text-white shadow-lg shadow-hardware-accent/20" 
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <div className={cn(
                          "p-2 rounded-full transition-colors",
                          instrument === inst.id ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
                        )}>
                          {getInstrumentIcon(inst.id)}
                        </div>
                        <div className="flex flex-col items-start flex-1">
                          <span className="text-sm font-bold uppercase tracking-wider">{inst.name}</span>
                          <span className={cn(
                            "text-xs leading-tight text-left",
                            instrument === inst.id ? "text-white" : "text-white/60"
                          )}>
                            {inst.description}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInstrumentInfo(inst);
                          }}
                          className={cn(
                            "p-2 rounded-md transition-all hover:bg-white/20",
                            instrument === inst.id ? "text-white" : "text-hardware-accent"
                          )}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="mono-label">Learning Level</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-hardware-muted uppercase font-mono">Key Map</span>
                      <button 
                        onClick={() => setShowKeyMap(!showKeyMap)}
                        className={cn(
                          "w-8 h-4 rounded-full transition-colors relative",
                          showKeyMap ? "bg-hardware-accent" : "bg-white/10"
                        )}
                      >
                        <motion.div 
                          animate={{ x: showKeyMap ? 16 : 0 }}
                          className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full"
                        />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {LEVELS.map(l => (
                      <button
                        key={l.id}
                        onClick={() => setLevel(l.id as any)}
                        className={cn(
                          "h-12 rounded-md text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 relative overflow-hidden",
                          level === l.id 
                            ? "bg-hardware-accent border-hardware-accent text-white shadow-lg shadow-hardware-accent/20" 
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/60"
                        )}
                      >
                        {level === l.id && (
                          <motion.div 
                            layoutId="level-glow"
                            className="absolute inset-0 bg-white/10"
                            initial={false}
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                        <span className="relative z-10">{l.name}</span>
                        <div className={cn(
                          "w-1 h-1 rounded-full relative z-10",
                          level === l.id ? "bg-white shadow-[0_0_5px_white]" : "bg-white/20"
                        )} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <Label className="mono-label">Guided Practice</Label>
                  <div className="flex gap-2">
                    <div key={`${level}-${instrument}`} className="flex-1">
                      <Select 
                        value={currentSong?.id || ""} 
                        onValueChange={(v) => {
                          console.log('[SonicAcademy] Song selected:', v);
                          const song = SONGS.find(s => s.id === v);
                          if (song) {
                            setCurrentSong(song);
                            setIsPlayingSong(false);
                            setIsSongFinished(false);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-white/10 border-white/20 text-white w-full focus:ring-hardware-accent h-12">
                          <SelectValue placeholder="Select a song..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1b1e] border-white/10 text-white">
                          {filteredSongs.length > 0 ? (
                            filteredSongs.map(song => (
                              <SelectItem key={song.id} value={song.id} className="cursor-pointer focus:bg-hardware-accent focus:text-white">
                                {song.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled className="text-hardware-muted text-center py-4">
                              No songs available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <button 
                      type="button"
                      onClick={toggleSong}
                      disabled={!currentSong}
                      className={cn(
                        "w-12 h-12 rounded-md transition-all shadow-lg flex items-center justify-center shrink-0 border border-white/10",
                        isPlayingSong ? "bg-hardware-accent text-white" : "bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                      )}
                    >
                      {isPlayingSong ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : isSongFinished ? (
                        <RotateCcw className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                  {currentSong && (
                    <div className="bg-hardware-accent/10 border border-hardware-accent/20 p-3 rounded-md flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-hardware-accent font-mono uppercase tracking-tighter">Active Session</span>
                        <span className="text-sm text-white font-bold">{currentSong.name}</span>
                      </div>
                      <Music className="w-4 h-4 text-hardware-accent" />
                    </div>
                  )}

                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                       <Sparkles className="w-3 h-3 text-hardware-accent" />
                       <Label className="mono-label">AI Learning Lab</Label>
                    </div>
                    <p className="text-xs text-hardware-muted italic mb-3">Paste a YouTube link or song name to generate a custom practice sequence.</p>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Song link..." 
                        value={transcriptionUrl}
                        onChange={(e) => setTranscriptionUrl(e.target.value)}
                        className="bg-white/5 border-white/20 text-white text-sm h-10 focus-visible:ring-hardware-accent"
                      />
                      <button 
                        onClick={handleAiTranscribe}
                        disabled={!transcriptionUrl || isTranscribing}
                        className={cn(
                          "px-3 rounded-md transition-all flex items-center justify-center",
                          isTranscribing ? "bg-white/10 text-white/40" : "bg-hardware-accent text-white hover:brightness-110 active:scale-95 shadow-lg shadow-hardware-accent/20"
                        )}
                      >
                        {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <LinkIcon className="w-4 h-4" />}
                      </button>
                    </div>
                    {transcriptionStatus && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-mono text-hardware-accent uppercase tracking-widest animate-pulse"
                      >
                        {transcriptionStatus}
                      </motion.p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Note Visualizer */}
            <Card className="hardware-widget border-none h-48 flex flex-col items-center justify-center relative overflow-hidden shadow-xl">
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", activeNotes.size > 0 ? "bg-hardware-accent animate-pulse" : "bg-white/10")} />
                <span className="mono-label">Output Signal</span>
              </div>

              <div className="absolute top-4 right-4 flex items-center gap-2">
                {isRecording && <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                <span className="mono-label">{isRecording ? "Recording..." : "Standby"}</span>
              </div>
              
              <AnimatePresence mode="wait">
                {level !== 'advanced' && lastNote && (
                  <motion.div
                    key={lastNote}
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.5, opacity: 0, y: -20 }}
                    className="flex flex-col items-center"
                  >
                    <div className="text-6xl font-black tracking-tighter text-hardware-accent leading-none">
                      {lastNote.replace('4', '').replace('5', '')}
                      <span className="text-xl align-top ml-1 opacity-50">
                        {lastNote.includes('4') ? '4' : '5'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="mono-label">Press Key:</span>
                      <Badge className="bg-white/20 text-white font-mono text-lg px-3 py-0.5">
                        {NOTE_TO_KEY_MAP[lastNote]?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="mt-4 flex gap-4 text-xs font-mono text-hardware-accent uppercase tracking-widest border-t border-white/10 pt-3">
                      <div className="flex flex-col items-center">
                        <span>Freq</span>
                        <span className="text-white font-bold">{Math.round(Tone.Frequency(lastNote).toFrequency())}Hz</span>
                      </div>
                      <div className="w-[1px] h-4 bg-white/5 self-center" />
                      <div className="flex flex-col items-center">
                        <span>Note</span>
                        <span className="text-white font-bold">{lastNote}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {level === 'advanced' && (
                <div className="text-center space-y-2">
                  <div className="flex justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: activeNotes.size > 0 ? [10, 30, 10] : 10 }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                        className="w-1 bg-hardware-accent rounded-full"
                      />
                    ))}
                  </div>
                  <span className="mono-label">Ear Training Mode</span>
                </div>
              )}
            </Card>
          </div>

          {/* Keyboard Panel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Song Sequence Display */}
            <AnimatePresence>
              {currentSong && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="hardware-widget border-none p-4 overflow-hidden relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <RotateCcw className={cn("w-3 h-3 text-hardware-accent", isPlayingSong && "animate-spin-slow")} />
                          <span className="mono-label">Song Sequence</span>
                        </div>
                        <div className="h-4 w-[1px] bg-white/10" />
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-xs text-hardware-muted uppercase font-mono">Native Key</span>
                            <span className="text-sm font-bold text-hardware-accent">{currentSong.key}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-hardware-muted uppercase font-mono">Native BPM</span>
                            <span className="text-sm font-bold text-white">{currentSong.suggestedBpm}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-6">
                      <div className="flex-1 flex flex-wrap gap-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-2">
                        {currentSong.notes.map((note, i) => (
                          <motion.div
                            key={`${note.note}-${note.time}-${i}`}
                            initial={false}
                            animate={{ 
                              scale: i === activeSongNoteIndex ? 1.05 : 1,
                              opacity: isPlayingSong 
                                ? (i === activeSongNoteIndex ? 1 : 0.3) 
                                : 0.8
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center w-[50px] h-14 rounded-md border transition-all shrink-0",
                              i === activeSongNoteIndex 
                                ? "bg-hardware-accent border-hardware-accent shadow-lg shadow-hardware-accent/20 z-10" 
                                : "bg-white/5 border-white/10"
                            )}
                          >
                            <span className={cn(
                              "text-base font-black",
                              i === activeSongNoteIndex ? "text-white" : "text-white/80"
                            )}>
                              {NOTE_TO_KEY_MAP[note.note]?.toUpperCase() || '?'}
                            </span>
                            <span className={cn(
                              "text-[8px] font-mono uppercase opacity-60",
                              i === activeSongNoteIndex ? "text-white" : "text-white/60"
                            )}>
                              {note.note}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      {/* Speed Control Panel */}
                      <div className="w-48 flex flex-col gap-3 border-l border-white/10 pl-6 py-1">
                        <p className="text-[10px] text-white/70 leading-relaxed">
                          Adjust playback speed: <span className="text-hardware-accent font-bold">.25, .5, .75, 1</span>.
                          <br />
                          <span className="text-[9px] opacity-50 italic">Do not exceed 1.0x</span>
                        </p>
                        
                        <div className="flex items-center gap-4 mt-auto">
                          <div className="flex flex-col gap-1">
                            {[1, 0.75, 0.5, 0.25].map(rate => (
                              <button
                                key={rate}
                                onClick={() => setPlaybackRate(rate)}
                                className={cn(
                                  "w-12 h-6 rounded flex items-center justify-center text-xs font-bold transition-all",
                                  playbackRate === rate 
                                    ? "bg-hardware-accent text-white shadow-md" 
                                    : "bg-white/5 text-white/40 hover:bg-white/10"
                                )}
                              >
                                {rate === 1 ? '1.0' : rate}x
                              </button>
                            ))}
                          </div>

                          {/* Vertical Speed Indicator (Wheel-like) */}
                          <div className="h-28 w-3 bg-white/5 rounded-full relative overflow-hidden border border-white/10 cursor-pointer group">
                            <motion.div 
                              initial={false}
                              animate={{ height: `${playbackRate * 100}%` }}
                              className="absolute bottom-0 left-0 right-0 bg-hardware-accent shadow-[0_0_10px_rgba(var(--accent-color-rgb),0.5)]"
                            />
                            {/* Visual segments */}
                            <div className="absolute inset-0 flex flex-col justify-between py-1 pointer-events-none opacity-20">
                              {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-full h-[1px] bg-white" />)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            <Card className="hardware-widget border-none p-6 shadow-2xl flex flex-col items-center justify-center gap-6">
              <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10">
                {!isRecording ? (
                  <button 
                    onClick={startRecording}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-white/10 rounded-lg transition-all text-sm font-black text-hardware-accent group"
                  >
                    <Circle className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" /> 
                    <span className="tracking-widest">START RECORDING</span>
                  </button>
                ) : (
                  <button 
                    onClick={stopRecording}
                    className="flex items-center gap-3 px-6 py-3 bg-hardware-accent text-white rounded-lg transition-all text-sm font-black shadow-lg shadow-hardware-accent/20 animate-pulse"
                  >
                    <Square className="w-4 h-4 fill-current" /> 
                    <span className="tracking-widest">STOP RECORDING</span>
                  </button>
                )}
                
                {recordedBlob && (
                  <button 
                    onClick={downloadRecording}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-white/10 rounded-lg transition-all text-sm font-black text-blue-400 border-l border-white/10"
                  >
                    <Download className="w-4 h-4" /> 
                    <span className="tracking-widest">EXPORT SESSION</span>
                  </button>
                )}
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-white/40">
                  <KeyboardIcon className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase tracking-[0.2em]">Physical Keyboard Active</span>
                </div>
                <p className="text-xs text-white/60 font-mono text-center max-w-xs leading-relaxed">
                  Use your computer keyboard to play notes. The virtual interface has been removed for a focused learning experience.
                </p>
              </div>

              <div className="w-full pt-6 border-t border-white/5 flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-hardware-accent shadow-lg shadow-hardware-accent/20" />
                  <span className="mono-label">System Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-hardware-accent shadow-lg shadow-hardware-accent/20" />
                  <span className="mono-label">MIDI Bridge Ready</span>
                </div>
              </div>
            </Card>

            {/* Keyboard Reference Card */}
            {showKeyMap && (
              <Card className="hardware-widget border-none p-4 space-y-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <KeyboardIcon className="w-4 h-4 text-hardware-accent" />
                  <span className="mono-label">Physical Key Map</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[9px] text-hardware-muted uppercase font-bold">Naturals (White Keys)</p>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {['A','S','D','F','G','H','J','K','L',';'].map(k => (
                        <div key={k} className="aspect-square bg-white/10 border border-white/20 rounded flex items-center justify-center text-[12px] font-mono font-bold text-white shadow-inner">{k}</div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] text-hardware-muted uppercase font-bold">Accidentals (Black Keys)</p>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {['W','E','T','Y','U','O','P'].map(k => (
                        <div key={k} className="aspect-square bg-hardware-accent/20 border border-hardware-accent/40 rounded flex items-center justify-center text-[12px] font-mono text-hardware-accent font-bold shadow-inner">{k}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4 py-8 border-t border-hardware-card/10">
        <div className="flex gap-6">
          <div className="space-y-1">
            <p className="mono-label">Engine</p>
            <p className="text-xs font-medium">Tone.js Web Audio</p>
          </div>
          <div className="space-y-1">
            <p className="mono-label">Latency</p>
            <p className="text-xs font-medium">~1.2ms (Optimized)</p>
          </div>
        </div>
        <p className="text-[10px] text-hardware-muted text-center md:text-right max-w-xs">
          Use your computer keyboard to play. Map: A-K for naturals, W-P for accidentals.
          Designed for Chrome, Safari, and Firefox.
        </p>
      </div>
      {/* Instrument Info Modal */}
      <AnimatePresence>
        {selectedInstrumentInfo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInstrumentInfo(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#111214] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
            >
              <div className="relative h-48 sm:h-64 overflow-hidden">
                <img 
                  src={selectedInstrumentInfo.imageUrl} 
                  alt={selectedInstrumentInfo.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111214] to-transparent" />
                <button
                  onClick={() => setSelectedInstrumentInfo(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-6 left-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-hardware-accent rounded-lg text-white">
                      {getInstrumentIcon(selectedInstrumentInfo.id)}
                    </div>
                    <Badge className="bg-hardware-accent/20 text-hardware-accent border-hardware-accent/60 uppercase text-xs font-bold">
                      Instrument Profile
                    </Badge>
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                    {selectedInstrumentInfo.name}
                  </h2>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-hardware-accent">
                      <History className="w-4 h-4" />
                      <span className="mono-label">Historical Background</span>
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed">
                      {selectedInstrumentInfo.history}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-hardware-accent">
                      <Users className="w-4 h-4" />
                      <span className="mono-label">Iconic Masters</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedInstrumentInfo.famousPlayers.map((player, i) => (
                        <div 
                          key={player}
                          className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-md group hover:border-hardware-accent/50 transition-all"
                        >
                          <div className="w-7 h-7 rounded-full bg-hardware-accent/10 flex items-center justify-center text-xs font-bold text-hardware-accent">
                            {i + 1}
                          </div>
                          <span className="text-sm font-medium text-white">{player}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => setSelectedInstrumentInfo(null)}
                    className="px-6 py-2 bg-hardware-accent text-white rounded-md font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-hardware-accent/20"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
