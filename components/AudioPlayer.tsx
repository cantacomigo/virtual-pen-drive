import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Howl } from 'howler';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Shuffle, Maximize2, ListMusic, Heart, Zap, Loader2, Crown, ChevronDown, MoreVertical
} from 'lucide-react';
import { useMusicStore } from '../store';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';
import Visualizer from './Visualizer';

const FREE_PLAYBACK_LIMIT = 50;

interface AudioPlayerProps {
  onQueueClick?: () => void;
  isQueueActive?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ onQueueClick, isQueueActive }) => {
  const { 
    currentTrack, isPlaying, volume, isMuted, repeat, playbackCount,
    setPlaying, togglePlay, playNext, playPrevious, setVolume, toggleMute, updateTrackDuration,
    likedTracks, toggleLikeTrack, incrementPlaybackCount
  } = useMusicStore((state) => state);
  const { currentUser } = useAuthStore((state) => state);
  
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const soundRef = useRef<Howl | null>(null);
  const rafRef = useRef<number | null>(null);

  const isPremium = currentUser?.plan === 'premium';
  const hasReachedLimit = !isPremium && playbackCount >= FREE_PLAYBACK_LIMIT;

  const cleanup = useCallback(() => {
    if (soundRef.current) {
      soundRef.current.off(); 
      soundRef.current.unload();
      soundRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  const syncDurationToDb = useCallback(async (trackId: string, d: number) => {
    if (!trackId || d <= 0) return;
    updateTrackDuration(trackId, d);
    if (currentTrack?.isLocal) {
      try {
        await supabase.from('tracks').update({ duration: d }).eq('id', trackId);
      } catch (err) {}
    }
  }, [currentTrack?.isLocal, updateTrackDuration]);

  const updatePosition = useCallback(() => {
    if (soundRef.current && soundRef.current.playing()) {
      // Cast to any to bypass strict parameter check on seek() getter
      setPosition((soundRef.current as any).seek() as number);
      rafRef.current = requestAnimationFrame(updatePosition);
    }
  }, []);

  useEffect(() => {
    if (!currentTrack) {
      cleanup();
      return;
    }

    if (hasReachedLimit) {
      setPlaying(false);
      cleanup();
      return;
    }

    cleanup();
    setIsBuffering(true);

    const sound = new Howl({
      src: [currentTrack.audio],
      html5: true, 
      preload: true,
      format: ['mp3', 'wav', 'ogg'],
      volume: isMuted ? 0 : volume,
      onplay: () => {
        setIsBuffering(false);
        setPlaying(true);
        const d = sound.duration();
        if (d > 0) setDuration(d);
        updatePosition();
        if (!isPremium) incrementPlaybackCount();
      },
      onload: () => {
        setIsBuffering(false);
        const d = sound.duration();
        if (d > 0) {
          setDuration(d);
          if (currentTrack.id && (!currentTrack.duration)) syncDurationToDb(currentTrack.id, d);
        }
      },
      onplayerror: () => {
        setIsBuffering(false);
        playNext();
      },
      onend: () => {
        const currentRepeat = useMusicStore.getState().repeat;
        if (currentRepeat === 'one') sound.play();
        else playNext();
      }
    });

    soundRef.current = sound;
    if (isPlaying) sound.play();

    return cleanup;
  }, [currentTrack?.id, cleanup, syncDurationToDb, updatePosition, playNext, hasReachedLimit, isPremium, incrementPlaybackCount]);

  useEffect(() => {
    if (soundRef.current) {
      const isCurrentlyPlaying = soundRef.current.playing();
      if (isPlaying && !isCurrentlyPlaying && !hasReachedLimit) soundRef.current.play();
      else if (!isPlaying && isCurrentlyPlaying) soundRef.current.pause();
    }
  }, [isPlaying, hasReachedLimit]);

  useEffect(() => {
    if (soundRef.current) soundRef.current.volume(isMuted ? 0 : volume);
  }, [volume, isMuted]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPosition(val);
    if (soundRef.current) soundRef.current.seek(val);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time < 0) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTrack) return null;

  const isLiked = likedTracks.some(t => t && t.id === currentTrack.id);
  const displayImage = currentTrack.track_image || currentTrack.album_image; // Usar track_image ou album_image

  return (
    <>
      {/* Mobile Mini Player */}
      <div 
        onClick={() => setIsExpanded(true)}
        className="lg:hidden fixed bottom-16 left-2 right-2 h-14 bg-zinc-900/90 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center px-3 z-40 animate-in slide-in-from-bottom-4 shadow-2xl"
      >
        <img src={displayImage} className="w-10 h-10 rounded-xl mr-3 object-cover shadow-lg" />
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-xs font-bold text-white truncate">{currentTrack.name}</p>
          <p className="text-[10px] text-zinc-400 truncate">{currentTrack.artist_name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleLikeTrack(currentTrack); }}
            className={`p-2 ${isLiked ? 'text-blue-500' : 'text-zinc-500'}`}
          >
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-10 h-10 flex items-center justify-center text-white"
          >
            {isBuffering ? <Loader2 size={18} className="animate-spin" /> : isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
        </div>
        <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${(position/duration)*100}%` }} />
      </div>

      {/* Desktop Player Bar */}
      <div className="hidden lg:flex h-24 bg-zinc-900 border-t border-zinc-800 px-6 items-center justify-between z-50 animate-in slide-in-from-bottom-full duration-300">
        <div className="flex items-center w-[30%]">
          <img src={displayImage} className="w-14 h-14 rounded-xl shadow-lg mr-4 object-cover" />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate">{currentTrack.name}</h4>
            <p className="text-xs text-zinc-400 truncate">{currentTrack.artist_name}</p>
          </div>
          <button onClick={() => toggleLikeTrack(currentTrack)} className={`ml-4 transition-colors ${isLiked ? 'text-blue-500' : 'text-zinc-400 hover:text-white'}`}>
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="flex flex-col items-center w-[40%]">
          {hasReachedLimit && (
            <div className="text-[10px] font-black bg-red-600 px-3 py-1 rounded-full mb-2 uppercase tracking-widest animate-pulse">Limite de 50 atingido</div>
          )}
          <div className="flex items-center space-x-6 mb-2">
            <button className="text-zinc-500 hover:text-white"><Shuffle size={18} /></button>
            <button onClick={playPrevious} className="text-zinc-500 hover:text-white"><SkipBack size={22} fill="currentColor" /></button>
            <button onClick={togglePlay} disabled={isBuffering || hasReachedLimit} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-all">
              {isBuffering ? <Loader2 size={20} className="animate-spin" /> : isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={playNext} className="text-zinc-500 hover:text-white"><SkipForward size={22} fill="currentColor" /></button>
            <button onClick={() => repeat === 'none' ? useMusicStore.getState().setRepeat('all') : repeat === 'all' ? useMusicStore.getState().setRepeat('one') : useMusicStore.getState().setRepeat('none')} className="relative">
              <Repeat size={18} className={repeat !== 'none' ? 'text-blue-500' : 'text-zinc-500'} />
              {repeat === 'one' && <span className="absolute text-[8px] font-black -top-1 -right-1">1</span>}
            </button>
          </div>
          <div className="flex items-center space-x-3 w-full">
            <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">{formatTime(position)}</span>
            <input type="range" min={0} max={duration || 100} step={0.1} value={position} onChange={handleSeek} className="flex-1 h-1 bg-zinc-700 rounded-full appearance-none accent-blue-500 cursor-pointer" />
            <span className="text-[10px] font-mono text-zinc-500 w-10">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end w-[30%] space-x-4">
          <div className="w-24 h-12">
             <Visualizer analyser={analyser} isActive={isPlaying && !isBuffering} />
          </div>
          <button onClick={onQueueClick} className={`transition-colors ${isQueueActive ? 'text-blue-500' : 'text-zinc-500 hover:text-white'}`}><ListMusic size={20} /></button>
          <div className="flex items-center space-x-2 w-28 group">
            <button onClick={toggleMute} className="text-zinc-500 hover:text-white">{isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
            <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-full appearance-none accent-blue-500" />
          </div>
          <button className="text-zinc-500 hover:text-white"><Maximize2 size={18} /></button>
        </div>
      </div>

      {/* Full Screen Player (Mobile Expanded) */}
      {isExpanded && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-gradient-to-b from-zinc-900 to-black p-6 flex flex-col animate-in slide-in-from-bottom-full duration-500">
          <header className="flex items-center justify-between mb-10 pt-4">
            <button onClick={() => setIsExpanded(false)} className="p-2 bg-white/5 rounded-full"><ChevronDown size={28} /></button>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Tocando de sua Biblioteca</p>
              <p className="text-xs font-bold text-white">{currentTrack.album_name}</p>
            </div>
            <button className="p-2"><MoreVertical size={24} /></button>
          </header>

          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="w-full aspect-square mb-12 shadow-2xl relative">
              <img src={displayImage} className="w-full h-full object-cover rounded-3xl" />
              <div className="absolute -bottom-8 left-0 right-0 h-24 opacity-30">
                <Visualizer analyser={analyser} isActive={isPlaying} />
              </div>
            </div>

            <div className="w-full flex items-center justify-between mb-8">
              <div className="min-w-0 pr-4">
                <h2 className="text-2xl font-black text-white truncate mb-1">{currentTrack.name}</h2>
                <p className="text-lg text-zinc-400 truncate">{currentTrack.artist_name}</p>
              </div>
              <button onClick={() => toggleLikeTrack(currentTrack)} className={isLiked ? 'text-blue-500' : 'text-zinc-500'}>
                <Heart size={32} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="w-full space-y-2 mb-10">
              <input type="range" min={0} max={duration || 100} step={0.1} value={position} onChange={handleSeek} className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none accent-blue-500" />
              <div className="flex justify-between text-[10px] font-black text-zinc-500 tracking-wider">
                <span>{formatTime(position)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between">
              <button className="text-zinc-500"><Shuffle size={24} /></button>
              <button onClick={playPrevious} className="text-white"><SkipBack size={44} fill="currentColor" /></button>
              <button onClick={togglePlay} className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black shadow-xl">
                {isPlaying ? <Pause size={38} fill="currentColor" /> : <Play size={38} fill="currentColor" className="ml-2" />}
              </button>
              <button onClick={playNext} className="text-white"><SkipForward size={44} fill="currentColor" /></button>
              <button className="text-zinc-500"><Repeat size={24} /></button>
            </div>
          </div>

          <footer className="mt-12 flex justify-between px-4 pb-4">
            <button className="text-zinc-500"><Zap size={20} /></button>
            <button onClick={() => { setIsExpanded(false); onQueueClick?.(); }} className="text-zinc-500"><ListMusic size={24} /></button>
          </footer>
        </div>
      )}
    </>
  );
};

export default AudioPlayer;