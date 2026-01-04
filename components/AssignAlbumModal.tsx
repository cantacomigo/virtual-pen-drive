import React, { useState } from 'react';
import { X, Search, Loader2, CheckCircle, Disc } from 'lucide-react';
import { useAuthStore, User } from '../store/authStore';
import { useMusicStore } from '../store';
import { Album } from '../types';

interface AssignAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  album: Album;
  onAssignAlbum: (album: Album, targetUserId: string) => Promise<void>;
}

const AssignAlbumModal: React.FC<AssignAlbumModalProps> = ({ isOpen, onClose, album, onAssignAlbum }) => {
  const { users } = useAuthStore();
  const { addNotification } = useMusicStore();
  const [userSearch, setUserSearch] = useState('');
  const [isSending, setIsSending] = useState<string | null>(null); // Stores userId being sent to

  if (!isOpen) return null;

  const targetUsers = users.filter(u => 
    u.role !== 'admin' && // Don't show admins
    (u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const handleAssign = async (userId: string) => {
    setIsSending(userId);
    try {
      await onAssignAlbum(album, userId);
    } catch (error) {
      console.error("Erro ao encaminhar álbum:", error);
      addNotification("Erro ao encaminhar álbum.", "error");
    } finally {
      setIsSending(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-lg shadow-2xl h-[500px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold flex flex-col">
            <span className="text-sm text-zinc-500 uppercase tracking-widest font-black">Encaminhar Álbum</span>
            <span className="text-white truncate max-w-sm">{album.name}</span>
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full"><X size={20}/></button>
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
            <div key={u.id} onClick={() => !isSending && handleAssign(u.id)} className={`p-3 border-b border-zinc-800/50 flex items-center gap-3 hover:bg-green-600/10 cursor-pointer group transition-colors ${isSending === u.id ? 'opacity-50 pointer-events-none' : ''}`}>
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

export default AssignAlbumModal;