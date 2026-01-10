import React, { useState, useRef, RefObject } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useMusicStore } from '../store';
import { Disc, ImageIcon, Loader2 } from 'lucide-react';
import { Album } from '../types';
import AlbumItemAdmin from './AlbumItemAdmin'; // Importar o novo componente

interface AlbumManagementProps {
  onPlayAlbum: (album: Album) => Promise<void>;
  isAlbumLoading: string | null;
}

const AlbumManagement: React.FC<AlbumManagementProps> = ({ onPlayAlbum, isAlbumLoading }) => {
  const { currentUser } = useAuthStore();
  const { addNotification, updateAlbumCover } = useMusicStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedAlbumForUpload, setSelectedAlbumForUpload] = useState<Album | null>(null);

  const { data: localAlbums, isLoading: isLocalAlbumsLoading, refetch: refetchLocalAlbums } = useQuery<Album[]>({
    queryKey: ['local-albums-management', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      let query = supabase
        .from('albums')
        .select('id, name, artist_name, image_url, user_id, created_at');

      if (currentUser.role !== 'admin') {
        query = query.eq('user_id', currentUser.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar álbuns para gerenciamento:", error);
        return [];
      }
      
      return data || [];
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
      const filePath = `${currentUser.id}/album_covers/${selectedAlbumForUpload.id}.${fileExt}`;

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

      // 3. Atualiza o estado global
      updateAlbumCover(selectedAlbumForUpload.id, publicUrl);
      addNotification('Capa do álbum atualizada com sucesso!', 'success');
      refetchLocalAlbums();

    } catch (error: any) {
      console.error('Erro ao atualizar capa do álbum:', error);
      addNotification(`Erro ao atualizar capa: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
      setIsUploadingImage(false);
      setSelectedAlbumForUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Funções dummy para AlbumManagement (já que ele não tem delete/assign)
  const dummyDelete = () => addNotification("Funcionalidade de exclusão de álbum disponível apenas no Painel Admin.", "info");
  const dummyAssign = () => addNotification("Funcionalidade de encaminhamento de álbum disponível apenas no Painel Admin.", "info");

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
            <AlbumItemAdmin 
              key={album.id} 
              album={album} 
              isUploadingImage={isUploadingImage} 
              selectedAlbumForUpload={selectedAlbumForUpload} 
              setSelectedAlbumForUpload={setSelectedAlbumForUpload} 
              fileInputRef={fileInputRef as RefObject<HTMLInputElement>} 
              onDeleteAlbum={dummyDelete}
              onAssignAlbum={dummyAssign}
              onPlayAlbum={onPlayAlbum}
              showAdminControls={false} // Desativa controles de Admin aqui
              isAlbumLoading={isAlbumLoading}
            />
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