
import React, { useState } from 'react';
import { 
  Music, Eye, EyeOff, AlertCircle, Cloud, ShieldCheck, 
  Smartphone, Zap, ChevronRight, Play, ArrowRight, X 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const AuthScreen: React.FC = () => {
  const [view, setView] = useState<'landing' | 'login' | 'register'>('landing');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      if (view === 'login') {
        const res = await login(formData.email, formData.password);
        if (!res.success) setError(res.message);
      } else {
        if (formData.password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.');
          return;
        }
        const res = await register(
          formData.name,
          formData.email,
          formData.password
        );
        if (res.success) {
          setMessage(res.message);
          setView('login'); // Switch to login after success
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro durante a autenticação.');
    }
  };

  // --- LANDING PAGE COMPONENT ---
  if (view === 'landing') {
    return (
      <div className="h-screen w-full bg-black text-white overflow-y-auto scroll-smooth">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5 lg:border-none">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Music className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">Virtual Pen-Drive</span>
          </div>
          <button 
            onClick={() => setView('login')}
            className="px-6 py-2.5 bg-white/10 hover:bg-white text-white hover:text-black rounded-full font-bold text-xs uppercase tracking-widest transition-all backdrop-blur-md border border-white/10"
          >
            Acessar Conta
          </button>
        </nav>

        {/* Hero Section with Image Background */}
        <header className="relative px-6 pt-20 pb-32 lg:pt-32 lg:pb-48 max-w-7xl mx-auto text-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 -z-10">
            <img 
              src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2000&auto=format&fit=crop" 
              alt="Concert Background" 
              className="w-full h-full object-cover opacity-40 animate-in fade-in duration-1000 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/80 to-black" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 backdrop-blur-md shadow-lg shadow-blue-500/10">
            <Zap size={12} fill="currentColor" /> Novo Player V2.0
          </div>
          
          <h1 className="text-5xl lg:text-8xl font-black mb-8 tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-8 duration-700 drop-shadow-2xl">
            Sua música pessoal.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Finalmente na nuvem.</span>
          </h1>
          
          <p className="text-lg lg:text-2xl text-zinc-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium text-shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Abandone os arquivos locais desorganizados. O player definitivo para armazenar, organizar e ouvir sua coleção MP3 privada em qualquer lugar.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <button 
              onClick={() => setView('register')}
              className="w-full sm:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:scale-105 transition-all flex items-center justify-center gap-3 group"
            >
              Criar Pen-Drive Grátis <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setView('login')}
              className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all backdrop-blur-sm"
            >
              Já tenho conta
            </button>
          </div>
        </header>

        {/* Features Grid with Subtle Texture */}
        <section className="px-6 py-24 bg-zinc-900/30 border-y border-white/5 relative overflow-hidden">
           {/* Texture Overlay */}
           <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-10 rounded-[40px] bg-zinc-950/80 border border-white/5 hover:border-blue-500/30 transition-all group backdrop-blur-sm hover:-translate-y-2 duration-300 shadow-2xl">
                <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                  <Cloud size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4 text-white tracking-tight">Upload Ilimitado</h3>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  Carregue seus arquivos MP3, WAV ou OGG. Nós cuidamos do armazenamento seguro na nuvem para você liberar espaço no dispositivo.
                </p>
              </div>
              
              <div className="p-10 rounded-[40px] bg-zinc-950/80 border border-white/5 hover:border-purple-500/30 transition-all group backdrop-blur-sm hover:-translate-y-2 duration-300 shadow-2xl">
                <div className="w-16 h-16 bg-purple-500/10 text-purple-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4 text-white tracking-tight">Privacidade Total</h3>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  Sua coleção é apenas sua. Diferente dos streamings comerciais, aqui você controla 100% do que entra na sua biblioteca.
                </p>
              </div>

              <div className="p-10 rounded-[40px] bg-zinc-950/80 border border-white/5 hover:border-green-500/30 transition-all group backdrop-blur-sm hover:-translate-y-2 duration-300 shadow-2xl">
                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                  <Smartphone size={32} />
                </div>
                <h3 className="text-2xl font-black mb-4 text-white tracking-tight">Multi-Dispositivo</h3>
                <p className="text-zinc-400 leading-relaxed font-medium">
                  Comece a ouvir no computador e continue no celular. Seus dados, playlists e histórico sincronizam instantaneamente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Showcase Section with Image */}
        <section className="px-6 py-32 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
           <div className="flex-1 space-y-10">
              <h2 className="text-5xl lg:text-6xl font-black leading-[0.95] tracking-tighter">
                Um player construído para <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">amantes de áudio</span>.
              </h2>
              <div className="space-y-6">
                {[
                    'Visualizer de áudio em tempo real',
                    'Gestão de Filas e Playlists inteligentes',
                    'Sistema de Pedidos de Música para Admins',
                    'Modo offline para arquivos baixados'
                ].map((item, i) => (
                    <div key={i} className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                            <ChevronRight size={18} strokeWidth={3} />
                        </div>
                        <span className="font-bold text-lg text-zinc-200">{item}</span>
                    </div>
                ))}
              </div>
           </div>
           
           <div className="flex-1 relative perspective-1000">
              {/* Image Showcase */}
              <div className="relative z-10 rotate-2 hover:rotate-0 transition-all duration-700 ease-out group">
                 <div className="absolute inset-0 bg-blue-500 blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity" />
                 <img 
                    src="https://images.unsplash.com/photo-1619983081563-430f63602796?q=80&w=1000&auto=format&fit=crop" 
                    alt="Headphones and Music" 
                    className="w-full rounded-[40px] shadow-2xl border-2 border-white/10 relative z-10"
                 />
                 
                 {/* Floating Element Over Image */}
                 <div className="absolute bottom-8 left-8 right-8 bg-black/60 backdrop-blur-xl p-4 rounded-3xl border border-white/10 flex items-center gap-4 z-20 shadow-2xl">
                    <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center animate-pulse">
                        <Play fill="black" size={20} className="ml-1" />
                    </div>
                    <div>
                        <div className="h-1.5 w-32 bg-zinc-700 rounded-full overflow-hidden mb-2">
                            <div className="h-full w-2/3 bg-blue-500 rounded-full" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Tocando Agora</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Footer */}
        <footer className="py-12 text-center text-zinc-600 text-sm border-t border-white/5 bg-black">
          <p>&copy; {new Date().getFullYear()} Virtual Pen-Drive. Todos os direitos reservados.</p>
        </footer>
      </div>
    );
  }

  // --- LOGIN / REGISTER FORM ---
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      {/* Background Image for Login */}
      <div className="absolute inset-0 z-0">
         <img 
           src="https://images.unsplash.com/photo-1514525253440-b393452e8d2e?q=80&w=2000&auto=format&fit=crop" 
           alt="Background" 
           className="w-full h-full object-cover opacity-30 blur-sm"
         />
         <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl relative z-10 overflow-hidden">
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
        
        <button 
          onClick={() => setView('landing')}
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl mb-6 flex items-center justify-center shadow-2xl shadow-blue-500/30 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
            <Music className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-center text-white tracking-tight">
            {view === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">
            {view === 'login' ? 'Entre para acessar seu acervo' : 'Comece a montar seu Pen-Drive digital'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center shadow-lg">
            <AlertCircle size={16} className="mr-3 shrink-0" />
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold rounded-xl flex items-center shadow-lg">
            <ShieldCheck size={16} className="mr-3 shrink-0" />
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {view === 'register' && (
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome Completo</label>
              <input 
                required
                type="text"
                placeholder="Como quer ser chamado?"
                className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-white placeholder:text-zinc-700 font-bold text-sm"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">E-mail</label>
            <input 
              required
              type="email"
              placeholder="seu@email.com"
              className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-white placeholder:text-zinc-700 font-bold text-sm"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="relative space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Senha</label>
            <div className="relative">
                <input 
                required
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha secreta"
                className="w-full bg-black/50 border border-zinc-800 rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-white placeholder:text-zinc-700 font-bold text-sm"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
                <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20 mt-4 uppercase tracking-widest text-xs flex items-center justify-center gap-2 group"
          >
            {view === 'login' ? 'Entrar no Pen-Drive' : 'Concluir Cadastro'}
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-white/5">
          <button 
            onClick={() => {
              setView(view === 'login' ? 'register' : 'login');
              setError('');
              setMessage('');
            }}
            className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-wider"
          >
            {view === 'login' ? 'Criar uma conta nova' : 'Já tenho uma conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
