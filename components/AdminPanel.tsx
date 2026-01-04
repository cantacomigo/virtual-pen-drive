import React, { useState, useEffect } from 'react';
import { 
  Users, Music, Trash2, Shield, ShieldAlert, UserPlus, Search, 
  BarChart3, Camera, Crown, RefreshCw, X, Check, Edit2, Loader2,
  Mail, Key, ShieldCheck, User as UserIcon, Calendar, ArrowRight,
  MessageSquare, Forward, CheckCircle, Upload, Copy, Tag, Disc, LayoutGrid
} from 'lucide-react';
import { useAuthStore, User } from '../store/authStore';
import { useMusicStore } from '../store';
import { supabase } from '../services/supabase';
import { MusicRequest, JamendoTrack, Album } from '../types';
import AssignAlbumModal from './AssignAlbumModal'; // Importar o novo modal

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'music' | 'requests'>('users');
  const [activeMusicSubTab, setActiveMusicSubTab] = useState<'albums' | 'tracks'>('albums'); // Novo estado para sub-aba
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
  const [adminAlbums, setAdminAlbums] = useState<Album[]>([]); // Novo estado para álbuns
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false); // Novo estado de loading para álbuns
  const [assigningAlbum, setAssigningAlbum] = useState<Album | null>(null); // Álbum sendo encaminhado

  const { users, deleteUser, toggleUserRole, updatePlan, currentUser, fetchUsers, updateProfile, register } = useAuthStore();
  const { removeUploadedTrack, addNotification } = useMusicStore();

  const RLS_SQL = `-- CRITICAL SECURITY AND PERMISSIONS SETUP
-- Run this entire block in Supabase SQL Editor to fix "policy violation" errors.

-- 1. Enable RLS on all relevant tables
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY; -- Adicionar RLS para albums

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

-- Insert: Users can upload their own tracks
DROP POLICY IF EXISTS "Users insert own tracks" ON public.tracks;
CREATE POLICY "Users insert own tracks" ON public.tracks FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Insert: Admins can upload tracks for ANYONE (e.g. fulfilling requests)
DROP POLICY IF EXISTS "Admin insert tracks" ON public.tracks;
CREATE POLICY "Admin insert tracks" ON public.tracks FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Delete: Users can delete their own tracks + Admins can delete anything
DROP POLICY IF EXISTS "Owners delete own tracks" ON public.tracks;
CREATE POLICY "Owners delete own tracks" ON public.tracks FOR DELETE TO authenticated 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Update: Users can update their own tracks + Admins update anything
DROP POLICY IF EXISTS "Owners update own tracks" ON public.tracks;
CREATE POLICY "Owners update own tracks" ON public.tracks FOR UPDATE TO authenticated 
USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- 5. Album Policies (New table)
DROP POLICY IF EXISTS "Users can view their own albums" ON public.albums;
CREATE POLICY "Users can view their own albums" ON public.albums FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Users can insert their own albums" ON public.albums;
CREATE POLICY "Users can insert their own albums" ON public.albums FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own albums" ON public.albums;
CREATE POLICY "Users can update their own albums" ON public.albums FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own albums" ON public.albums;
CREATE POLICY "Users can delete their own albums" ON public.albums FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas de RLS para admins na tabela 'albums'
DROP POLICY IF EXISTS "Admins can view all albums" ON public.albums;
CREATE POLICY "Admins can view all albums" ON public.albums FOR SELECT TO authenticated USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert albums" ON public.albums;
CREATE POLICY "Admins can insert albums" ON public.albums FOR INSERT TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Admins can update albums" ON public.albums;
CREATE POLICY "Admins can update albums" ON public.albums FOR UPDATE TO authenticated USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete albums" ON public.albums;
CREATE POLICY "Admins can delete albums" ON public.albums FOR DELETE TO authenticated USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
`;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    await fetchRequests();
    await fetchAdminLibrary();
    await fetchAdminAlbums(); // Chamar a nova função de busca de álbuns
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const fetchRequests = async () => {
    const { data } = await supabase.from('music_requests').select('*').order('created_at', { ascending: false });
    if (data) setRequests(data);
  };

  const fetchAdminLibrary = async () => {
    if (!currentUser) return;
    setIsLoadingLibrary(true);
    
    const { data, error } = await supabase
      .from('tracks')
      .select(`
        id, name, artist_name, album_name, audio_url, format, duration, created_at, genre, year, track_image,
        album_id,
        albums(image_url)
      `)
      .eq('user_id', currentUser.id) // Busca faixas onde o dono é o admin atual
      .order('created_at', { ascending: false });
    
    if (data) {
        const mapped: JamendoTrack[] = data.map((t: any) => ({
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
            format: t.format,
            genre: t.genre,
            year: t.year,
            artist_id: 'local',
            isLocal: true
        }));
        setAdminLibrary(mapped);
    }
    setIsLoadingLibrary(false);
  };

  // Nova função para buscar álbuns do admin
  const fetchAdminAlbums = async () => {
    if (!currentUser) return;
    setIsLoadingAlbums(true);
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (data) {
      setAdminAlbums(data);
    }
    setIsLoadingAlbums(false);
  };

  useEffect(() => {
    fetchRequests();
    fetchAdminLibrary();
    fetchAdminAlbums(); // Chamar a nova função de busca de álbuns
  }, [currentUser]);

  const handleFulfillWithTrack = async (track: JamendoTrack) => {
    if (!fulfillingRequest) return;
    
    try {
      // 1. Check if requester already has this track
      const { data: existingTrackForRequester, error: checkError } = await supabase
        .from('tracks')
        .select('id')
        .eq('user_id', fulfillingRequest.user_id)
        .ilike('name', track.name)
        .ilike('artist_name', track.artist_name)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingTrackForRequester) {
        addNotification(`"${track.name}" já está na biblioteca de ${fulfillingRequest.user_name}.`, 'info');
        // Optionally, update request status to completed even if not inserted
        await supabase.from('music_requests').update({ status: 'completed' }).eq('id', fulfillingRequest.id);
        setFulfillingRequest(null);
        fetchRequests();
        return; // Stop here, no insertion needed
      }

      // 2. Duplicate track for the requester
      const { error: insertError } = await supabase.from('tracks').insert({
        user_id: fulfillingRequest.user_id,
        name: track.name,
        artist_name: track.artist_name,
        album_id: track.album_id, // Usar o ID do álbum
        album_name: track.album_name,
        track_image: track.track_image, // Usar a imagem da faixa
        audio_url: track.audio,
        format: track.format,
        duration: track.duration,
        genre: track.genre,
        year: track.year
      });

      if (insertError) {
        if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
            setShowFixModal(true);
            throw new Error("Permissão negada (Insert). Requer ajuste de DB.");
        }
        throw insertError;
      }

      // 3. Update Request Status
      const { error: updateError } = await supabase
        .from('music_requests')
        .update({ status: 'completed' })
        .eq('id', fulfillingRequest.id);

      if (updateError) {
         if (updateError.code === '42501' || updateError.message?.includes('row-level security')) {
            setShowFixModal(true);
            throw new Error("Permissão negada (Update). Requer ajuste de DB.");
        }
        throw updateError;
      }

      addNotification(`Música enviada para ${fulfillingRequest.user_name}!`);
      setFulfillingRequest(null);
      fetchRequests();

    } catch (err: any) {
      console.error(err);
      const msg = err.message || (typeof err === 'string' ? err : 'Erro desconhecido');
      addNotification(`${msg}`, 'error');
    }
  };

  const handleForwardTrack = async (targetUserId: string) => {
    if (!assigningTrack) return;
    
    try {
       // 1. Check if target user already has this track
      const { data: existingTrackForTarget, error: checkError } = await supabase
        .from('tracks')
        .select('id')
        .eq('user_id', targetUserId)
        .ilike('name', assigningTrack.name)
        .ilike('artist_name', assigningTrack.artist_name)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingTrackForTarget) {
        const targetUser = users.find(u => u.id === targetUserId);
        addNotification(`"${assigningTrack.name}" já está na biblioteca de ${targetUser?.name || 'usuário'}.`, 'info');
        setAssigningTrack(null);
        return; // Stop here, no insertion needed
      }

       const { error } = await supabase.from('tracks').insert({
        user_id: targetUserId,
        name: assigningTrack.name,
        artist_name: assigningTrack.artist_name,
        album_id: assigningTrack.album_id, // Usar o ID do álbum
        album_name: assigningTrack.album_name,
        track_image: assigningTrack.track_image, // Usar a imagem da faixa
        audio_url: assigningTrack.audio,
        format: assigningTrack.format,
        duration: assigningTrack.duration,
        genre: assigningTrack.genre,
        year: assigningTrack.year
      });

      if (error) {
        if (error.code === '42501' || error.message?.includes('row-level security')) {
            setShowFixModal(true);
            throw new Error("Permissão negada. Requer ajuste no Banco de Dados.");
        }
        throw error;
      }
      
      const targetUser = users.find(u => u.id === targetUserId);
      addNotification(`Cópia enviada para ${targetUser?.name || 'usuário'}!`);
      setAssigningTrack(null);
    } catch (err: any) {
      const msg = err.message || (typeof err === 'string' ? err : 'Erro desconhecido');
      addNotification(`${msg}`, 'error');
    }
  };

  // Nova função para encaminhar um álbum completo
  const handleAssignAlbum = async (album: Album, targetUserId: string) => {
    if (!album || !targetUserId) return;

    try {
      addNotification(`Encaminhando álbum "${album.name}" para o usuário...`, 'info');

      // 1. Verificar/Criar o álbum para o usuário de destino
      const { data: existingTargetAlbum, error: albumCheckError } = await supabase
        .from('albums')
        .select('id, name, artist_name, image_url')
        .eq('user_id', targetUserId)
        .ilike('name', album.name)
        .maybeSingle();

      let targetAlbumId = existingTargetAlbum?.id;
      let targetAlbumImageUrl = existingTargetAlbum?.image_url || album.image_url;
      let targetAlbumArtistName = existingTargetAlbum?.artist_name || album.artist_name;

      if (!existingTargetAlbum) {
        const { data: newTargetAlbum, error: albumInsertError } = await supabase
          .from('albums')
          .insert({
            user_id: targetUserId,
            name: album.name,
            artist_name: album.artist_name, // Copia o artista do álbum original
            image_url: album.image_url
          })
          .select('id, image_url, artist_name')
          .single();

        if (albumInsertError) throw albumInsertError;
        targetAlbumId = newTargetAlbum.id;
        targetAlbumImageUrl = newTargetAlbum.image_url;
        targetAlbumArtistName = newTargetAlbum.artist_name;
      }

      // 2. Buscar todas as faixas do álbum original
      const { data: originalTracks, error: tracksFetchError } = await supabase
        .from('tracks')
        .select('*')
        .eq('album_id', album.id);

      if (tracksFetchError) throw tracksFetchError;

      if (!originalTracks || originalTracks.length === 0) {
        addNotification(`Álbum "${album.name}" não possui faixas para encaminhar.`, 'info');
        return;
      }

      // 3. Duplicar faixas para o usuário de destino
      let tracksAddedCount = 0;
      let albumArtistNeedsUpdate = false;

      for (const track of originalTracks) {
        // Verificar se a faixa já existe para o usuário de destino
        const { data: existingTargetTrack, error: trackCheckError } = await supabase
          .from('tracks')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('album_id', targetAlbumId) // Verifica dentro do álbum de destino
          .ilike('name', track.name)
          .ilike('artist_name', track.artist_name)
          .maybeSingle();

        if (trackCheckError) {
          console.error(`Erro ao verificar faixa existente para ${track.name}:`, trackCheckError);
          continue; // Pular para a próxima faixa em caso de erro de verificação
        }

        if (!existingTargetTrack) {
          // Inserir nova faixa
          const { error: trackInsertError } = await supabase.from('tracks').insert({
            user_id: targetUserId,
            name: track.name,
            artist_name: track.artist_name,
            album_id: targetAlbumId,
            album_name: track.album_name,
            track_image: track.track_image,
            audio_url: track.audio_url,
            format: track.format,
            duration: track.duration,
            genre: track.genre,
            year: track.year
          });

          if (trackInsertError) {
            console.error(`Erro ao inserir faixa "${track.name}" para o usuário ${targetUserId}:`, trackInsertError);
            // Se for um erro de RLS, mostrar o modal de correção
            if (trackInsertError.code === '42501' || trackInsertError.message?.includes('row-level security')) {
              setShowFixModal(true);
              throw new Error("Permissão negada ao inserir faixas. Requer ajuste de DB.");
            }
            continue; // Pular para a próxima faixa em caso de erro de inserção
          }
          tracksAddedCount++;

          // Verificar se o artista da faixa indica múltiplos artistas e o álbum ainda não está marcado como 'Vários Artistas'
          if ((track.artist_name.includes(',') || track.artist_name.includes('&')) && targetAlbumArtistName !== 'Vários Artistas') {
            albumArtistNeedsUpdate = true;
          }
        }
      }

      // 4. Atualizar o nome do artista do álbum de destino se necessário
      if (albumArtistNeedsUpdate && targetAlbumId) {
        await supabase
          .from('albums')
          .update({ artist_name: 'Vários Artistas' })
          .eq('id', targetAlbumId);
      }

      addNotification(`Álbum "${album.name}" encaminhado com ${tracksAddedCount} novas faixas!`);
      setAssigningAlbum(null); // Fechar o modal
    } catch (err: any) {
      console.error("Erro ao encaminhar álbum:", err);
      const msg = err.message || (typeof err === 'string' ? err : 'Erro desconhecido');
      addNotification(`Erro ao encaminhar álbum: ${msg}`, 'error');
    }
  };


  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMusic = adminLibrary.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.artist_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAlbums = adminAlbums.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.artist_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const RlsFixModal = () => {
    const [copied, setCopied] = useState(false);
    const copySql = () => {
        navigator.clipboard.writeText(RLS_SQL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-zinc-900 border-2 border-red-500/50 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative">
                 <button onClick={() => setShowFixModal(false)} className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-full"><X size={20}/></button>
                 
                 <div className="flex items-center gap-4 mb-6 text-red-500">
                     <div className="p-3 bg-red-500/10 rounded-xl"><ShieldAlert size={32} /></div>
                     <div>
                         <h3 className="text-xl font-black">Configuração de Banco de Dados</h3>
                         <p className="text-sm text-red-400 font-medium">Privacidade e Permissões (RLS)</p>
                     </div>
                 </div>

                 <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                     Para corrigir a privacidade e garantir que o upload funcione para todos, execute este SQL no Supabase:
                 </p>

                 <div className="bg-black/50 border border-zinc-800 rounded-xl p-4 relative font-mono text-xs text-green-400 overflow-x-auto mb-6 h-40">
                     <button onClick={copySql} className="absolute top-2 right-2 p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2 sticky right-2">
                         {copied ? <Check size={14} /> : <Copy size={14} />}
                         {copied ? 'Copiado' : 'Copiar'}
                     </button>
                     <pre>{RLS_SQL}</pre>
                 </div>

                 <button onClick={() => setShowFixModal(false)} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl uppercase tracking-widest text-xs">
                     Entendi, vou executar
                 </button>
            </div>
        </div>
    );
  };

  // Modal to select a track from library to fulfill a request
  const FulfillModal = () => {
    const [localSearch, setLocalSearch] = useState('');
    const [isSending, setIsSending] = useState<string | null>(null);
    
    // Filter admin tracks
    const availableTracks = adminLibrary.filter(t => 
      t.name.toLowerCase().includes(localSearch.toLowerCase()) || 
      t.artist_name.toLowerCase().includes(localSearch.toLowerCase())
    );

    const onSelect = async (track: JamendoTrack) => {
        setIsSending(track.id);
        await handleFulfillWithTrack(track);
        setIsSending(null);
    };

    return (
       <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-2xl shadow-2xl h-[600px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex flex-col">
              <span className="text-sm text-zinc-500 uppercase tracking-widest font-black">Atendendo Pedido</span>
              <span className="text-white">Selecione uma música do acervo</span>
            </h3>
            <button onClick={() => setFulfillingRequest(null)} className="p-2 hover:bg-zinc-800 rounded-full"><X size={20}/></button>
          </div>

          <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-xs font-bold text-purple-400 uppercase mb-1">Solicitação de:</p>
                  <p className="text-lg font-bold text-white">{fulfillingRequest?.title}</p>
                  <p className="text-sm text-zinc-300 font-medium">{fulfillingRequest?.artist}</p>
               </div>
               {fulfillingRequest?.genre && (
                   <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2">
                       <Tag size={12} /> {fulfillingRequest.genre}
                   </span>
               )}
            </div>
            <p className="text-xs text-zinc-500 mt-2">Usuário: {fulfillingRequest?.user_name}</p>
          </div>

          <div className="relative mb-4">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
             <input 
                autoFocus
                type="text" 
                placeholder="Buscar no seu acervo..." 
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
             />
          </div>

          <div className="flex-1 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950/30">
             {isLoadingLibrary ? (
                 <div className="flex items-center justify-center h-full text-zinc-500 gap-2">
                     <Loader2 className="animate-spin" /> Carregando acervo...
                 </div>
             ) : availableTracks.length > 0 ? availableTracks.map(track => (
               <div key={track.id} onClick={() => !isSending && onSelect(track)} className={`p-3 border-b border-zinc-800/50 flex items-center gap-3 hover:bg-blue-600/10 cursor-pointer group transition-colors ${isSending ? 'opacity-50 pointer-events-none' : ''}`}>
                  <img src={track.track_image || track.album_image} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate group-hover:text-blue-400">{track.name}</p>
                    <p className="text-xs text-zinc-500">{track.artist_name}</p>
                  </div>
                  {isSending === track.id ? <Loader2 className="animate-spin text-blue-500" size={16} /> : <Forward size={16} className="text-zinc-600 group-hover:text-blue-500" />}
               </div>
             )) : (
               <div className="p-8 text-center text-zinc-500 text-sm">
                 Nenhuma música encontrada. Faça upload na aba "Enviar Música" primeiro.
               </div>
             )}
          </div>
        </div>
       </div>
    );
  };

  // Modal to select a user to forward a track to
  const AssignModal = () => {
    const [userSearch, setUserSearch] = useState('');
    const [isSending, setIsSending] = useState<string | null>(null);
    
    const targetUsers = users.filter(u => 
      u.role !== 'admin' && // Optional: Don't show admins if not needed
      (u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    );

    const onSelect = async (userId: string) => {
        setIsSending(userId);
        await handleForwardTrack(userId);
        setIsSending(null);
    };

    return (
       <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex flex-col">
              <span className="text-sm text-zinc-500 uppercase tracking-widest font-black">Encaminhar Música</span>
              <span className="text-white truncate max-w-sm">{assigningTrack?.name}</span>
            </h3>
            <button onClick={() => setAssigningTrack(null)} className="p-2 hover:bg-zinc-800 rounded-full"><X size={20}/></button>
          </div>

          <div className="relative mb-4">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
             <input 
                autoFocus
                type="text" 
                placeholder="Buscar usuário..." 
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
             />
          </div>

          <div className="flex-1 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950/30">
             {targetUsers.length > 0 ? targetUsers.map(u => (
               <div key={u.id} onClick={() => !isSending && onSelect(u.id)} className={`p-3 border-b border-zinc-800/50 flex items-center gap-3 hover:bg-green-600/10 cursor-pointer group transition-colors ${isSending ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate group-hover:text-green-400">{u.name}</p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </div>
                  {isSending === u.id ? <Loader2 className="animate-spin text-green-500" size={16} /> : <CheckCircle size={16} className="text-zinc-600 group-hover:text-green-500" />}
               </div>
             )) : (
               <div className="p-8 text-center text-zinc-500 text-sm">
                 Nenhum usuário encontrado.
               </div>
             )}
          </div>
        </div>
       </div>
    );
  };

  const CreateUserModal = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);
      setError('');
      
      const res = await register(name, email, password, true);
      if (res.success) {
        setShowCreateModal(false);
      } else {
        setError(res.message);
      }
      setIsSaving(false);
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                <UserPlus size={20} />
              </div>
              <h3 className="text-xl font-black text-white">Criar Membro</h3>
            </div>
            <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-full">
              <X size={20} />
            </button>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Nome Completo</label>
              <div className="relative">
                <input 
                  autoFocus required type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all pl-11 text-white"
                  placeholder="Nome do usuário"
                />
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">E-mail</label>
              <div className="relative">
                <input 
                  required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all pl-11 text-white"
                  placeholder="email@exemplo.com"
                />
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Senha de Acesso</label>
              <div className="relative">
                <input 
                  required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all pl-11 text-white"
                  placeholder="Mínimo 6 caracteres"
                />
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              </div>
            </div>
            
            <button 
              type="submit" disabled={isSaving}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-500 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 text-xs shadow-xl shadow-blue-500/20 uppercase tracking-widest"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Concluir Cadastro'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const EditUserModal = () => {
    const isRootAdmin = editingUser?.email === 'joaquimcdacruz@gmail.com';
    const [name, setName] = useState(editingUser?.name || '');
    const [role, setRole] = useState(editingUser?.role || 'user');
    const [plan, setPlan] = useState(editingUser?.plan || 'free');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
      if (!editingUser) return;
      setIsSaving(true);
      
      // Salva nome
      if (name !== editingUser.name) await updateProfile(name, editingUser.id);
      
      // Salva role (protegido pelo store, mas bom evitar a chamada se desabilitado)
      if (!isRootAdmin && role !== editingUser.role) await toggleUserRole(editingUser.id);
      
      // Salva plano
      if (plan !== editingUser.plan) await updatePlan(editingUser.id, plan as 'free' | 'premium', 'Individual');

      setIsSaving(false);
      setEditingUser(null);
      fetchUsers(); // Refresh global
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/20 text-indigo-500 rounded-xl flex items-center justify-center">
                <Edit2 size={20} />
              </div>
              Gestão de Conta
            </h3>
            <button onClick={() => setEditingUser(null)} className="text-zinc-500 hover:text-white p-2 hover:bg-zinc-800 rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Nome Completo</label>
              <input 
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-white font-bold"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Papel (Role)</label>
                <div className="relative">
                  <select 
                    value={role} onChange={(e) => setRole(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-white appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isRootAdmin}
                  >
                    <option value="user">Usuário Comum</option>
                    <option value="admin">Administrador</option>
                  </select>
                  {isRootAdmin && (
                    <div className="absolute inset-y-0 right-3 flex items-center" title="Root Admin">
                      <ShieldAlert size={14} className="text-blue-500"/>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block ml-1">Plano Atual</label>
                <select 
                  value={plan} onChange={(e) => setPlan(e.target.value as any)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-white appearance-none"
                >
                  <option value="free">Standard (Free)</option>
                  <option value="premium">Premium Pro</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800 flex items-center justify-between">
               <div className="flex items-center gap-3 text-zinc-500">
                  <Mail size={16} />
                  <span className="text-xs font-medium">{editingUser?.email}</span>
               </div>
               {isRootAdmin && (
                 <span className="text-[9px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md font-black uppercase">Root</span>
               )}
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setEditingUser(null)}
                className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-black rounded-2xl hover:bg-zinc-700 transition-all text-[10px] uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-4 bg-indigo-500 text-white font-black rounded-2xl hover:bg-indigo-400 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-7xl mx-auto">
      {editingUser && <EditUserModal />}
      {showCreateModal && <CreateUserModal />}
      {fulfillingRequest && <FulfillModal />}
      {assigningTrack && <AssignModal />}
      {showFixModal && <RlsFixModal />}
      {assigningAlbum && (
        <AssignAlbumModal 
          isOpen={!!assigningAlbum}
          onClose={() => setAssigningAlbum(null)}
          album={assigningAlbum}
          onAssignAlbum={handleAssignAlbum}
        />
      )}
      
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
            <ShieldCheck size={14} /> Sistema de Governança
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight flex items-center gap-4">
            Painel Central de Admin
          </h2>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh}
            className={`p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all shadow-xl ${isRefreshing ? 'animate-spin text-blue-500' : ''}`}
          >
            <RefreshCw size={20} />
          </button>
          <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md">
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center px-5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
            >
              <Users size={16} className="mr-2" /> Membros
            </button>
            <button 
              onClick={() => setActiveTab('music')}
              className={`flex items-center px-5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'music' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
            >
              <Music size={16} className="mr-2" /> Catálogo
            </button>
            <button 
              onClick={() => setActiveTab('requests')}
              className={`flex items-center px-5 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
            >
              <MessageSquare size={16} className="mr-2" /> Pedidos
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content Section */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        {activeTab !== 'requests' && (
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-zinc-900/20">
            <h4 className="font-black text-sm uppercase tracking-[0.2em] text-zinc-400">
              {activeTab === 'users' ? 'Gestão de Credenciais' : 'Diretório de Mídia'}
            </h4>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              {activeTab === 'music' && (
                <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
                  <button 
                    onClick={() => setActiveMusicSubTab('albums')}
                    className={`flex items-center px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeMusicSubTab === 'albums' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
                  >
                    <Disc size={14} className="mr-2" /> Álbuns
                  </button>
                  <button 
                    onClick={() => setActiveMusicSubTab('tracks')}
                    className={`flex items-center px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeMusicSubTab === 'tracks' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
                  >
                    <Music size={14} className="mr-2" /> Faixas
                  </button>
                </div>
              )}
              <div className="relative flex-1 sm:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome, e-mail ou identificador..."
                  className="bg-zinc-950/50 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 w-full transition-all text-white placeholder:text-zinc-700 font-medium"
                />
              </div>
              {activeTab === 'users' && (
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shrink-0 shadow-xl shadow-blue-500/20 uppercase tracking-widest"
                >
                  <UserPlus size={18} /> Novo
                </button>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {activeTab === 'requests' ? (
             <div className="min-h-[400px]">
               <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requests.map(req => (
                    <div key={req.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between shadow-lg">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className={`w-2 h-2 rounded-full ${req.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{req.status === 'completed' ? 'Atendido' : 'Pendente'}</p>
                        </div>
                        <h4 className="font-bold text-lg text-white truncate">{req.title}</h4>
                        <p className="text-sm text-zinc-400 font-medium truncate">{req.artist}</p>
                        {req.genre && (
                            <p className="text-[10px] text-purple-400 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                                <Tag size={10} /> {req.genre}
                            </p>
                        )}
                        <p className="text-xs text-zinc-600 mt-2">Solicitado por: <span className="text-zinc-300">{req.user_name}</span></p>
                      </div>
                      
                      <div className="ml-4 shrink-0">
                          {req.status === 'pending' && (
                            <button 
                              onClick={() => setFulfillingRequest(req)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                              <CheckCircle size={14} /> Atender
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                  {requests.length === 0 && (
                     <div className="col-span-2 text-center py-20 text-zinc-500">Nenhuma solicitação encontrada.</div>
                  )}
               </div>
             </div>
          ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 bg-zinc-950/30">
                <th className="px-8 py-5">Identidade do Membro/Mídia</th>
                <th className="px-8 py-5">Detalhes</th>
                <th className="px-8 py-5">Registro</th>
                <th className="px-8 py-5 text-right">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeTab === 'users' ? (
                filteredUsers.map(user => {
                  const isRootAdmin = user.email === 'joaquimcdacruz@gmail.com';
                  return (
                    <tr key={user.id} className={`group/row hover:bg-white/[0.02] transition-colors ${user.id === currentUser?.id ? 'bg-blue-500/5' : ''}`}>
                      <td className="px-8 py-5">
                        <div className="flex items-center">
                          <div className={`w-11 h-11 rounded-2xl mr-4 flex items-center justify-center font-black text-sm shadow-2xl shrink-0 transition-transform group-hover/row:scale-110 ${user.role === 'admin' ? 'bg-gradient-to-br from-blue-400 to-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate flex items-center gap-2">
                              {user.name}
                              {isRootAdmin && (
                                <div title="Root Admin">
                                  <ShieldAlert size={14} className="text-blue-500" />
                                </div>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate font-medium">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider w-fit flex items-center gap-1.5 ${user.plan === 'premium' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30'}`}>
                            {user.plan === 'premium' ? <Crown size={10} /> : null} {user.plan}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider w-fit border ${user.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-zinc-800/50 text-zinc-600 border-zinc-700/30'}`}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2 text-zinc-600 text-[10px] font-black">
                            <Calendar size={12} />
                            {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Sem data'}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover/row:opacity-100 transition-all transform translate-x-2 group-hover/row:translate-x-0">
                          <button onClick={() => setEditingUser(user)} className="p-2.5 bg-zinc-800/50 hover:bg-indigo-500 hover:text-white rounded-xl text-zinc-400 transition-all"><Edit2 size={16} /></button>
                          {!isRootAdmin && (
                            <button 
                              onClick={() => { if (confirm(`Deseja EXCLUIR permanentemente ${user.name}?`)) deleteUser(user.id); }}
                              disabled={currentUser?.id === user.id}
                              className={`p-2.5 bg-zinc-800/50 hover:bg-red-500 hover:text-white rounded-xl text-zinc-400 transition-all disabled:opacity-0`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : activeMusicSubTab === 'albums' ? (
                filteredAlbums.map(album => (
                  <tr key={album.id} className="group/album hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <img src={album.image_url} className="w-11 h-11 rounded-2xl mr-4 object-cover border border-white/5 shadow-2xl transition-transform group-hover/album:scale-110" />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{album.name}</div>
                          <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest truncate">{album.artist_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-[9px] bg-zinc-800/50 border border-zinc-700/30 px-2 py-1 rounded-lg text-zinc-400 font-black uppercase tracking-widest">ÁLBUM</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-zinc-600 font-mono text-[10px]">
                        <Calendar size={12} />
                        {new Date(album.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setAssigningAlbum(album)} className="p-2.5 bg-zinc-800/50 hover:bg-green-600 hover:text-white rounded-xl text-zinc-400 transition-all opacity-0 group-hover/album:opacity-100" title="Encaminhar álbum para usuário">
                          <Forward size={16} />
                        </button>
                        <button onClick={() => { if (confirm(`Excluir álbum "${album.name}" e todas as suas faixas?`)) { /* Lógica de exclusão de álbum */ } }} className="p-2.5 bg-zinc-800/50 hover:bg-red-500 hover:text-white rounded-xl text-zinc-400 transition-all opacity-0 group-hover/album:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : ( // activeMusicSubTab === 'tracks'
                filteredMusic.map(track => (
                  <tr key={track.id} className="group/track hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <img src={track.track_image || track.album_image} className="w-11 h-11 rounded-2xl mr-4 object-cover border border-white/5 shadow-2xl transition-transform group-hover/track:scale-110" />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate">{track.name}</div>
                          <div className="text-[9px] text-zinc-500 uppercase font-black tracking-widest truncate">{track.artist_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="text-[9px] bg-zinc-800/50 border border-zinc-700/30 px-2 py-1 rounded-lg text-zinc-400 font-black uppercase tracking-widest">{track.format || 'mp3'}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-zinc-600 font-mono text-[10px]">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setAssigningTrack(track)} className="p-2.5 bg-zinc-800/50 hover:bg-green-600 hover:text-white rounded-xl text-zinc-400 transition-all opacity-0 group-hover/track:opacity-100" title="Encaminhar para usuário">
                          <Forward size={16} />
                        </button>
                        <button onClick={() => { if (confirm(`Excluir "${track.name}"?`)) removeUploadedTrack(track.id); }} className="p-2.5 bg-zinc-800/50 hover:bg-red-500 hover:text-white rounded-xl text-zinc-400 transition-all opacity-0 group-hover/track:opacity-100"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
          
          {(activeTab === 'users' ? filteredUsers : activeMusicSubTab === 'albums' ? filteredAlbums : filteredMusic).length === 0 && activeTab !== 'requests' && (
            <div className="py-32 text-center">
              <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-700">
                 <Search size={32} />
              </div>
              <p className="text-zinc-500 font-bold">Nenhum registro encontrado para sua busca.</p>
              <button onClick={() => setSearchTerm('')} className="text-blue-500 text-[10px] font-black mt-4 uppercase tracking-[0.2em] hover:text-blue-400 transition-colors">Limpar filtros</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;