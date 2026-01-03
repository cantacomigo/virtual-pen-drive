
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from './components/Sidebar';
import AudioPlayer from './components/AudioPlayer';
import TrackItem from './components/TrackItem';
import AuthScreen from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import PremiumPlans from './components/PremiumPlans';
import UploadModal from './components/UploadModal';
import UserRequests from './components/UserRequests';
import { useMusicStore } from './store';
import { useAuthStore } from './store/authStore';
import { supabase } from './services/supabase';
import { 
  Search, ChevronLeft, ChevronRight, Play, Upload, LogOut, ShieldAlert, 
  Music as MusicIcon, Clock, CheckCircle2, Disc, Heart, AlertTriangle, 
  ListMusic, X, SlidersHorizontal, Settings, 
  Mail, Award, UserCheck, Calendar, Filter, Eraser, User as UserIcon, Library, Tag,
  ListPlus, Home, UserRound, LayoutGrid, CalendarDays, History, Sparkles
} from 'lucide-react';
import { JamendoTrack } from './types';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'search' | 'library' | 'admin' | 'premium' | 'liked' | 'playlist' | 'queue' | 'profile' | 'requests'>('home');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState('Tudo');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAlbumLoading, setIsAlbumLoading] = useState<string | null>(null);
  
  // Advanced Search Filters
  const [searchArtist, setSearchArtist] = useState('');
  const [searchAlbum, setSearchAlbum] = useState('');
  const [searchGenre, setSearchGenre] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Profile editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  
  const { 
    currentTrack, queue, setQueue, setCurrentTrack, 
    notifications, removeNotification, addNotification, 
    likedTracks, playlists, removeFromPlaylist, removeFromQueue,
    playNextInQueue, addToQueue, syncPlaylists
  } = useMusicStore((state) => state);
  const { currentUser, logout, checkSession, updateProfile, isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentUser) {
        syncPlaylists(currentUser.id);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentUser, syncPlaylists]);

  useEffect(() => {
    if (currentUser) setNewName(currentUser.name);
  }, [currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      if (searchQuery && !['admin', 'premium', 'queue', 'profile', 'requests'].includes(view)) setView('search');
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, view]);

  // Músicas disponíveis
  const { data: allTracks, refetch: refetchAllTracks, isLoading: isAllTracksLoading } = useQuery({
    queryKey: ['all-tracks', currentUser?.id, currentUser?.role], 
    queryFn: async () => {
      // Safety check for TS
      if (!currentUser) return [];

      // INÍCIO DA QUERY SEGURA
      let query = supabase
        .from('tracks')
        .select('id, name, artist_name, album_name, album_image, audio_url, format, duration, created_at, genre, year');
      
      // Se NÃO for admin, força o filtro para trazer apenas as músicas DESTE usuário.
      // Isso é uma camada extra de segurança além do RLS do banco de dados.
      if (currentUser.role !== 'admin') {
        query = query.eq('user_id', currentUser.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro Supabase:", error);
        return [];
      }
      
      return data?.map(t => ({
        id: t.id,
        name: t.name,
        artist_name: t.artist_name,
        album_name: t.album_name || 'Upload Local',
        album_image: t.album_image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300",
        audio: t.audio_url,
        audiodownload: t.audio_url,
        duration: t.duration || 0,
        format: t.format || 'mp3',
        genre: t.genre || '',
        year: t.year || '',
        artist_id: 'local-artist',
        album_id: 'local-album',
        isLocal: true
      })) || [];
    },
    enabled: !!currentUser
  });

  // Gêneros extraídos dinamicamente
  const dynamicGenres = useMemo(() => {
    if (!allTracks) return ['Tudo'];
    const genres = new Set<string>();
    genres.add('Tudo');
    allTracks.forEach(track => {
      if (track.genre && track.genre.trim()) {
        const gList = track.genre.split(/[,/]+/).map(g => g.trim());
        gList.forEach(g => {
           if (g) genres.add(g.charAt(0).toUpperCase() + g.slice(1).toLowerCase());
        });
      }
    });
    return Array.from(genres);
  }, [allTracks]);

  // Busca álbuns locais
  const { data: localAlbums, isLoading: isLocalAlbumsLoading } = useQuery({
    queryKey: ['local-albums', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      // Query segura para álbuns também
      let query = supabase
        .from('tracks')
        .select('album_name, album_image, artist_name')
        .not('album_name', 'is', null);

      if (currentUser.role !== 'admin') {
        query = query.eq('user_id', currentUser.id);
      }
      
      const { data, error } = await query;
      
      if (error) return [];
      
      const albumsMap = new Map();
      
      data.forEach(track => {
        if (!track.album_name) return;
        
        const cleanAlbum = track.album_name.trim();
        const cleanArtist = track.artist_name ? track.artist_name.trim() : 'Desconhecido';
        
        const key = cleanAlbum.toLowerCase(); 
        
        if (!albumsMap.has(key)) {
          albumsMap.set(key, {
            id: `local-${key}`,
            name: cleanAlbum, 
            artist_name: cleanArtist,
            image: track.album_image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300",
            isLocal: true
          });
        } else {
          const existing = albumsMap.get(key);
          if (existing.artist_name !== 'Vários Artistas' && existing.artist_name.toLowerCase() !== cleanArtist.toLowerCase()) {
            existing.artist_name = 'Vários Artistas';
          }
        }
      });
      return Array.from(albumsMap.values());
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!currentUser
  });

  const filteredTracks = useMemo(() => {
    if (!allTracks) return [];
    if (selectedFilter === 'Tudo') return allTracks;
    const term = selectedFilter.toLowerCase();
    return allTracks.filter(t => t.genre?.toLowerCase().includes(term));
  }, [allTracks, selectedFilter]);

  const handleAlbumPlay = async (album: any) => {
    if (!album || !currentUser) return;
    try {
      setIsAlbumLoading(album.id);
      
      let query = supabase
        .from('tracks')
        .select('*')
        .ilike('album_name', album.name);
      
      if (currentUser.role !== 'admin') {
        query = query.eq('user_id', currentUser.id);
      }

      const { data, error } = await query.order('created_at', { ascending: true });
          
      if (error) throw error;
      
      const tracks = data.map(t => ({
        id: t.id,
        name: t.name,
        artist_name: t.artist_name,
        album_name: t.album_name,
        album_image: t.album_image,
        audio: t.audio_url,
        audiodownload: t.audio_url,
        duration: t.duration || 0,
        format: t.format || 'mp3',
        genre: t.genre,
        year: t.year,
        artist_id: 'local-artist',
        album_id: 'local-album',
        isLocal: true
      }));

      if (tracks && tracks.length > 0) {
        setQueue(tracks);
        setCurrentTrack(tracks[0]);
        addNotification(`Tocando álbum: ${album.name}`);
      }
    } catch (error) {
      console.error("Erro ao carregar álbum:", error);
    } finally {
      setIsAlbumLoading(null);
    }
  };

  const combinedSearchResults = useMemo(() => {
    const term = debouncedSearch.toLowerCase();
    const artistTerm = searchArtist.toLowerCase();
    const albumTerm = searchAlbum.toLowerCase();
    const genreTerm = searchGenre.toLowerCase();
    const yearTerm = searchYear.toLowerCase();
    const activePillFilter = selectedFilter === 'Tudo' ? '' : selectedFilter.toLowerCase();

    if (!term && !artistTerm && !albumTerm && !genreTerm && !yearTerm && !activePillFilter) return [];

    return (allTracks || []).filter(t => {
      const matchText = !term || (t.name.toLowerCase().includes(term) || t.artist_name.toLowerCase().includes(term));
      const matchArtist = !artistTerm || t.artist_name.toLowerCase().includes(artistTerm);
      const matchAlbum = !albumTerm || (t.album_name && t.album_name.toLowerCase().includes(albumTerm));
      const matchGenreInput = !genreTerm || (t.genre && t.genre.toLowerCase().includes(genreTerm));
      const matchYearInput = !yearTerm || (t.year && t.year.toString().includes(yearTerm));
      const matchGenrePill = !activePillFilter || (t.genre && t.genre.toLowerCase().includes(activePillFilter));
      return matchText && matchArtist && matchAlbum && matchGenreInput && matchGenrePill && matchYearInput;
    });
  }, [debouncedSearch, allTracks, searchArtist, searchAlbum, searchGenre, searchYear, selectedFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchArtist) count++;
    if (searchAlbum) count++;
    if (searchGenre) count++;
    if (searchYear) count++;
    return count;
  }, [searchArtist, searchAlbum, searchGenre, searchYear]);

  const handleSaveProfile = async () => {
    if (!newName.trim()) return;
    const res = await updateProfile(newName.trim());
    if (res.success) {
      addNotification('Perfil atualizado!');
      setIsEditingName(false);
    }
  };

  const clearAdvancedFilters = () => {
    setSearchArtist('');
    setSearchAlbum('');
    setSearchGenre('');
    setSearchYear('');
    setSelectedFilter('Tudo');
    setSearchQuery('');
    addNotification('Busca reiniciada', 'info');
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium animate-pulse text-blue-500 tracking-widest uppercase text-[10px]">Virtual Pen-Drive</p>
      </div>
    );
  }

  if (!currentUser) return <AuthScreen />;

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex flex-col h-screen bg-black text-white selection:bg-blue-500/30 overflow-hidden">
      {/* Toast Notifications */}
      <div className="fixed top-6 lg:top-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center pointer-events-none gap-2 w-[90%] lg:w-auto">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className="flex items-center gap-3 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 pointer-events-auto w-full lg:w-auto"
          >
            <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
            <span className="text-sm font-semibold truncate">{notification.message}</span>
            <button onClick={() => removeNotification(notification.id)} className="ml-auto p-1 text-zinc-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          onHomeClick={() => { setView('home'); setSearchQuery(''); clearAdvancedFilters(); }}
          onSearchClick={() => setView('search')}
          onLibraryClick={() => setView('library')}
          onPremiumClick={() => setView('premium')}
          onUploadClick={() => setIsUploadModalOpen(true)}
          onLikedClick={() => setView('liked')}
          onPlaylistClick={(id) => { setSelectedPlaylistId(id); setView('playlist'); }}
          onRequestsClick={() => setView('requests')}
        />
        
        <main className="flex-1 flex flex-col bg-gradient-to-b from-zinc-900/50 to-black overflow-y-auto relative no-scrollbar">
          {/* Header Responsivo */}
          <header className="sticky top-0 z-30 flex flex-col bg-zinc-950/80 backdrop-blur-3xl border-b border-white/5">
            <div className="flex items-center justify-between p-4 lg:p-6">
              <div className="flex items-center space-x-3 lg:space-x-4 flex-1">
                <div className="hidden lg:flex space-x-2">
                  <button onClick={() => setView('home')} className="p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors"><ChevronLeft size={20} /></button>
                  <button className="p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors opacity-50"><ChevronRight size={20} /></button>
                </div>
                <div className="relative group flex items-center flex-1 lg:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onFocus={() => { if(!['queue', 'profile', 'admin'].includes(view)) setView('search'); }}
                    placeholder="Encontre suas músicas..." 
                    className="bg-zinc-800/40 border border-zinc-700/40 rounded-2xl py-3 pl-12 pr-4 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium placeholder:text-zinc-600" 
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`relative p-3 rounded-2xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${showAdvancedFilters || activeFiltersCount > 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                >
                  <Filter size={18} />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black animate-in zoom-in duration-300 shadow-xl">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="hidden lg:flex items-center ml-4">
                <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center bg-black/40 rounded-full p-1 pl-1 pr-3 border border-white/5 hover:bg-black/60 transition-colors relative">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center mr-2 shadow-inner">
                    <span className="text-white font-black text-xs">{(currentUser?.name || 'U').charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-semibold truncate max-w-[120px]">{currentUser?.name}</span>
                </button>
                {showProfileMenu && (
                  <div className="absolute right-6 top-16 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                    <button onClick={() => { setView('profile'); setShowProfileMenu(false); }} className="w-full flex items-center px-4 py-3 text-sm font-medium hover:bg-zinc-800 rounded-xl transition-all"><UserIcon size={16} className="mr-3 text-zinc-500" /> Perfil</button>
                    {isAdmin && <button onClick={() => { setView('admin'); setShowProfileMenu(false); }} className="w-full flex items-center px-4 py-3 text-sm font-medium hover:bg-zinc-800 rounded-xl transition-all"><ShieldAlert size={16} className="mr-3 text-zinc-500" /> Painel Admin</button>}
                    <div className="h-px bg-zinc-800 my-2" />
                    <button onClick={logout} className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={16} className="mr-3" /> Sair</button>
                  </div>
                )}
              </div>
            </div>

            {/* Painel de Filtros Avançados - Design Refinado */}
            {showAdvancedFilters && (
              <div className="px-4 lg:px-6 pb-6 animate-in slide-in-from-top-4 duration-300 overflow-hidden">
                <div className="bg-zinc-900/80 border border-white/5 rounded-[32px] p-8 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
                  {/* Decorative background pattern */}
                  <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/20 rounded-2xl">
                        <SlidersHorizontal size={20} className="text-blue-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-100">Busca Personalizada</h3>
                        <p className="text-[10px] font-bold text-zinc-500 tracking-wider">Refine seu acervo por detalhes específicos</p>
                      </div>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button 
                        onClick={clearAdvancedFilters} 
                        className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-2 transition-all bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-2xl border border-white/5 group shadow-xl"
                      >
                        <Eraser size={14} className="group-hover:rotate-12 transition-transform" /> Limpar Todos os Filtros
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                    {/* Artista */}
                    <div className="space-y-3 group">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 group-focus-within:text-blue-500 transition-colors flex items-center gap-2">
                        <UserRound size={12} className="shrink-0" /> Artista
                      </label>
                      <div className="relative">
                        <input 
                          value={searchArtist} 
                          onChange={e => setSearchArtist(e.target.value)} 
                          placeholder="Ex: Aline Barros..." 
                          className="w-full bg-black/40 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium placeholder:text-zinc-700 shadow-inner" 
                        />
                        {searchArtist && <button onClick={() => setSearchArtist('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"><X size={14} /></button>}
                      </div>
                    </div>
                    {/* Álbum */}
                    <div className="space-y-3 group">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 group-focus-within:text-blue-500 transition-colors flex items-center gap-2">
                        <LayoutGrid size={12} className="shrink-0" /> Álbum
                      </label>
                      <div className="relative">
                        <input 
                          value={searchAlbum} 
                          onChange={e => setSearchAlbum(e.target.value)} 
                          placeholder="Ex: Adoração..." 
                          className="w-full bg-black/40 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium placeholder:text-zinc-700 shadow-inner" 
                        />
                        {searchAlbum && <button onClick={() => setSearchAlbum('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"><X size={14} /></button>}
                      </div>
                    </div>
                    {/* Gênero */}
                    <div className="space-y-3 group">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 group-focus-within:text-blue-500 transition-colors flex items-center gap-2">
                        <Tag size={12} className="shrink-0" /> Gênero
                      </label>
                      <div className="relative">
                        <input 
                          value={searchGenre} 
                          onChange={e => setSearchGenre(e.target.value)} 
                          placeholder="Ex: Louvor..." 
                          className="w-full bg-black/40 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium placeholder:text-zinc-700 shadow-inner" 
                        />
                        {searchGenre && <button onClick={() => setSearchGenre('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"><X size={14} /></button>}
                      </div>
                    </div>
                    {/* Ano */}
                    <div className="space-y-3 group">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-1 group-focus-within:text-blue-500 transition-colors flex items-center gap-2">
                        <CalendarDays size={12} className="shrink-0" /> Ano de Lançamento
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={searchYear} 
                          onChange={e => setSearchYear(e.target.value)} 
                          placeholder="Ex: 2024" 
                          className="w-full bg-black/40 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium placeholder:text-zinc-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-inner" 
                        />
                        {searchYear && <button onClick={() => setSearchYear('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"><X size={14} /></button>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </header>

          <div className="p-4 lg:p-8 space-y-8 lg:space-y-12 pb-44 lg:pb-32">
            {(view === 'home' || view === 'search') && (
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2 sticky top-[73px] lg:top-[89px] z-20 bg-black/60 backdrop-blur-md pt-2">
                {dynamicGenres.map(filter => (
                  <button
                    key={filter}
                    onClick={() => { setSelectedFilter(filter); if (view !== 'search' && filter !== 'Tudo') setView('search'); }}
                    className={`px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all border tracking-wider uppercase ${selectedFilter === filter ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/20' : 'bg-zinc-900/80 text-zinc-500 border-zinc-800 hover:text-white hover:border-zinc-700'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}

            {view === 'requests' && <UserRequests />}

            {view === 'home' && (
              <section className="animate-in fade-in duration-700">
                <h1 className="text-3xl lg:text-6xl font-black mb-8 lg:mb-12 tracking-tight bg-gradient-to-r from-white via-white to-zinc-600 bg-clip-text text-transparent">
                  {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'}
                </h1>
                
                <div className="mb-14">
                  <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-3 mb-6 lg:mb-8">
                    <div className="p-2 bg-blue-500/10 rounded-xl"><Clock className="text-blue-500" size={20} /></div>
                    Novidades no Pen-Drive
                  </h2>
                  {isAllTracksLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
                      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-zinc-900 animate-pulse rounded-2xl shadow-lg" />)}
                    </div>
                  ) : filteredTracks.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
                      {filteredTracks.map((track) => (
                        <div key={track.id} className="group bg-zinc-900/40 p-3 lg:p-4 rounded-3xl hover:bg-zinc-800/60 transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-xl">
                          <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl" onClick={() => { setQueue(filteredTracks); setCurrentTrack(track); }}>
                            <img src={track.album_image} className="w-full h-full object-cover shadow-2xl transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 active:scale-90">
                                <Play fill="currentColor" size={24} />
                              </button>
                            </div>
                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={(e) => { e.stopPropagation(); playNextInQueue(track); }} className="p-2 bg-black/60 backdrop-blur-md rounded-xl text-white hover:bg-blue-600 hover:text-white transition-all" title="Tocar a seguir">
                                 <ListMusic size={14} />
                               </button>
                            </div>
                          </div>
                          <div onClick={() => { setQueue(filteredTracks); setCurrentTrack(track); }}>
                            <h4 className="font-bold truncate text-sm lg:text-base text-zinc-100">{track.name}</h4>
                            <p className="text-[10px] lg:text-xs text-zinc-500 truncate font-semibold mt-0.5">{track.artist_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-[32px] bg-zinc-900/20">
                      Sua biblioteca está silenciosa. Faça um upload para começar.
                    </div>
                  )}
                </div>

                <div className="mb-12">
                  <h2 className="text-xl lg:text-2xl font-bold mb-6 lg:mb-8 flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl"><Disc className="text-indigo-400" size={20} /></div>
                    Álbuns Recentes
                  </h2>
                  {isLocalAlbumsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
                      {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="aspect-square bg-zinc-900 animate-pulse rounded-2xl shadow-lg" />)}
                    </div>
                  ) : localAlbums && localAlbums.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6">
                      {localAlbums.map((album: any) => (
                        <div key={album.id} onClick={() => handleAlbumPlay(album)} className="group bg-zinc-900/40 p-3 lg:p-4 rounded-3xl hover:bg-zinc-800/60 transition-all cursor-pointer border border-transparent hover:border-white/10 text-center lg:text-left shadow-xl">
                          <div className="relative mb-4 aspect-square mx-auto overflow-hidden rounded-2xl">
                            <img src={album.image} className="w-full h-full object-cover shadow-2xl transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                              {isAlbumLoading === album.id ? (
                                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <div className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all">
                                  <Play fill="currentColor" size={28} />
                                </div>
                              )}
                            </div>
                          </div>
                          <h4 className="font-bold truncate text-sm lg:text-base mb-1 text-zinc-100">{album.name}</h4>
                          <p className="text-[10px] lg:text-xs text-zinc-500 truncate font-semibold">{album.artist_name}</p>
                        </div>
                      ))}
                    </div>
                  ) : <div className="py-20 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-[32px] bg-zinc-900/20">Seus álbuns aparecerão aqui.</div>}
                </div>
              </section>
            )}

            {view === 'library' && (
              <section className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h2 className="text-3xl lg:text-5xl font-black tracking-tight">{isAdmin ? 'Catálogo Global (Admin)' : 'Sua Coleção Pessoal'}</h2>
                    <p className="text-zinc-500 text-sm font-medium mt-1">{isAdmin ? 'Gerencie todo o acervo do sistema.' : 'As músicas que você pediu ou enviou estão aqui.'}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-blue-500/40 active:scale-95">
                      <Upload size={18} /> Upload
                    </button>
                  )}
                </div>
                <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-2 lg:p-6 shadow-inner">
                  {allTracks && allTracks.length > 0 ? (
                    allTracks.map((track, i) => <TrackItem key={track.id} track={track} index={i} />)
                  ) : (
                    <div className="py-40 text-center text-zinc-500 flex flex-col items-center gap-6">
                      <div className="p-6 bg-zinc-800/30 rounded-full">
                        <Library size={64} className="text-zinc-700" />
                      </div>
                      <p className="font-bold text-lg text-zinc-400">Nenhuma música encontrada em sua biblioteca.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {view === 'liked' && (
              <section className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col lg:flex-row items-center lg:items-end gap-10 mb-14">
                   <div className="w-56 h-56 lg:w-72 lg:h-72 bg-gradient-to-br from-indigo-600 via-blue-500 to-indigo-400 rounded-[40px] shadow-2xl flex items-center justify-center relative group overflow-hidden">
                     <Heart fill="white" className="w-[100px] h-[100px] lg:w-[130px] lg:h-[130px] text-white relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:drop-shadow-2xl" />
                     <div className="absolute inset-0 bg-black/10" />
                   </div>
                   <div className="text-center lg:text-left flex-1">
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-4 bg-indigo-500/10 px-4 py-1.5 rounded-full w-fit mx-auto lg:mx-0">COLEÇÃO PESSOAL</p>
                     <h1 className="text-5xl lg:text-9xl font-black mb-8 tracking-tighter">Curtidas</h1>
                     <div className="flex items-center justify-center lg:justify-start gap-4">
                        <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-black text-xs shadow-lg">
                          {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-lg font-black">{currentUser?.name}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                        <span className="text-zinc-500 text-lg font-semibold">{likedTracks.length} faixas salvas</span>
                     </div>
                   </div>
                </div>
                <div className="bg-zinc-900/30 border border-white/5 rounded-[40px] p-2 lg:p-6 shadow-2xl">
                  {likedTracks.length > 0 ? (
                    likedTracks.map((track, i) => <TrackItem key={track.id} track={track} index={i} />)
                  ) : (
                    <div className="py-40 text-center text-zinc-500 flex flex-col items-center gap-6">
                      <div className="p-6 bg-zinc-800/30 rounded-full">
                        <Heart size={64} className="text-zinc-700" />
                      </div>
                      <p className="font-bold text-lg text-zinc-400">Suas músicas favoritas aparecerão aqui.</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {view === 'search' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="flex items-baseline justify-between gap-6 px-2">
                  <h2 className="text-3xl lg:text-5xl font-black tracking-tight">
                    {debouncedSearch ? 'Resultados' : 'Explorar'}
                  </h2>
                  {(debouncedSearch || activeFiltersCount > 0) && <span className="text-blue-500 font-black text-xs uppercase tracking-[0.2em] bg-blue-500/10 px-4 py-1.5 rounded-full">{combinedSearchResults.length} Encontrados</span>}
                </div>
                
                <div className="bg-zinc-900/40 rounded-[48px] p-2 lg:p-6 space-y-1 border border-white/5 min-h-[500px] shadow-2xl">
                  {combinedSearchResults.length > 0 ? (
                    combinedSearchResults.map((track, i) => <TrackItem key={track.id} track={track} index={i} />)
                  ) : (
                    <div className="py-48 text-center flex flex-col items-center gap-8">
                      <div className="w-24 h-24 bg-zinc-800/40 rounded-full flex items-center justify-center text-zinc-600 shadow-inner">
                        <Search size={40} />
                      </div>
                      <div className="space-y-4">
                        <p className="text-2xl font-black text-zinc-500">Nada encontrado por aqui</p>
                        <p className="text-zinc-600 max-w-sm mx-auto font-medium leading-relaxed px-6">
                          Tente usar outros termos ou limpe seus filtros para ver mais músicas da sua coleção.
                        </p>
                        <button onClick={clearAdvancedFilters} className="text-blue-500 font-black text-xs uppercase tracking-widest hover:text-blue-400 transition-colors mt-4">Reiniciar Busca</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'profile' && (
              <section className="animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pt-10">
                <div className="flex flex-col items-center mb-16 text-center">
                  <div className="relative group mb-10">
                    <div className="w-40 h-40 lg:w-56 lg:h-56 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-6xl lg:text-8xl font-black text-white shadow-2xl relative z-10 transition-transform group-hover:scale-105 duration-500">
                      {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-20 -z-0" />
                  </div>
                  
                  {isEditingName ? (
                    <div className="flex flex-col items-center gap-6 w-full max-w-md bg-zinc-900/50 p-8 rounded-[32px] border border-white/5 shadow-2xl">
                      <div className="w-full space-y-2 text-left">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Novo Nome</label>
                        <input 
                          value={newName} 
                          onChange={e => setNewName(e.target.value)} 
                          autoFocus
                          className="w-full bg-zinc-950 border border-blue-500/50 rounded-2xl p-4 text-center text-xl font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                        />
                      </div>
                      <div className="flex gap-4 w-full">
                        <button onClick={() => setIsEditingName(false)} className="flex-1 py-4 text-zinc-500 font-black text-xs uppercase tracking-widest hover:text-white transition-all">Cancelar</button>
                        <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Salvar Perfil</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight">{currentUser?.name}</h1>
                        <button onClick={() => setIsEditingName(true)} className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all shadow-lg"><Settings size={22} /></button>
                      </div>
                      <p className="text-zinc-500 font-bold text-lg flex items-center justify-center gap-3">
                        <Mail size={18} className="text-zinc-700" /> {currentUser?.email}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-zinc-900/40 border border-white/5 p-8 rounded-[32px] flex flex-col justify-between h-56 shadow-xl hover:bg-zinc-900/60 transition-all group">
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6">STATUS DA ASSINATURA</p>
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center shadow-lg"><Award size={28} /></div>
                         <div>
                            <p className="font-black text-xl text-white">{currentUser?.plan === 'premium' ? 'Pen-Drive Pro' : 'Free Member'}</p>
                            <p className="text-sm text-zinc-500 font-semibold">{currentUser?.subscriptionType || 'Livre para ouvir'}</p>
                         </div>
                      </div>
                    </div>
                    <button onClick={() => setView('premium')} className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] hover:text-blue-400 transition-colors flex items-center gap-3 group-hover:translate-x-1 transition-transform">Upgrade de Conta <ChevronRight size={16} /></button>
                  </div>

                  <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-[32px] flex flex-col justify-between h-56 shadow-xl hover:bg-red-500/10 transition-all group">
                    <div>
                      <p className="text-[10px] font-black text-red-500/50 uppercase tracking-[0.3em] mb-6">ÁREA DE SEGURANÇA</p>
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center shadow-lg"><LogOut size={28} /></div>
                         <div>
                            <p className="font-black text-xl text-white">Sair da Conta</p>
                            <p className="text-sm text-zinc-500 font-semibold">Desconectar de {currentUser?.email}</p>
                         </div>
                      </div>
                    </div>
                    <button onClick={logout} className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] hover:text-red-400 transition-colors flex items-center gap-3 group-hover:translate-x-1 transition-transform">Encerrar Sessão <ChevronRight size={16} /></button>
                  </div>
                </div>
              </section>
            )}

            {isAdmin && view === 'admin' && <AdminPanel />}
            {view === 'premium' && <PremiumPlans />}
            {view === 'queue' && (
              <section className="animate-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h1 className="text-3xl lg:text-5xl font-black tracking-tight">Fila</h1>
                    <p className="text-zinc-500 text-sm font-medium mt-1">Veja o que vem a seguir em sua jornada.</p>
                  </div>
                  <button onClick={() => setQueue([])} className="px-6 py-3 bg-zinc-800/80 border border-white/5 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-zinc-700 transition-all shadow-lg">Esvaziar Fila</button>
                </div>
                <div className="bg-zinc-900/30 border border-white/5 rounded-[40px] p-2 lg:p-6 shadow-inner">
                  {queue.length > 0 ? (
                    queue.map((t, i) => <TrackItem key={`${t.id}-${i}`} track={t} index={i} />)
                  ) : (
                    <div className="py-40 text-center text-zinc-600 font-black italic text-lg opacity-40">
                      Sua fila está silenciosa no momento.
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Navegação Inferior (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 backdrop-blur-3xl border-t border-white/5 flex items-center justify-around z-50 px-2">
        <button onClick={() => setView('home')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'home' ? 'text-blue-500' : 'text-zinc-500'}`}>
          <Home size={22} className={view === 'home' ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]' : ''} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Início</span>
        </button>
        <button onClick={() => setView('search')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'search' ? 'text-blue-500' : 'text-zinc-500'}`}>
          <Search size={22} className={view === 'search' ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]' : ''} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Buscar</span>
        </button>
        <button onClick={() => setView('library')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'library' || view === 'liked' ? 'text-blue-500' : 'text-zinc-500'}`}>
          <Library size={22} className={view === 'library' || view === 'liked' ? 'scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]' : ''} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Coleção</span>
        </button>
        <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1.5 transition-all ${view === 'profile' ? 'text-blue-500' : 'text-zinc-500'}`}>
          <div className={`w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-2 transition-all ${view === 'profile' ? 'border-blue-500 scale-110 shadow-[0_0_12px_rgba(59,130,246,0.3)]' : 'border-zinc-700'}`}>
             <span className="text-[10px] font-black text-white">{(currentUser?.name || 'U').charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-sm font-black uppercase tracking-tighter">Perfil</span>
        </button>
      </nav>

      <UploadModal isOpen={isUploadModalOpen} onClose={() => { setIsUploadModalOpen(false); refetchAllTracks(); }} />
      <AudioPlayer onQueueClick={() => setView('queue')} isQueueActive={view === 'queue'} />
    </div>
  );
};

export default App;
