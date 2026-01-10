import React, { useState, useEffect, useCallback, useRef, RefObject } from 'react';
import { 
  Users, Music, Trash2, Shield, ShieldAlert, UserPlus, Search, 
  BarChart3, Camera, Crown, RefreshCw, X, Check, Edit2, Loader2,
  Mail, Key, ShieldCheck, User as UserIcon, Calendar, ArrowRight,
  MessageSquare, Forward, CheckCircle, Upload, Copy, Tag, Disc, LayoutGrid,
  Send, ImageIcon
} from 'lucide-react';
import { useAuthStore, User } from '../store/authStore';
import { useMusicStore } from '../store';
import { supabase } from '../services/supabase';
import { MusicRequest, JamendoTrack, Album } from '../types';
import AssignAlbumModal from './AssignAlbumModal';
import AlbumItemAdmin from './AlbumItemAdmin'; // Importar o novo componente

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'music' | 'requests'>('users');
  const [activeMusicSubTab, setActiveMusicSubTab] = useState<'albums' | 'tracks'>('albums');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFixModal, setShowFixModal] = useState(false);
  
  // Request Management State
  const [requests, setRequests] = useState<MusicRequest[]>([]);
  const [fulfillingRequest, setFulfillingRequest] = useState<MusicRequest | null>(null);
  const [assigningTrack, setAssigningTrack] = useState<JamendoTrack | null>(null); 
  
  // Admin Library State (Fetched directly from DB to ensure accuracy)
  const [adminLibrary, setAdminLibrary] = useState<JamendoTrack[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Admin Albums State
  const [adminAlbums, setAdminAlbums] = useState<Album[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [assigningAlbum, setAssigningAlbum] = useState<Album | null>(null);
  
  // Album Cover Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedAlbumForUpload, setSelectedAlbumForUpload] = useState<Album | null>(null);
  const [isAlbumLoading, setIsAlbumLoading] = useState<string | null>(null); // Para o botão de play

  const { users, deleteUser, toggleUserRole, updatePlan, currentUser, fetchUsers, updateProfile, register } = useAuthStore();
  const { removeUploadedTrack, addNotification, updateAlbumCover, setQueue, setCurrentTrack } = useMusicStore();

  const RLS_SQL = `-- CRITICAL SECURITY AND PERMISSIONS SETUP
-- Run this entire block in Supabase SQL Editor to fix "policy violation" errors.

-- 1. Enable RLS on all relevant tables
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Access (Required for admin checks)
DROP POLICY IF EXISTS "Public profiles access" ON public.profiles;
CREATE POLICY "Public profiles access" ON public.profiles FOR SELECT TO authenticated USING (true);

-- 3. Music Requests Policies
DROP POLICY IF EXISTS "Users view own requests" ON public.music_requests;
CREATE POLICY "Users view own requests" ON public.music_requests FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Users create requests" ON public.music_requests;
CREATE POLICY "Users create requests" ON public.music_requests FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin update requests" ON public.music_requests;
CREATE POLICY "Admin update requests" ON public.music_requests FOR UPDATE TO authenticated 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- 4. Tracks Policies (The core of the system)
-- Visibility: Users see their own tracks + Admins see everything
DROP POLICY IF EXISTS "Track Visibility" ON public.tracks;
CREATE POLICY "Track Visibility" ON public.tracks FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Combined INSERT policy for tracks: Users can insert their own, Admins can insert for anyone
DROP POLICY IF EXISTS "Users and Admins can insert tracks" ON public.tracks;
CREATE POLICY "Users and Admins can insert tracks" ON public.tracks FOR INSERT TO authenticated
WITH CHECK (
    (auth.uid() = user_id) -- User can insert their own track
    OR
    (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')) -- Admin can insert any track
);

-- Delete: Users can delete their own tracks + Admins can delete anything
DROP POLICY IF EXISTS "Owners delete own tracks" ON public.tracks;
CREATE POLICY "Owners delete own tracks" ON public.tracks FOR DELETE TO authenticated 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Update: Users can update their own tracks + Admins update anything
DROP POLICY IF EXISTS "Owners update own tracks" ON public.tracks;
CREATE POLICY "Owners update own tracks" ON public.tracks FOR UPDATE TO authenticated 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- 5. Album Policies
-- Visibility: Users see their own albums + Admins see everything
DROP POLICY IF EXISTS "Users can view their own albums" ON public.albums;
CREATE POLICY "Users can view their own albums" ON public.albums FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Combined INSERT policy for albums: Users can insert their own, Admins can insert for anyone
DROP POLICY IF EXISTS "Users and Admins can insert albums" ON public.albums;
CREATE POLICY "Users and Admins can insert albums" ON public.albums FOR INSERT TO authenticated
WITH CHECK (
    (auth.uid() = user_id) -- User can insert their own album
    OR
    (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')) -- Admin can insert any album
);

-- Update: Users can update their own albums + Admins update anything
DROP POLICY IF EXISTS "Users can update their own albums" ON public.albums;
CREATE POLICY "Users can update their own albums" ON public.albums FOR UPDATE TO authenticated 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Delete: Users can delete their own albums + Admins can delete anything
DROP POLICY IF EXISTS "Users can delete their own albums" ON public.albums;
CREATE POLICY "Users can delete their own albums" ON public.albums FOR DELETE TO authenticated 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
`;

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('music_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erro ao buscar pedidos:", error);
      return;
    }
    setRequests(data || []);
  }, []);

  const fetchAdminLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          id, name, artist_name, album_name, audio_url, format, duration, created_at, genre, year, track_image, user_id,
          album_id,
          albums(image_url)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const tracks: JamendoTrack[] = data.map((t: any) => ({
        id: t.id,
        name: t.name,
        artist_name: t.artist_name,
        album_id: t.album_id,
        album_name: t.album_name || 'Upload Local',
        album_image: t.albums?.image_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300",
        track_image: t.track_image || t.albums?.image_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300",
        audio: t.audio_url,
        audiodownload: t.audio_url,
        duration: t.duration || 0,
        format: t.format || 'mp3',
        genre: t.genre || '',
        year: t.year || '',
        artist_id: 'local-artist',
        isLocal: true,
        user_id: t.user_id // Adicionar user_id para exibição
      }));
      setAdminLibrary(tracks);
    } catch (error) {
      console.error("Erro ao buscar biblioteca:", error);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  const fetchAdminAlbums = useCallback(async () => {
    setIsLoadingAlbums(true);
    try {
      const { data, error } = await supabase
        .from('albums')
        .select('id, name, artist_name, image_url, user_id, created_at');
      
      if (error) throw error;
      setAdminAlbums(data || []);
    } catch (error) {
      console.error("Erro ao buscar álbuns:", error);
    } finally {
      setIsLoadingAlbums(false);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    await fetchAdminLibrary();
    await fetchAdminAlbums();
    await fetchRequests();
    setIsRefreshing(false);
    addNotification('Dados do Admin atualizados!', 'info');
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      handleRefresh();
    }
  }, [currentUser]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLibrary = adminLibrary.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.artist_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAlbums = adminAlbums.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.artist_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteTrack = async (track: JamendoTrack) => {
    if (!confirm(`Tem certeza que deseja deletar a faixa '${track.name}'?`)) return;
    try {
      // 1. Delete from Storage
      const path = track.audio.split('/storage/v1/object/public/audio/')[1];
      if (path) {
        const { error: storageError } = await supabase.storage.from('audio').remove([path]);
        if (storageError) console.warn("Erro ao deletar do Storage (pode ser arquivo externo):", storageError);
      }

      // 2. Delete from DB
      const { error: dbError } = await supabase.from('tracks').delete().eq('id', track.id);
      if (dbError) throw dbError;

      // 3. Update UI
      setAdminLibrary(prev => prev.filter(t => t.id !== track.id));
      removeUploadedTrack(track.id); // Remove do Zustand
      addNotification(`Faixa '${track.name}' deletada com sucesso!`, 'success');
    } catch (error: any) {
      addNotification(`Erro ao deletar faixa: ${error.message}`, 'error');
    }
  };

  const handleDeleteAlbum = async (album: Album) => {
    if (!confirm(`Tem certeza que deseja deletar o álbum '${album.name}' e TODAS as faixas associadas?`)) return;
    try {
      // 1. Delete tracks from Storage (optional, but good practice)
      const tracksToDelete = adminLibrary.filter(t => t.album_id === album.id);
      const paths = tracksToDelete.map(t => t.audio.split('/storage/v1/object/public/audio/')[1]).filter(p => p);
      if (paths.length > 0) {
        await supabase.storage.from('audio').remove(paths);
      }

      // 2. Delete album from DB (cascades to tracks via RLS/FK)
      const { error: dbError } = await supabase.from('albums').delete().eq('id', album.id);
      if (dbError) throw dbError;

      // 3. Update UI
      setAdminAlbums(prev => prev.filter(a => a.id !== album.id));
      setAdminLibrary(prev => prev.filter(t => t.album_id !== album.id));
      addNotification(`Álbum '${album.name}' e faixas deletados com sucesso!`, 'success');
    } catch (error: any) {
      addNotification(`Erro ao deletar álbum: ${error.message}`, 'error');
    }
  };

  const handleFulfillRequest = async (request: MusicRequest) => {
    if (!confirm(`Marcar o pedido de '${request.title}' como ATENDIDO?`)) return;
    try {
      const { error } = await supabase
        .from('music_requests')
        .update({ status: 'completed' })
        .eq('id', request.id);
      
      if (error) throw error;
      
      setRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'completed' } : r));
      addNotification(`Pedido de ${request.user_name} marcado como atendido!`, 'success');
    } catch (error: any) {
      addNotification(`Erro ao atualizar pedido: ${error.message}`, 'error');
    }
  };

  const handleAssignAlbum = async (album: Album, targetUserId: string) => {
    try {
      // 1. Update Album ownership
      const { error: albumError } = await supabase
        .from('albums')
        .update({ user_id: targetUserId })
        .eq('id', album.id);

      if (albumError) throw albumError;

      // 2. Update Track ownership
      const { error: tracksError } = await supabase
        .from('tracks')
        .update({ user_id: targetUserId })
        .eq('album_id', album.id);

      if (tracksError) throw tracksError;

      addNotification(`Álbum '${album.name}' encaminhado para o usuário com sucesso!`, 'success');
      handleRefresh(); // Refresh data
    } catch (error: any) {
      console.error('Erro ao encaminhar álbum:', error);
      addNotification(`Falha ao encaminhar álbum: ${error.message}`, 'error');
    }
  };

  const handleUpdateUserPlan = async (userId: string, currentPlan: 'free' | 'premium') => {
    const newPlan = currentPlan === 'free' ? 'premium' : 'free';
    // Correção: subscriptionType é opcional e será undefined para 'free'
    const subscriptionType = newPlan === 'premium' ? 'Individual' : undefined;
    await updatePlan(userId, newPlan, subscriptionType);
    addNotification(`Plano do usuário atualizado para ${newPlan.toUpperCase()}!`, 'success');
  };

  const handleToggleRole = async (userId: string, currentRole: 'user' | 'admin') => {
    if (currentRole === 'admin' && userId === currentUser?.id) {
      addNotification('Você não pode remover seu próprio status de Admin.', 'error');
      return;
    }
    await toggleUserRole(userId);
    addNotification(`Permissão do usuário alterada!`, 'success');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const res = await updateProfile(editingUser.name, editingUser.id);
    if (res.success) {
      addNotification('Perfil do usuário atualizado!', 'success');
      setEditingUser(null);
    } else {
      addNotification(res.message, 'error');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    if (!name || !email || !password) {
      addNotification('Preencha todos os campos.', 'error');
      return;
    }

    const res = await register(name, email, password, true);
    if (res.success) {
      setShowCreateModal(false);
    }
    addNotification(res.message, res.success ? 'success' : 'error');
  };

  const getStatusColor = (status: 'pending' | 'completed') => {
    return status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAlbumForUpload || !currentUser) return;

    setIsUploadingImage(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${selectedAlbumForUpload.user_id}/album_covers/${selectedAlbumForUpload.id}.${fileExt}`; // Usa o ID do proprietário original

      // 1. Upload da nova imagem
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

      // 2. Atualiza o banco de dados
      const { error: dbError } = await supabase
        .from('albums')
        .update({ image_url: publicUrl })
        .eq('id', selectedAlbumForUpload.id);

      if (dbError) throw dbError;

      // 3. Atualiza o estado global e local
      updateAlbumCover(selectedAlbumForUpload.id, publicUrl);
      await fetchAdminAlbums(); // Refetch para atualizar a lista de álbuns no componente
      addNotification('Capa do álbum atualizada com sucesso!', 'success');

    } catch (error: any) {
      console.error('Erro ao atualizar capa do álbum:', error);
      addNotification(`Erro ao atualizar capa: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsUploadingImage(false);
      setSelectedAlbumForUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAlbumPlay = async (album: Album) => {
    if (!album || !currentUser) return;
    try {
      setIsAlbumLoading(album.id);
      
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          id, name, artist_name, album_name, audio_url, format, duration, created_at, genre, year, track_image,
          album_id,
          albums(image_url)
        `)
        .eq('album_id', album.id)
        .order('created_at', { ascending: true });
          
      if (error) throw error;
      
      const tracks: JamendoTrack[] = data.map((t: any) => ({
        id: t.id,
        name: t.name,
        artist_name: t.artist_name,
        album_id: t.album_id,
        album_name: t.album_name,
        album_image: t.albums?.image_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300",
        track_image: t.track_image || t.albums?.image_url || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300",
        audio: t.audio_url,
        audiodownload: t.audio_url,
        duration: t.duration || 0,
        format: t.format || 'mp3',
        genre: t.genre,
        year: t.year,
        artist_id: 'local-artist',
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


  if (currentUser?.role !== 'admin') {
    return (
      <div className="py-20 text-center text-red-500/70">
        <ShieldAlert size={48} className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p>Você não tem permissão de administrador para acessar este painel.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pt-10 px-4 pb-32 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
          <ShieldAlert size={32} className="text-red-500" /> Painel de Administração
        </h1>
        <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">
          {isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Atualizar Dados
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8 border-b border-zinc-800">
        <button onClick={() => setActiveTab('users')} className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-white'}`}>
          <Users size={18} /> Usuários
        </button>
        <button onClick={() => setActiveTab('music')} className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'music' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-white'}`}>
          <Music size={18} /> Catálogo
        </button>
        <button onClick={() => setActiveTab('requests')} className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-white'}`}>
          <MessageSquare size={18} /> Pedidos ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button onClick={() => setShowFixModal(true)} className="px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 text-red-500 hover:text-red-400">
          <ShieldAlert size={18} /> RLS Fix
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text" 
          placeholder={`Buscar em ${activeTab}...`} 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
        />
      </div>

      {/* Content Area */}
      {activeTab === 'users' && (
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-6 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Gerenciamento de Usuários ({users.length})</h2>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-all">
              <UserPlus size={16} /> Novo Usuário
            </button>
          </div>
          <div className="space-y-3">
            {filteredUsers.map(user => (
              <div key={user.id} className="bg-zinc-950/50 p-4 rounded-2xl flex items-center justify-between border border-zinc-800 hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{user.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-700/50 text-zinc-300'}`}>
                    {user.role}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user.plan === 'premium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-zinc-700/50 text-zinc-300'}`}>
                    {user.plan}
                  </span>
                  
                  <button onClick={() => handleUpdateUserPlan(user.id, user.plan || 'free')} className="p-2 text-zinc-500 hover:text-yellow-400 transition-colors" title="Toggle Premium">
                    <Crown size={18} />
                  </button>
                  <button onClick={() => handleToggleRole(user.id, user.role || 'user')} className="p-2 text-zinc-500 hover:text-red-400 transition-colors" title="Toggle Admin">
                    <Shield size={18} />
                  </button>
                  <button onClick={() => setEditingUser(user)} className="p-2 text-zinc-500 hover:text-blue-400 transition-colors" title="Editar Nome">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => deleteUser(user.id)} disabled={user.id === currentUser?.id} className="p-2 text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-30" title="Deletar Usuário">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'music' && (
        <div className="space-y-8">
          <div className="flex space-x-4 border-b border-zinc-800">
            <button onClick={() => setActiveMusicSubTab('albums')} className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeMusicSubTab === 'albums' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-white'}`}>
              <LayoutGrid size={18} /> Álbuns ({adminAlbums.length})
            </button>
            <button onClick={() => setActiveMusicSubTab('tracks')} className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${activeMusicSubTab === 'tracks' ? 'text-white border-b-2 border-blue-500' : 'text-zinc-500 hover:text-white'}`}>
              <Disc size={18} /> Faixas ({adminLibrary.length})
            </button>
          </div>

          {activeMusicSubTab === 'albums' && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Gerenciamento de Álbuns</h2>
              {isLoadingAlbums ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredAlbums.map(album => (
                    <AlbumItemAdmin 
                      key={album.id} 
                      album={album} 
                      isUploadingImage={isUploadingImage} 
                      selectedAlbumForUpload={selectedAlbumForUpload} 
                      setSelectedAlbumForUpload={setSelectedAlbumForUpload} 
                      fileInputRef={fileInputRef as RefObject<HTMLInputElement>} 
                      onDeleteAlbum={handleDeleteAlbum}
                      onAssignAlbum={() => setAssigningAlbum(album)}
                      onPlayAlbum={handleAlbumPlay}
                      showAdminControls={true}
                      isAlbumLoading={isAlbumLoading}
                      ownerName={users.find(u => u.id === album.user_id)?.name || 'Desconhecido'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMusicSubTab === 'tracks' && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-6 shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Gerenciamento de Faixas</h2>
              {isLoadingLibrary ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
              ) : (
                <div className="space-y-3">
                  {filteredLibrary.map(track => (
                    <div key={track.id} className="bg-zinc-950/50 p-4 rounded-2xl flex items-center justify-between border border-zinc-800 hover:border-blue-500/30 transition-all">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <img src={track.album_image} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{track.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{track.artist_name} ({track.album_name})</p>
                          <p className="text-[10px] text-zinc-600">Proprietário: {users.find(u => u.id === track.user_id)?.name || 'Desconhecido'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <button onClick={() => handleDeleteTrack(track)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors" title="Deletar Faixa">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-zinc-900/50 border border-white/5 rounded-[32px] p-6 shadow-2xl">
          <h2 className="text-xl font-bold mb-6">Pedidos de Música ({requests.length})</h2>
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="py-10 text-center text-zinc-600">Nenhum pedido pendente.</div>
            ) : (
              requests.map(req => (
                <div key={req.id} className={`p-4 rounded-2xl flex items-center justify-between border ${getStatusColor(req.status)}`}>
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-bold text-sm truncate text-white">{req.title}</p>
                    <p className="text-xs text-zinc-400 truncate">Artista: {req.artist} | Gênero: {req.genre || 'N/A'}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Por: {req.user_name} ({new Date(req.created_at).toLocaleDateString('pt-BR')})</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(req.status)}`}>
                      {req.status === 'completed' ? 'Atendido' : 'Pendente'}
                    </span>
                    {req.status === 'pending' && (
                      <button onClick={() => handleFulfillRequest(req)} className="p-2 bg-green-600/10 text-green-400 rounded-full hover:bg-green-600 hover:text-white transition-colors" title="Marcar como Atendido">
                        <CheckCircle size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {editingUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <form onSubmit={handleSaveEdit} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6">
            <h3 className="text-xl font-bold">Editar Perfil de {editingUser.name}</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome</label>
              <input 
                type="text" 
                value={editingUser.name}
                onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-zinc-500 hover:text-white">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 transition-all">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <form onSubmit={handleCreateUser} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3"><UserPlus size={20} className="text-blue-500" /> Criar Novo Usuário</h3>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2"><UserIcon size={12} /> Nome</label>
              <input name="name" type="text" required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2"><Mail size={12} /> E-mail</label>
              <input name="email" type="email" required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2"><Key size={12} /> Senha</label>
              <input name="password" type="password" required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all" />
            </div>
            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-zinc-500 hover:text-white">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 transition-all">Criar</button>
            </div>
          </form>
        </div>
      )}

      {showFixModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-red-400"><ShieldAlert size={20} /> Correção de Políticas RLS</h3>
            <p className="text-zinc-400 mb-6 text-sm">Se você estiver vendo erros de "Row Level Security" ou "401/409" no console, copie e execute o código SQL abaixo no editor SQL do Supabase para garantir que todas as permissões de Admin e Usuário estejam configuradas corretamente.</p>
            <div className="bg-black p-4 rounded-xl text-xs font-mono text-green-400 whitespace-pre-wrap break-words">
              {RLS_SQL}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowFixModal(false)} className="px-6 py-2 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 transition-all">Entendi</button>
            </div>
          </div>
        </div>
      )}

      <AssignAlbumModal 
        isOpen={!!assigningAlbum}
        onClose={() => setAssigningAlbum(null)}
        album={assigningAlbum}
        onAssignAlbum={handleAssignAlbum}
      />
      
      {/* Input de arquivo oculto para upload de capa */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageChange}
      />
    </div>
  );
};

export default AdminPanel;