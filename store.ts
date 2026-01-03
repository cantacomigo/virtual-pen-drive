import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { JamendoTrack, Playlist, PlaybackState } from './types';
import { supabase } from './services/supabase';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface MusicStore extends PlaybackState {
  notifications: Notification[];
  addNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeNotification: (id: string) => void;
  setCurrentTrack: (track: JamendoTrack | null) => void;
  setQueue: (tracks: JamendoTrack[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  addToQueue: (track: JamendoTrack) => void;
  playNextInQueue: (track: JamendoTrack) => void;
  removeFromQueue: (trackId: string) => void;
  togglePlay: () => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setRepeat: (repeat: 'none' | 'one' | 'all') => void;
  playNext: () => void;
  playPrevious: () => void;
  toggleLikeTrack: (track: JamendoTrack) => void;
  addToHistory: (track: JamendoTrack) => void;
  addUploadedTrack: (track: JamendoTrack) => void;
  removeUploadedTrack: (trackId: string) => void;
  updateTrackDuration: (trackId: string, duration: number) => void;
  updateTrackImage: (trackId: string, imageUrl: string) => void; // Nova ação
  createPlaylist: (name: string) => void;
  updatePlaylistImage: (playlistId: string, imageUrl: string) => void;
  addToPlaylist: (playlistId: string, track: JamendoTrack) => void;
  removeFromPlaylist: (playlistId: string, trackId: string) => void;
  deletePlaylist: (playlistId: string) => void;
  incrementPlaybackCount: () => void;
  resetPlaybackCount: () => void;
  syncPlaylists: (userId: string) => Promise<void>;
}

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      history: [],
      likedTracks: [],
      uploadedTracks: [],
      isPlaying: false,
      volume: 0.7,
      isMuted: false,
      repeat: 'none',
      playlists: [],
      notifications: [],
      playbackCount: 0,

      addNotification: (message, type = 'success') => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
          notifications: [...state.notifications, { id, message, type }]
        }));
        setTimeout(() => get().removeNotification(id), 5000);
      },

      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),

      incrementPlaybackCount: () => set((state) => ({ playbackCount: state.playbackCount + 1 })),
      resetPlaybackCount: () => set({ playbackCount: 0 }),

      setCurrentTrack: (track) => {
        if (track) {
          const { history } = get();
          const filteredHistory = history.filter(t => t.id !== track.id);
          set({ 
            currentTrack: track, 
            isPlaying: true,
            history: [track, ...filteredHistory].slice(0, 20)
          });
        } else {
          set({ currentTrack: null, isPlaying: false });
        }
      },

      setQueue: (tracks) => set({ queue: tracks }),
      setPlaylists: (playlists) => set({ playlists }),

      addToQueue: (track) => {
        const { queue, currentTrack, addNotification } = get();
        if (!currentTrack) {
          set({ currentTrack: track, isPlaying: true, queue: [track] });
          addNotification(`Tocando agora: ${track.name}`);
          return;
        }
        
        if (!queue.find(t => t.id === track.id)) {
          set({ queue: [...queue, track] });
          addNotification(`Adicionado à fila: ${track.name}`);
        } else {
          addNotification(`Já está na fila: ${track.name}`);
        }
      },

      playNextInQueue: (track) => {
        const { queue, currentTrack, addNotification } = get();
        
        if (!currentTrack) {
          set({ currentTrack: track, isPlaying: true, queue: [track] });
          addNotification(`Tocando agora: ${track.name}`);
          return;
        }

        const filteredQueue = queue.filter(t => t.id !== track.id);
        const currentIndex = filteredQueue.findIndex(t => t.id === currentTrack.id);
        
        const newQueue = [...filteredQueue];
        newQueue.splice(currentIndex + 1, 0, track);
        
        set({ queue: newQueue });
        addNotification(`Tocar a seguir: ${track.name}`, 'info');
      },

      removeFromQueue: (trackId) => {
        const { queue } = get();
        set({ queue: queue.filter(t => t.id !== trackId) });
      },

      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setPlaying: (isPlaying) => set({ isPlaying }),
      setVolume: (volume) => set({ volume }),
      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setRepeat: (repeat) => set({ repeat }),

      playNext: () => {
        const { queue, currentTrack, repeat } = get();
        if (queue.length === 0) return;
        
        const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
        let nextIndex = currentIndex + 1;

        if (nextIndex >= queue.length) {
          if (repeat === 'all') nextIndex = 0;
          else {
            set({ isPlaying: false });
            return;
          }
        }
        
        set({ currentTrack: queue[nextIndex], isPlaying: true });
      },

      playPrevious: () => {
        const { queue, currentTrack } = get();
        if (queue.length === 0) return;

        const currentIndex = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : -1;
        let prevIndex = currentIndex - 1;

        if (prevIndex < 0) {
          prevIndex = queue.length - 1;
        }

        set({ currentTrack: queue[prevIndex], isPlaying: true });
      },

      toggleLikeTrack: (track) => {
        const { likedTracks, addNotification } = get();
        const isLiked = likedTracks.some(t => t.id === track.id);
        
        if (isLiked) {
          set({ likedTracks: likedTracks.filter(t => t.id !== track.id) });
          addNotification(`Removida das curtidas: ${track.name}`);
        } else {
          set({ likedTracks: [track, ...likedTracks] });
          addNotification(`Adicionada às curtidas: ${track.name}`);
        }
      },

      addToHistory: (track) => {
        const { history } = get();
        const filteredHistory = history.filter(t => t.id !== track.id);
        set({ history: [track, ...filteredHistory].slice(0, 20) });
      },

      addUploadedTrack: (track) => {
        set((state) => ({
          uploadedTracks: [track, ...state.uploadedTracks]
        }));
      },

      removeUploadedTrack: (trackId) => {
        set((state) => ({
          uploadedTracks: state.uploadedTracks.filter(t => t.id !== trackId)
        }));
      },

      updateTrackDuration: (trackId, duration) => {
        set((state) => ({
          uploadedTracks: state.uploadedTracks.map(t => 
            t.id === trackId ? { ...t, duration } : t
          ),
          currentTrack: state.currentTrack?.id === trackId 
            ? { ...state.currentTrack, duration } 
            : state.currentTrack
        }));
      },

      updateTrackImage: (trackId, imageUrl) => {
        set((state) => ({
          uploadedTracks: state.uploadedTracks.map(t => 
            t.id === trackId ? { ...t, album_image: imageUrl } : t
          ),
          currentTrack: state.currentTrack?.id === trackId 
            ? { ...state.currentTrack, album_image: imageUrl } 
            : state.currentTrack,
          history: state.history.map(t => 
            t.id === trackId ? { ...t, album_image: imageUrl } : t
          ),
          likedTracks: state.likedTracks.map(t => 
            t.id === trackId ? { ...t, album_image: imageUrl } : t
          ),
          playlists: state.playlists.map(p => ({
            ...p,
            tracks: p.tracks.map(t => 
              t.id === trackId ? { ...t, album_image: imageUrl } : t
            )
          }))
        }));
      },

      createPlaylist: (name) => set((state) => ({
        playlists: [...state.playlists, {
          id: Math.random().toString(36).substr(2, 9),
          name,
          tracks: [],
          createdAt: Date.now()
        }]
      })),

      updatePlaylistImage: (playlistId, imageUrl) => {
        set((state) => ({
          playlists: state.playlists.map(p => 
            p.id === playlistId ? { ...p, image: imageUrl } : p
          )
        }));
      },

      addToPlaylist: (playlistId, track) => {
        const { playlists, addNotification } = get();
        const playlist = playlists.find(p => p.id === playlistId);
        if (playlist && !playlist.tracks.find(t => t.id === track.id)) {
          set((state) => ({
            playlists: state.playlists.map(p => 
              p.id === playlistId ? { ...p, tracks: [...p.tracks, track] } : p
            )
          }));
          addNotification(`Adicionado à playlist "${playlist.name}"`);
        } else {
          addNotification(`Já está na playlist "${playlist?.name}"`);
        }
      },

      removeFromPlaylist: (playlistId, trackId) => set((state) => ({
        playlists: state.playlists.map(p => {
          if (p.id === playlistId) {
            return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
          }
          return p;
        })
      })),

      deletePlaylist: (playlistId) => set((state) => ({
        playlists: state.playlists.filter(p => p.id !== playlistId)
      })),

      syncPlaylists: async (userId) => {
        const { playlists } = get();
        if (!userId) return;

        try {
          // Deleta as antigas para evitar duplicatas órfãs (estratégia simples)
          // Em um sistema real poderíamos fazer upsert complexo
          const { error: deleteError } = await supabase
            .from('playlists')
            .delete()
            .eq('user_id', userId);

          if (deleteError) throw deleteError;

          if (playlists.length > 0) {
            const dbPlaylists = playlists.map(p => ({
              id: p.id,
              user_id: userId,
              name: p.name,
              tracks: p.tracks,
              image: p.image || null,
              created_at: new Date(p.createdAt).toISOString()
            }));

            const { error: insertError } = await supabase
              .from('playlists')
              .insert(dbPlaylists);

            if (insertError) throw insertError;
          }
          console.debug("Playlists sincronizadas com sucesso.");
        } catch (err) {
          console.error("Erro ao sincronizar playlists:", err);
        }
      }
    }),
    {
      name: 'nova-music-storage',
      partialize: (state) => ({
        playlists: state.playlists,
        history: state.history,
        likedTracks: state.likedTracks,
        volume: state.volume,
        repeat: state.repeat,
        playbackCount: state.playbackCount
      }),
    }
  )
);