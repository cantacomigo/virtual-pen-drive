import React, { useRef, RefObject } from 'react';
import { ImageIcon, Loader2, Play, Trash2, Forward } from 'lucide-react';
import { Album } from '../types';
import { useSignedUrl } from '../src/hooks/useSignedUrl';
import { useMusicStore } from '../store';

interface AlbumItemAdminProps {
  album: Album;
  isUploadingImage: boolean;
  selectedAlbumForUpload: Album | null;
  setSelectedAlbumForUpload: (album: Album) => void;
  fileInputRef: RefObject<HTMLInputElement>;
  onDeleteAlbum: (album: Album) => void;
  onAssignAlbum: (album: Album) => void;
  onPlayAlbum: (album: Album) => void;
  showAdminControls: boolean;
  isAlbumLoading: string | null;
  ownerName?: string;
}

const AlbumItemAdmin: React.FC<AlbumItemAdminProps> = ({ 
  album, 
  isUploadingImage, 
  selectedAlbumForUpload, 
  setSelectedAlbumForUpload, 
  fileInputRef,
  onDeleteAlbum,
  onAssignAlbum,
  onPlayAlbum,
  showAdminControls,
  isAlbumLoading,
  ownerName
}) => {
  const signedImageUrl = useSignedUrl(album.image_url, 'images');
  const { addNotification } = useMusicStore();

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAlbumForUpload(album);
    fileInputRef.current?.click();
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayAlbum(album);
  };

  return (
    <div key={album.id} className="group bg-zinc-900/40 p-3 lg:p-4 rounded-3xl hover:bg-zinc-800/60 transition-all cursor-pointer border border-transparent hover:border-white/10 shadow-xl relative">
      <div className="relative mb-4 aspect-square mx-auto overflow-hidden rounded-2xl">
        <img 
          src={signedImageUrl} 
          alt={album.name} 
          className="w-full h-full object-cover shadow-2xl transition-transform duration-700 group-hover:scale-110" 
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300";
          }}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
          {isAlbumLoading === album.id ? (
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <div className="flex gap-3">
              <button 
                onClick={handlePlayClick}
                className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                <Play fill="currentColor" size={24} className="ml-1" />
              </button>
              
              {showAdminControls && (
                <button 
                  onClick={handleUploadClick}
                  disabled={isUploadingImage && selectedAlbumForUpload?.id === album.id}
                  className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUploadingImage && selectedAlbumForUpload?.id === album.id ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-center lg:text-left">
        <h4 className="font-bold truncate text-sm lg:text-base mb-1 text-zinc-100">{album.name}</h4>
        <p className="text-[10px] lg:text-xs text-zinc-500 truncate font-semibold">{album.artist_name}</p>
        {ownerName && <p className="text-[9px] text-zinc-600 mt-1 truncate">Proprietário: {ownerName}</p>}
      </div>
      
      {showAdminControls && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onAssignAlbum(album); }} className="p-1 bg-zinc-950/80 rounded-full text-zinc-500 hover:text-green-400 transition-colors shadow-lg" title="Encaminhar Álbum">
            <Forward size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDeleteAlbum(album); }} className="p-1 bg-zinc-950/80 rounded-full text-zinc-500 hover:text-red-500 transition-colors shadow-lg" title="Deletar Álbum">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AlbumItemAdmin;