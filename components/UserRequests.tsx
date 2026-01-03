import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';
import { useMusicStore } from '../store';
import { Send, Clock, CheckCircle2, Music, Loader2, MessageSquarePlus, Tag, User, Disc } from 'lucide-react';
import { MusicRequest } from '../types';

const UserRequests: React.FC = () => {
  const { currentUser } = useAuthStore();
  const { addNotification } = useMusicStore();
  const [requests, setRequests] = useState<MusicRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', artist: '', genre: '' });

  const fetchRequests = async () => {
    if (!currentUser) return;
    try {
      // Filtra explicitamente pelo ID do usuário atual para privacidade visual
      const { data, error } = await supabase
        .from('music_requests')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Validação flexível: Pelo menos UM campo deve estar preenchido
    const hasContent = formData.title.trim() || formData.artist.trim() || formData.genre.trim();

    if (!hasContent) {
        addNotification('Preencha ao menos um campo (Música, Cantor ou Gênero).', 'info');
        return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('music_requests').insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        // Define valores padrão para não quebrar a visualização no Admin se estiver vazio
        title: formData.title.trim() || '(Qualquer Música)',
        artist: formData.artist.trim() || '(Vários Cantores)',
        genre: formData.genre.trim(), 
        status: 'pending'
      });

      if (error) throw error;

      addNotification('Pedido enviado para o Admin!');
      setFormData({ title: '', artist: '', genre: '' });
      fetchRequests();
    } catch (err) {
      console.error(err);
      addNotification('Erro ao enviar pedido.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pt-10 px-4 pb-32 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/10">
          <MessageSquarePlus size={32} />
        </div>
        <h1 className="text-4xl font-black mb-4">Central de Pedidos</h1>
        <p className="text-zinc-400 max-w-lg mx-auto">
          Preencha o que você souber. Você pode pedir pelo nome da música, pelo cantor ou apenas por um estilo musical.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-[32px] shadow-2xl h-fit">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
             <div className="p-2 bg-blue-500/10 rounded-lg"><Send size={18} className="text-blue-500"/></div>
             Novo Pedido
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                 <Disc size={12} /> Nome da Música
              </label>
              <input 
                type="text" 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Opcional se souber o cantor..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all text-white font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                <User size={12} /> Nome do Cantor(a)
              </label>
              <input 
                type="text" 
                value={formData.artist}
                onChange={e => setFormData({...formData, artist: e.target.value})}
                placeholder="Opcional (pode ser vários)..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500/50 transition-all text-white font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1 flex items-center gap-2">
                <Tag size={12} /> Estilo Musical / Gênero
              </label>
              <div className="relative">
                <input 
                    type="text" 
                    value={formData.genre}
                    onChange={e => setFormData({...formData, genre: e.target.value})}
                    placeholder="Ex: Adoração, Pop, Rock..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:border-purple-500/50 transition-all text-white font-medium"
                />
                <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              </div>
            </div>
            
            <div className="pt-2">
                <p className="text-[10px] text-zinc-500 mb-3 text-center italic">* Preencha pelo menos um campo acima.</p>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Enviar Solicitação
                </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-[32px] p-6 h-[600px] flex flex-col">
           <h2 className="text-xl font-bold mb-6 px-2 flex items-center gap-3">
             <div className="p-2 bg-zinc-800 rounded-lg"><Clock size={18} className="text-zinc-400"/></div>
             Seus Pedidos
          </h2>
           
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
             {isLoading ? (
               <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-500" /></div>
             ) : requests.length === 0 ? (
               <div className="text-center py-20 text-zinc-600">
                 <Music size={40} className="mx-auto mb-4 opacity-20" />
                 <p className="text-sm font-medium">Nenhum pedido realizado ainda.</p>
               </div>
             ) : (
               requests.map(req => (
                 <div key={req.id} className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-colors">
                    <div className="min-w-0">
                      <p className={`font-bold text-sm truncate ${req.title === '(Qualquer Música)' ? 'text-zinc-500 italic' : 'text-white'}`}>{req.title}</p>
                      <p className="text-xs text-zinc-500 font-medium truncate">{req.artist}</p>
                      {req.genre && (
                          <p className="text-[10px] text-purple-400 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                              <Tag size={10} /> {req.genre}
                          </p>
                      )}
                      <p className="text-[9px] text-zinc-600 mt-2">{new Date(req.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${req.status === 'completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>
                      {req.status === 'completed' ? (
                        <><CheckCircle2 size={10} /> Atendido</>
                      ) : (
                        <><Clock size={10} /> Pendente</>
                      )}
                    </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default UserRequests;