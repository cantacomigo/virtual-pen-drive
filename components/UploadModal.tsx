import React, { useState, useRef, useCallback } from 'react';
import { X, Loader2, AlertCircle, Upload, Image as ImageIcon, Music as MusicIcon, CheckCircle2, Trash2, Plus, FileAudio, Edit2, Save, Layers, Wand2 } from 'lucide-react';
import { useMusicStore } from '../store';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { JamendoTrack, Album } from '../types';

// Acessa o jsmediatags carregado via script tag no index.html
declare var jsmediatags: any;

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PendingTrack {
  id: string; // ID temporário para a UI
  file: File;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  duration: number;
  coverFile: File | null; // Capa extraída do metadata ou fornecida
  coverPreview: string | null; // URL de preview da capa
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuthStore();
  const { addUploadedTrack, addNotification } = useMusicStore((state) => state);
  
  const [pendingTracks, setPendingTracks] = useState<PendingTrack[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Batch Edit State
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchForm, setBatchForm] = useState({ artist: '', album: '', genre: '', year: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper: Get Audio Duration
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });
  };

  // Helper: Extract Metadata using jsmediatags
  const extractMetadata = (file: File): Promise<Partial<PendingTrack>> => {
    return new Promise((resolve) => {
      if (typeof jsmediatags === 'undefined') {
        resolve({}); 
        return;
      }

      jsmediatags.read(file, {
        onSuccess: (tag: any) => {
          const { title, artist, album, year, genre, picture } = tag.tags;
          let coverData: Partial<PendingTrack> = {};

          if (picture) {
            try {
              const { data, format } = picture;
              const uint8Array = new Uint8Array(data);
              const blob = new Blob([uint8Array], { type: format });
              const url = URL.createObjectURL(blob);
              coverData = {
                coverPreview: url,
                coverFile: new File([blob], "cover_metadata.jpg", { type: format })
              };
            } catch (e) {
              console.warn("Erro ao processar imagem da tag", e);
            }
          }

          resolve({
            title: title || file.name.replace(/\.[^/.]+$/, ""),
            artist: artist || '',
            album: album || '',
            year: year || '',
            genre: genre || '',
            ...coverData
          });
        },
        onError: () => {
          resolve({ title: file.name.replace(/\.[^/.]+$/, "") });
        }
      });
    });
  };

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    setGlobalError(null);

    const newTracks: PendingTrack[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Skip non-audio files if browser allows them through
      if (!file.type.startsWith('audio/')) continue;

      try {
        const duration = await getAudioDuration(file);
        const metadata = await extractMetadata(file);

        newTracks.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
          artist: metadata.artist || 'Artista Desconhecido',
          album: metadata.album || 'Upload Local',
          genre: metadata.genre || '',
          year: metadata.year || '',
          duration,
          coverFile: metadata.coverFile || null,
          coverPreview: metadata.coverPreview || null,
          status: 'pending'
        });
      } catch (err) {
        console.error(`Erro ao processar arquivo ${file.name}`, err);
      }
    }

    setPendingTracks(prev => [...prev, ...newTracks]);
    setIsProcessingFiles(false);
    
    // Reset input to allow selecting the same files again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateTrackInfo = (id: string, field: keyof PendingTrack, value: any) => {
    setPendingTracks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTrack = (id: string) => {
    setPendingTracks(prev => {
      const track = prev.find(t => t.id === id);
      if (track && track.coverPreview) URL.revokeObjectURL(track.coverPreview);
      return prev.filter(t => t.id !== id);
    });
  };

  const applyBatchMetadata = () => {
    const { artist, album, genre, year } = batchForm;
    if (!artist && !album && !genre && !year) return;

    setPendingTracks(prev => prev.map(t => {
       if (t.status !== 'pending') return t;
       return {
         ...t,
         artist: artist || t.artist,
         album: album || t.album,
         genre: genre || t.genre,
         year: year || t.year
       };
    }));
    
    addNotification('Dados aplicados a todas as faixas!', 'success');
    setShowBatchEdit(false);
  };

  const handleUploadAll = async () => {
    if (!currentUser) return;
    
    setIsUploading(true);
    setGlobalError(null);

    // Processa sequencialmente para não sobrecarregar conexões
    for (let i = 0; i < pendingTracks.length; i++) {
      const track = pendingTracks[i];
      
      // Pula se já foi enviado com sucesso
      if (track.status === 'success') continue;

      // Atualiza status para uploading
      setPendingTracks(prev => prev.map(t => t.id === track.id ? { ...t, status: 'uploading' } : t));

      try {
        const cleanTitle = track.title.trim() || track.file.name.replace(/\.[^/.]+$/, "");
        const cleanArtist = track.artist.trim() || 'Desconhecido';
        const cleanAlbum = track.album.trim() || 'Upload Local';
        const defaultCoverUrl = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300";

        // 1. Upload Audio
        const audioExt = track.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${audioExt}`;
        const audioPath = `${currentUser.id}/${fileName}`;

        console.log(`[UploadModal] Tentando upload de áudio para: ${audioPath}`);
        const { error: audioError } = await supabase.storage
          .from('audio')
          .upload(audioPath, track.file);

        if (audioError) throw audioError;

        const { data: { publicUrl: audioUrl } } = supabase.storage.from('audio').getPublicUrl(audioPath);
        console.log(`[UploadModal] Public URL do áudio: ${audioUrl}`);


        // 2. Gerenciar Álbum (criar ou encontrar existente)
        let albumId: string;
        let albumImageUrl: string = defaultCoverUrl;

        // Tenta encontrar álbum existente
        const { data: existingAlbum, error: albumFetchError } = await supabase
          .from('albums')
          .select('id, image_url')
          .eq('user_id', currentUser.id)
          .ilike('name', cleanAlbum)
          .ilike('artist_name', cleanArtist)
          .limit(1)
          .maybeSingle();

        if (albumFetchError) throw albumFetchError;

        if (existingAlbum) {
          albumId = existingAlbum.id;
          albumImageUrl = existingAlbum.image_url || defaultCoverUrl;
          console.log(`[UploadModal] Álbum existente encontrado: ${cleanAlbum}, ID: ${albumId}`);
        } else {
          // Se o álbum não existe, cria um novo
          let uploadedAlbumCoverUrl = defaultCoverUrl;
          if (track.coverFile) {
            const coverExt = track.coverFile.type.split('/')[1] || 'jpg';
            const coverPath = `${currentUser.id}/album_covers/${cleanAlbum}-${Date.now()}.${coverExt}`;
            console.log(`[UploadModal] Tentando upload de capa de álbum para: ${coverPath}`);
            const { error: coverUploadError } = await supabase.storage.from('images').upload(coverPath, track.coverFile);
            if (!coverUploadError) {
              uploadedAlbumCoverUrl = supabase.storage.from('images').getPublicUrl(coverPath).data.publicUrl;
              console.log(`[UploadModal] Public URL da capa do álbum: ${uploadedAlbumCoverUrl}`);
            } else {
              console.warn(`[UploadModal] Erro ao fazer upload da capa do álbum: ${coverUploadError.message}`);
            }
          }

          const { data: newAlbum, error: newAlbumError } = await supabase
            .from('albums')
            .insert({
              user_id: currentUser.id,
              name: cleanAlbum,
              artist_name: cleanArtist,
              image_url: uploadedAlbumCoverUrl
            })
            .select('id, image_url')
            .single();

          if (newAlbumError) throw newAlbumError;
          albumId = newAlbum.id;
          albumImageUrl = newAlbum.image_url || defaultCoverUrl;
          console.log(`[UploadModal] Novo álbum criado: ${cleanAlbum}, ID: ${albumId}`);
        }

        // 3. Upload da imagem da faixa (se houver uma específica)
        let trackImageUrl: string | undefined = undefined;
        if (track.coverFile) { // Se o usuário forneceu uma capa específica para esta faixa
          const coverExt = track.coverFile.type.split('/')[1] || 'jpg';
          const trackCoverPath = `${currentUser.id}/track_covers/${cleanTitle}-${Date.now()}.${coverExt}`;
          console.log(`[UploadModal] Tentando upload de capa da faixa para: ${trackCoverPath}`);
          const { error: trackCoverUploadError } = await supabase.storage.from('images').upload(trackCoverPath, track.coverFile);
          if (!trackCoverUploadError) {
            trackImageUrl = supabase.storage.from('images').getPublicUrl(trackCoverPath).data.publicUrl;
            console.log(`[UploadModal] Public URL da capa da faixa: ${trackImageUrl}`);
          } else {
            console.warn(`[UploadModal] Erro ao fazer upload da capa da faixa: ${trackCoverUploadError.message}`);
          }
        }
        // Se não houver track_image específica, ela será nula no DB e o frontend usará a album_image

        // 4. Insert into DB
        const trackData = {
          user_id: currentUser.id,
          name: cleanTitle,
          artist_name: cleanArtist,
          album_id: albumId, // Usar o ID do álbum
          album_name: cleanAlbum, // Manter album_name para facilitar a busca
          track_image: trackImageUrl, // Imagem específica da faixa
          audio_url: audioUrl,
          format: audioExt,
          duration: Math.floor(track.duration),
          genre: track.genre.trim(),
          year: track.year.trim()
        };
        console.log(`[UploadModal] Inserindo track no DB:`, trackData);

        const { data: insertedTrack, error: dbError } = await supabase
          .from('tracks')
          .insert(trackData)
          .select()
          .single();

        if (dbError) throw dbError;
        console.log(`[UploadModal] Track inserida com sucesso:`, insertedTrack);

        // 5. Update Global Store
        const trackToAdd: JamendoTrack = {
          id: insertedTrack.id,
          name: insertedTrack.name,
          artist_name: insertedTrack.artist_name,
          album_id: insertedTrack.album_id,
          album_name: insertedTrack.album_name,
          album_image: albumImageUrl, // Usar a imagem do álbum associado
          track_image: insertedTrack.track_image, // Imagem específica da faixa
          audio: insertedTrack.audio_url,
          audiodownload: insertedTrack.audio_url,
          duration: insertedTrack.duration,
          format: insertedTrack.format,
          genre: insertedTrack.genre,
          year: insertedTrack.year,
          artist_id: 'local-artist',
          isLocal: true
        };
        addUploadedTrack(trackToAdd);

        // Mark as success
        setPendingTracks(prev => prev.map(t => t.id === track.id ? { ...t, status: 'success' } : t));

      } catch (err: any) {
        console.error(err);
        let msg = 'Erro desconhecido';
        if (err && typeof err === 'object') {
           if (err.message) msg = err.message;
           else if (err.error_description) msg = err.error_description;
           else msg = JSON.stringify(err);
        } else if (typeof err === 'string') {
           msg = err;
        }
        
        // Improve RLS error message for user
        if (msg.includes('row-level security')) {
            msg = "Permissão negada. Contate o administrador para liberar uploads.";
        }

        setPendingTracks(prev => prev.map(t => t.id === track.id ? { ...t, status: 'error', errorMessage: msg } : t));
      }
    }

    setIsUploading(false);
    // Se todos foram sucesso, fecha após 1.5s
    const allSuccess = pendingTracks.every(t => t.status === 'success');
    if (allSuccess) {
       setTimeout(() => {
         onClose();
         // Limpa estado ao fechar
         setPendingTracks([]);
       }, 1500);
    }
  };

  const handleCoverChange = (id: string, file: File) => {
    const url = URL.createObjectURL(file);
    setPendingTracks(prev => prev.map(t => {
      if (t.id === id) {
        if (t.coverPreview) URL.revokeObjectURL(t.coverPreview);
        return { ...t, coverFile: file, coverPreview: url };
      }
      return t;
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <div className="w-full max-w-4xl bg-[#0f0f0f] border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shrink-0" />
        <button onClick={onClose} disabled={isUploading} className="absolute top-6 right-6 z-10 p-2 bg-black/50 text-zinc-400 hover:text-white hover:bg-black rounded-full transition-all disabled:opacity-50">
          <X size={20} />
        </button>
        
        <div className="p-8 pb-4 shrink-0">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Upload className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Envio de Músicas</h2>
              <p className="text-zinc-500 text-sm font-medium">Carregue faixas individuais ou álbuns inteiros.</p>
            </div>
          </div>
        </div>

        {globalError && (
          <div className="mx-8 mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-3">
            <AlertCircle size={18} /> {globalError}
          </div>
        )}

        {/* Batch Edit Control */}
        {pendingTracks.length > 1 && !isUploading && (
          <div className="mx-8 mb-4">
             {!showBatchEdit ? (
                <button 
                  onClick={() => setShowBatchEdit(true)} 
                  className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-2 uppercase tracking-wider"
                >
                  <Layers size={14} /> Editar em Lote (Álbum, Artista...)
                </button>
             ) : (
                <div className="bg-zinc-900/80 border border-blue-500/30 p-4 rounded-2xl animate-in slide-in-from-top-2">
                   <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <Wand2 size={14} /> Aplicar a todos
                      </h4>
                      <button onClick={() => setShowBatchEdit(false)} className="text-zinc-500 hover:text-white"><X size={14}/></button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <input 
                        placeholder="Artista Global..." 
                        value={batchForm.artist}
                        onChange={e => setBatchForm({...batchForm, artist: e.target.value})}
                        className="bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                      />
                      <input 
                        placeholder="Nome do Álbum..." 
                        value={batchForm.album}
                        onChange={e => setBatchForm({...batchForm, album: e.target.value})}
                        className="bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                      />
                      <input 
                        placeholder="Gênero..." 
                        value={batchForm.genre}
                        onChange={e => setBatchForm({...batchForm, genre: e.target.value})}
                        className="bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                      />
                      <input 
                        placeholder="Ano..." 
                        value={batchForm.year}
                        onChange={e => setBatchForm({...batchForm, year: e.target.value})}
                        className="bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:border-blue-500 outline-none"
                      />
                   </div>
                   <button 
                     onClick={applyBatchMetadata}
                     className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs uppercase tracking-widest transition-all"
                   >
                     Aplicar
                   </button>
                </div>
             )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-2 min-h-[300px]">
          {pendingTracks.length === 0 ? (
            <div 
              onClick={() => !isProcessingFiles && fileInputRef.current?.click()}
              className={`h-full border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center transition-all flex flex-col items-center justify-center gap-4 ${isProcessingFiles ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5'}`}
            >
              {isProcessingFiles ? (
                <>
                  <Loader2 size={48} className="text-blue-500 animate-spin" />
                  <p className="text-zinc-400 font-bold">Processando arquivos...</p>
                </>
              ) : (
                <>
                  <div className="p-5 bg-zinc-900 rounded-full group-hover:scale-110 transition-all">
                    <MusicIcon size={32} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white mb-1">Clique para selecionar arquivos</p>
                    <p className="text-zinc-500 text-sm font-medium">Suporta múltiplos arquivos (MP3, WAV, OGG)</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTracks.map((track, index) => (
                <div key={track.id} className={`bg-zinc-900/50 border rounded-2xl p-4 flex gap-4 transition-all ${track.status === 'error' ? 'border-red-500/30 bg-red-500/5' : track.status === 'success' ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800'}`}>
                  {/* Cover */}
                  <div className="relative group/cover shrink-0 w-20 h-20">
                     <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 relative">
                       {track.coverPreview ? (
                         <img src={track.coverPreview} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-zinc-700">
                           <MusicIcon size={20} />
                         </div>
                       )}
                       {track.status === 'pending' && (
                         <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <ImageIcon className="text-white" size={16} />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => e.target.files?.[0] && handleCoverChange(track.id, e.target.files[0])}
                            />
                         </label>
                       )}
                     </div>
                  </div>

                  {/* Fields */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                    <div className="space-y-1">
                       <input 
                         className="w-full bg-transparent border-b border-zinc-800 focus:border-blue-500 text-sm font-bold text-white px-1 py-1 outline-none placeholder:text-zinc-700"
                         placeholder="Título"
                         value={track.title}
                         onChange={e => updateTrackInfo(track.id, 'title', e.target.value)}
                         disabled={track.status !== 'pending'}
                       />
                       <input 
                         className="w-full bg-transparent border-b border-zinc-800 focus:border-blue-500 text-xs text-zinc-400 px-1 py-1 outline-none placeholder:text-zinc-700"
                         placeholder="Artista"
                         value={track.artist}
                         onChange={e => updateTrackInfo(track.id, 'artist', e.target.value)}
                         disabled={track.status !== 'pending'}
                       />
                    </div>
                    <div className="space-y-1">
                       <input 
                         className="w-full bg-transparent border-b border-zinc-800 focus:border-blue-500 text-xs text-zinc-400 px-1 py-1 outline-none placeholder:text-zinc-700"
                         placeholder="Álbum"
                         value={track.album}
                         onChange={e => updateTrackInfo(track.id, 'album', e.target.value)}
                         disabled={track.status !== 'pending'}
                       />
                       <div className="flex gap-2">
                         <input 
                           className="w-1/2 bg-transparent border-b border-zinc-800 focus:border-blue-500 text-[10px] text-zinc-500 px-1 py-1 outline-none placeholder:text-zinc-700"
                           placeholder="Gênero"
                           value={track.genre}
                           onChange={e => updateTrackInfo(track.id, 'genre', e.target.value)}
                           disabled={track.status !== 'pending'}
                         />
                         <input 
                           className="w-1/2 bg-transparent border-b border-zinc-800 focus:border-blue-500 text-[10px] text-zinc-500 px-1 py-1 outline-none placeholder:text-zinc-700"
                           placeholder="Ano"
                           value={track.year}
                           onChange={e => updateTrackInfo(track.id, 'year', e.target.value)}
                           disabled={track.status !== 'pending'}
                         />
                       </div>
                    </div>
                  </div>

                  {/* Status/Action */}
                  <div className="flex flex-col items-end justify-between shrink-0 pl-2 border-l border-zinc-800/50">
                    <div className="text-[10px] font-mono text-zinc-600">
                      {Math.floor(track.duration / 60)}:{(Math.floor(track.duration) % 60).toString().padStart(2, '0')}
                    </div>
                    
                    {track.status === 'pending' && (
                      <button onClick={() => removeTrack(track.id)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    )}
                    {track.status === 'uploading' && <Loader2 size={18} className="text-blue-500 animate-spin" />}
                    {track.status === 'success' && <CheckCircle2 size={18} className="text-green-500" />}
                    {track.status === 'error' && (
                      <div title={track.errorMessage}>
                        <AlertCircle size={18} className="text-red-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!isUploading && (
                 <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                 >
                   <Plus size={14} /> Adicionar mais arquivos
                 </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-8 pt-4 border-t border-zinc-800 bg-[#0f0f0f] shrink-0 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-medium">
             {pendingTracks.length > 0 && (
               <span>{pendingTracks.filter(t => t.status === 'success').length} / {pendingTracks.length} enviados</span>
             )}
          </div>
          
          <div className="flex gap-4">
             {!isUploading && pendingTracks.length > 0 && pendingTracks.some(t => t.status !== 'success') && (
               <button onClick={() => setPendingTracks([])} className="px-6 py-3 text-zinc-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                 Limpar Tudo
               </button>
             )}
             
             {pendingTracks.length > 0 && pendingTracks.some(t => t.status !== 'success') && (
               <button 
                 onClick={handleUploadAll}
                 disabled={isUploading}
                 className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-8 py-3 rounded-xl font-black text-white text-xs flex items-center gap-2 shadow-xl shadow-blue-500/20 uppercase tracking-widest transition-all"
               >
                 {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                 {isUploading ? 'Enviando...' : 'Enviar Todos'}
               </button>
             )}
             
             {pendingTracks.length > 0 && pendingTracks.every(t => t.status === 'success') && (
                <button 
                 onClick={onClose}
                 className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl font-black text-white text-xs flex items-center gap-2 shadow-xl shadow-green-500/20 uppercase tracking-widest transition-all"
               >
                 <CheckCircle2 size={16} /> Concluído
               </button>
             )}
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFilesSelect} 
          accept="audio/*" 
          multiple 
          className="hidden" 
        />
      </div>
    </div>
  );
};

export default UploadModal;