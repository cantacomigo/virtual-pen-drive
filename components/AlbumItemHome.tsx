import React from 'react';
import { Play, Disc, Loader2 } from 'lucide-react';
import { Album } from '../types';
import { useSignedUrl } from '../src/hooks/useSignedUrl';

interface AlbumItemHomeProps {
  album: Album;
  onPlayAlbum: (album: Album) => Promise<void>;
  isAlbumLoading: string | null;
}

const AlbumItemHome: React.FC<AlbumItemHomeProps> = ({ album, onPlayAlbum, isAlbumLoading }) => {
  // Usar o hook para obter a URL assinada
  const signedImageUrl = useSignedUrl(album.image_url, 'images');

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayAlbum(album);
  };

  return (
    <div 
      key={album.id} 
      onClick={handlePlayClick} 
      className="group bg-zinc-900/40 p-3 lg:p-4 rounded-3xl hover:bg-zinc-800/60 transition-all cursor-pointer border border-transparent hover:border-white/10 text-center lg:text-left shadow-xl"
    >
      <div className="relative mb-4 aspect-square mx-auto overflow-hidden rounded-2xl">
        <img 
          src={signedImageUrl} 
          alt={album.name} 
          className="w-full h-full object-cover shadow-2xl transition-transform duration-700 group-hover:scale-110" 
          onError={(e) => {
            // Fallback para imagem genérica se a URL assinada falhar ou a imagem não existir
            e.currentTarget.src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300";
          }}
        />
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
  );
};

export default AlbumItemHome;