import React, { useState, useRef } from 'react';
import { 
  Play, Pause, MoreVertical, Heart, Download, 
  ListMusic, Music as MusicIcon, Trash2, Lock, ListPlus, FolderPlus, Loader2, X, ImageIcon 
} from 'lucide-react';
import { JamendoTrack } from '../types';
import { useMusicStore } from '../store';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

interface TrackItemProps {
  track: JamendoTrack & { playlistContextId?: string };
  index?: number;
}

const TrackItem: React.FC<TrackItemProps> = ({ track, index }) => {
  const { 
    currentTrack, isPlaying, setCurrentTrack, togglePlay, 
    addToQueue, playNextInQueue, playlists, addToPlaylist,
    likedTracks, toggleLikeTrack, removeFromPlaylist, addNotification,
    updateTrackImage // Adicionar updateTrackImage
  } = useMusicStore();
  const { currentUser } = useAuthStore();
  
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!track) return null;
  
  const isCurrent = currentTrack?.id === track.id;
  const isLiked = likedTracks.some(t => t && t.id === track.id);
  const isPremium = currentUser?.plan === 'premium';
  
  // Determina qual imagem usar: track_image se existir, senão album_image
  const displayImage = track.track_image || track.album_image;

  const handlePlayClick = () => {
    if (isCurrent) togglePlay();
    else setCurrentTrack(track);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isPremium) {
      addNotification("Premium exigido para download!", "error");
      return;
    }

    try {
      setIsDownloading(true);
      addNotification(`Iniciando download...`, 'info');
      
      const response = await fetch(track.audiodownload);
      if (!response.ok) throw new Error('Falha ao obter arquivo do servidor');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const safeName = track.name.replace(/[/\\?%*:|"<>]/g, '').trim();
      const safeArtist = track.artist_name.replace(/[/\\?%*:|"<>]/g, '').trim();
      link.setAttribute('download', `${safeName} - ${safeArtist}.mp3`);
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(url);
      }, 100);
      
      addNotification(`Download concluído!`, 'success');
      setShowOptionsMenu(false);
    } catch (err) {
      addNotification("Erro ao baixar. Verifique sua conexão.", "error");
      console.error("Erro no download:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // A funcionalidade de alterar capa individual da música será removida daqui
  // e centralizada no AlbumManagement para capas de álbum.
  // Se o usuário quiser uma imagem específica para a faixa, ele terá que fazer upload junto com a música.

  return (
    <div className={`group flex items-center p-3 rounded-2xl lg:rounded-xl transition-all cursor-pointer border border-transparent hover:bg-zinc-800/80 active:bg-zinc-800/50 ${isCurrent ? 'bg-zinc-800/40 shadow-lg' : ''}`}>
      <div className="w-8 flex items-center justify-center text-zinc-500 font-bold text-[10px] shrink-0">
        {isCurrent && isPlaying ? (
          <div className="flex items-end gap-0.5 h-3">
            <div className="w-1 bg-blue-500 animate-[bounce_0.6s_infinite]" />
            <div className="w-1 bg-blue-500 animate-[bounce_0.8s_infinite]" />
            <div className="w-1 bg-blue-500 animate-[bounce_0.7s_infinite]" />
          </div>
        ) : (index !== undefined ? index + 1 : <MusicIcon size={12} />)}
      </div>

      <div className="relative shrink-0 mx-2" onClick={handlePlayClick}>
        <img src={displayImage} alt={track.name} className="w-11 h-11 rounded-lg object-cover shadow-lg" />
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0'}`}>
          {isCurrent && isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
        </div>
      </div>
      
      <div className="flex-1 min-w-0 px-2" onClick={handlePlayClick}>
        <p className={`font-bold truncate text-sm ${isCurrent ? 'text-blue-500' : 'text-zinc-100'}`}>{track.name}</p>
        <p className="text-[10px] lg:text-xs text-zinc-500 truncate">{track.artist_name}</p>
      </div>

      <div className="hidden lg:block flex-1 text-xs text-zinc-600 truncate px-4">{track.album_name}</div>

      <div className="flex items-center gap-1 lg:gap-2 pr-1">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLikeTrack(track); }} 
          className={`p-2 transition-all hover:scale-110 active:scale-90 ${isLiked ? 'text-blue-500' : 'text-zinc-600 hover:text-white'}`}
        >
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
        </button>

        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowOptionsMenu(!showOptionsMenu); }} 
            className={`p-2 transition-all rounded-full ${showOptionsMenu ? 'text-white bg-zinc-700' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
          >
            <MoreVertical size={20} />
          </button>
          
          {showOptionsMenu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => { setShowOptionsMenu(false); setShowPlaylistMenu(false); }} />
              <div className="absolute right-0 bottom-full lg:bottom-auto lg:top-full mb-2 lg:mb-0 lg:mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[70] p-1.5 animate-in fade-in zoom-in-95 duration-200">
                <button onClick={(e) => { e.stopPropagation(); playNextInQueue(track); setShowOptionsMenu(false); }} className="w-full flex items-center px-4 py-3 text-sm hover:bg-zinc-800 rounded-xl transition-all text-blue-500 font-bold"><ListMusic size={16} className="mr-3" /> Tocar a seguir</button>
                <button onClick={(e) => { e.stopPropagation(); addToQueue(track); setShowOptionsMenu(false); }} className="w-full flex items-center px-4 py-3 text-sm hover:bg-zinc-800 rounded-xl transition-all"><ListPlus size={16} className="mr-3" /> Adicionar à fila</button>
                <button onClick={(e) => { e.stopPropagation(); setShowPlaylistMenu(!showPlaylistMenu); }} className={`w-full flex items-center px-4 py-3 text-sm hover:bg-zinc-800 rounded-xl transition-all ${showPlaylistMenu ? 'bg-zinc-800 text-white' : ''}`}><FolderPlus size={16} className="mr-3" /> Add à Playlist</button>
                
                <button onClick={handleDownload} disabled={isDownloading} className="w-full flex items-center px-4 py-3 text-sm hover:bg-zinc-800 rounded-xl transition-all disabled:opacity-50">
                  {isDownloading ? <Loader2 size={16} className="mr-3 animate-spin text-blue-500" /> : <Download size={16} className="mr-3" />}
                  Download {isPremium ? '' : ' (Premium)'}
                </button>
                {track.playlistContextId && (
                  <button onClick={(e) => { e.stopPropagation(); removeFromPlaylist(track.playlistContextId!, track.id); setShowOptionsMenu(false); }} className="w-full flex items-center px-4 py-3 text-sm hover:bg-red-500/10 text-red-500 rounded-xl transition-all border-t border-zinc-800 mt-1 pt-3">
                    <Trash2 size={16} className="mr-3" /> Remover da Playlist
                  </button>
                )}
              </div>
            </>
          )}

          {showPlaylistMenu && showOptionsMenu && (
             <div className="absolute right-full mr-2 top-0 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-[80] p-1.5 animate-in slide-in-from-right-2 duration-200">
                <div className="px-3 py-2 text-[9px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800 mb-1 flex items-center justify-between">
                  Suas Playlists
                  <X size={12} className="cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); setShowPlaylistMenu(false); }} />
                </div>
                <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
                  {playlists.length > 0 ? playlists.map(p => (
                    <button 
                      key={p.id} 
                      onClick={(e) => { e.stopPropagation(); addToPlaylist(p.id, track); setShowPlaylistMenu(false); setShowOptionsMenu(false); }} 
                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-blue-600 hover:text-white rounded-lg transition-all truncate font-bold"
                    >
                      {p.name}
                    </button>
                  )) : <div className="p-3 text-[10px] italic text-zinc-600 text-center">Nenhuma playlist</div>}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackItem;