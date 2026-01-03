import React, { useState } from 'react';
import { Home, Search, Library, SquarePlus, Heart, Music, ListMusic, Trash2, Upload, Crown, Zap, Lock, MessageSquarePlus, Disc } from 'lucide-react'; // Importar Disc
import { useMusicStore } from '../store';
import { useAuthStore } from '../store/authStore';

const FREE_PLAYLIST_LIMIT = 3;

interface SidebarProps {
  onSearchClick: () => void;
  onHomeClick: () => void;
  onLibraryClick: () => void;
  onPremiumClick: () => void;
  onUploadClick: () => void;
  onLikedClick: () => void;
  onPlaylistClick: (id: string) => void;
  onRequestsClick: () => void;
  onAlbumManagementClick: () => void; // Novo prop
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onSearchClick, onHomeClick, onLibraryClick, onPremiumClick, onUploadClick, onLikedClick, onPlaylistClick, onRequestsClick, onAlbumManagementClick
}) => {
  const { playlists, createPlaylist, deletePlaylist, addNotification } = useMusicStore();
  const { currentUser } = useAuthStore();
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isPremium = currentUser?.plan === 'premium';
  const hasReachedPlaylistLimit = !isPremium && playlists.length >= FREE_PLAYLIST_LIMIT;

  const handleCreateRequest = () => {
    if (hasReachedPlaylistLimit) {
      addNotification("Limite de 3 playlists no Free!", "error");
      onPremiumClick();
      return;
    }
    setIsCreating(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="hidden lg:flex w-64 bg-black flex-col h-full border-r border-zinc-900 shrink-0 overflow-hidden">
      <div className="p-6">
        <h1 className="text-xl font-bold text-white flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full mr-2 flex items-center justify-center shrink-0">
            <Music className="text-white" size={20} />
          </div>
          <span className="truncate tracking-tighter">Virtual Pen-Drive</span>
        </h1>
      </div>

      <nav className="px-4 space-y-1">
        <button onClick={onHomeClick} className="w-full flex items-center text-zinc-400 hover:text-white px-3 py-2 transition-colors group">
          <Home className="mr-4 group-hover:scale-110 transition-transform group-hover:text-blue-500" />
          <span className="font-semibold">Início</span>
        </button>
        <button onClick={onSearchClick} className="w-full flex items-center text-zinc-400 hover:text-white px-3 py-2 transition-colors group">
          <Search className="mr-4 group-hover:scale-110 transition-transform group-hover:text-blue-500" />
          <span className="font-semibold">Buscar</span>
        </button>
        <button onClick={onLibraryClick} className="w-full flex items-center text-zinc-400 hover:text-white px-3 py-2 transition-colors group">
          <Library className="mr-4 group-hover:scale-110 transition-transform group-hover:text-blue-500" />
          <span className="font-semibold">Biblioteca</span>
        </button>
        <button onClick={onAlbumManagementClick} className="w-full flex items-center text-zinc-400 hover:text-white px-3 py-2 transition-colors group">
          <Disc className="mr-4 group-hover:scale-110 transition-transform group-hover:text-blue-500" />
          <span className="font-semibold">Álbuns</span>
        </button>
        <button onClick={onPremiumClick} className="w-full flex items-center text-yellow-500 hover:text-yellow-400 px-3 py-2 transition-colors group">
          <Crown className="mr-4 group-hover:scale-110 transition-transform" />
          <span className="font-semibold">Premium</span>
        </button>
      </nav>

      <div className="mt-8 px-4 space-y-4">
        {isAdmin ? (
          <button onClick={onUploadClick} className="w-full flex items-center text-zinc-400 hover:text-white px-3 py-2 group">
            <div className="w-6 h-6 bg-zinc-800 rounded-md mr-4 flex items-center justify-center group-hover:bg-zinc-700">
              <Upload size={14} className="text-white group-hover:text-blue-400" />
            </div>
            <span className="font-semibold">Enviar Música</span>
          </button>
        ) : (
          <button onClick={onRequestsClick} className="w-full flex items-center text-zinc-400 hover:text-white px-3 py-2 group">
            <div className="w-6 h-6 bg-purple-900/40 rounded-md mr-4 flex items-center justify-center group-hover:bg-purple-600">
              <MessageSquarePlus size={14} className="text-purple-400 group-hover:text-white" />
            </div>
            <span className="font-semibold">Pedir Música</span>
          </button>
        )}

        <button onClick={handleCreateRequest} className={`w-full flex items-center px-3 py-2 transition-colors group ${hasReachedPlaylistLimit ? 'text-zinc-600' : 'text-zinc-400 hover:text-white'}`}>
          <div className={`w-6 h-6 rounded-md mr-4 flex items-center justify-center ${hasReachedPlaylistLimit ? 'bg-zinc-900' : 'bg-zinc-800 group-hover:bg-zinc-700'}`}>
            {hasReachedPlaylistLimit ? <Lock size={12} className="text-zinc-500" /> : <SquarePlus size={14} className="text-white group-hover:text-blue-400" />}
          </div>
          <span className="font-semibold">Criar Playlist</span>
        </button>
        <button onClick={onLikedClick} className="w-full flex items-center text-zinc-400 hover:text-white px-3 py-2 group">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-700 to-indigo-500 rounded-md mr-4 flex items-center justify-center">
            <Heart size={14} className="text-white fill-current" />
          </div>
          <span className="font-semibold">Músicas Curtidas</span>
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-900 flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
        {isCreating && (
          <form onSubmit={handleCreate} className="mb-4">
            <input autoFocus className="w-full bg-zinc-800 border border-zinc-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="Nome da playlist..." value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} onBlur={() => !newPlaylistName && setIsCreating(false)} />
          </form>
        )}
        <div className="space-y-1">
          {playlists.map((playlist) => (
            <div key={playlist.id} onClick={() => onPlaylistClick(playlist.id)} className="group flex items-center justify-between text-zinc-400 hover:text-white cursor-pointer px-3 py-2 rounded-xl hover:bg-zinc-900/50 transition-all">
              <div className="flex items-center truncate">
                <ListMusic size={16} className="mr-3 shrink-0 group-hover:text-blue-500" />
                <span className="text-sm truncate font-medium">{playlist.name}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); if(confirm(`Excluir playlist?`)) deletePlaylist(playlist.id); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      {!isPremium ? (
        <div className="p-4 m-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl">
          <p className="text-[10px] font-black text-white/70 mb-2 uppercase">Upgrade agora</p>
          <button onClick={onPremiumClick} className="w-full bg-white text-black text-[11px] font-black py-2 rounded-xl hover:scale-105 transition-transform">VER PLANOS</button>
        </div>
      ) : (
        <div className="p-4 m-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-[10px] font-black text-blue-500 mb-1 flex items-center gap-2 uppercase tracking-widest"><Zap size={10} /> Premium</p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;