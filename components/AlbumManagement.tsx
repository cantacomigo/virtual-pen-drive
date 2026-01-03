import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useMusicStore } from '../store';
import { Disc, ImageIcon, Loader2, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface Album {
  id: string; // Usaremos o nome do álbum como ID único para a UI
  name: string;
  artist_name: string;
  image: string;
  isLocal: boolean;
}

const AlbumManagement: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { addNotification, updateAlbumImage } = useMusicStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedAlbumForUpload, setSelectedAlbumForUpload] = useState<Album | null>(null);

  const { data: localAlbums, isLoading: isLocalAlbumsLoading, refetch: refetchLocalAlbums } = useQuery<Album[]>({
    queryKey: ['local-albums-management', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      let query = supabase
        .from('tracks')
        .select('album_name, album_image, artist_name')
        .not('album_name', 'is', null);

      if (currentUser.role !== 'admin') {
        query = query.eq('user_id', currentUser.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Erro ao buscar álbuns para gerenciamento:", error);
        return [];
      }
      
      const albumsMap = new Map<string, Album>();
      
      data.forEach(track => {
        if (!track.album_name) return;
        
        const cleanAlbum = track.album_name.trim();
        const cleanArtist = track.artist_name ? track.artist_name.trim() : 'Desconhecido';
        
        const key = `${cleanAlbum.toLowerCase()}-${cleanArtist.toLowerCase()}`; 
        
        if (!albumsMap.has(key)) {
          albumsMap.set(key, {
            id: key, // Usar uma combinação de álbum e artista como ID único
            name: cleanAlbum, 
            artist_name: cleanArtist,
            image: track.album_image || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300",
            isLocal: true
          });
        } else {
          // Se já existe, e o artista é diferente, pode ser um álbum com vários artistas
          const existing = albumsMap.get(key);
          if (existing && existing.artist_name !== 'Vários Artistas' && existing.artist_name.toLowerCase() !== cleanArtist.toLowerCase()) {
            existing.artist_name = 'Vários Artistas';
          }
        }
      });
      return Array.from(albumsMap.values());
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!currentUser
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAlbumForUpload || !currentUser) return;

    setIsUploadingImage(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${currentUser.id}/album_covers/${selectedAlbumForUpload.name}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);

      // Atualiza o banco de dados para TODAS as faixas com o mesmo álbum e artista
      const { error: dbError } = await supabase
        .from('tracks')
        .update({ album_image: publicUrl })
        .eq('album_name', selectedAlbumForUpload.name)
        .eq('artist_name', selectedAlbumForUpload.artist_name);

      if (dbError) throw dbError;

      // Atualiza o estado global do Zustand para todas as faixas do álbum
      updateAlbumImage(selectedAlbumForUpload.name, selectedAlbumForUpload.artist_name, publicUrl);
      addNotification('Capa do álbum atualizada com sucesso!', 'success');
      refetchLocalAlbums(); // Refetch para atualizar a lista de álbuns no componente

    } catch (error: any) {
      console.error('Erro ao atualizar capa do álbum:', error);
      addNotification(`Erro ao atualizar capa: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsUploadingImage(false);
      setSelectedAlbumForUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pt-10 px-4 pb-32 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/10">
          <Disc size={32} />
        </div>
        <h1 className="text-4xl font-black mb-4">Gerenciamento de Álbuns</h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Visualize e atualize as capas dos seus álbuns de forma centralizada.
        </p>
      </div>

      {isLocalAlbumsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-square bg-zinc-900 animate-pulse rounded-2xl shadow-lg" />
          ))}
        </div>
      ) : localAlbums && localAlbums.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {localAlbums.map(album => (
            <div key={album.id} className="group bg-zinc-900/40 p-4 rounded-3xl hover:bg-zinc-800/60 transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-xl relative">
              <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl">
                <img src={album.image} alt={album.name} className="w-full h-full object-cover shadow-2xl transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedAlbumForUpload(album); fileInputRef.current?.click(); }}
                    disabled={isUploadingImage}
                    className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 active:scale-90 disabled:opacity-50"
                  >
                    {isUploadingImage && selectedAlbumForUpload?.id === album.id ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                  </button>
                </div>
              </div>
              <div>
                <h4 className="font-bold truncate text-sm lg:text-base text-zinc-100">{album.name}</h4>
                <p className="text-[10px] lg:text-xs text-zinc-500 truncate font-semibold mt-0.5">{album.artist_name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-[32px] bg-zinc-900/20">
          <Disc size={64} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg text-zinc-400">Nenhum álbum encontrado em sua biblioteca.</p>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto mt-2">Faça upload de músicas para que seus álbuns apareçam aqui.</p>
        </div>
      )}

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

export default AlbumManagement;