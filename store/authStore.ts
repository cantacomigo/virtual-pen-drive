import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../services/supabase';
import { useMusicStore } from '../store';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
  plan?: 'free' | 'premium';
  subscriptionType?: 'Individual' | 'Duo' | 'Família';
  created_at?: string;
}

const ADMIN_EMAIL = 'joaquimcdacruz@gmail.com';

interface AuthState {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string, isAdminCreating?: boolean) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserRole: (id: string) => Promise<void>;
  updatePlan: (userId: string, plan: 'free' | 'premium', subscriptionType?: 'Individual' | 'Duo' | 'Família') => Promise<void>;
  updateProfile: (name: string, userId?: string) => Promise<{ success: boolean; message: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      isLoading: true,

      checkSession: async () => {
        try {
          const { data, error: sessionError } = await (supabase.auth as any).getSession();
          
          if (sessionError) {
            console.warn("Erro de sessão detectado (token inválido?), limpando storage:", sessionError.message);
            await (supabase.auth as any).signOut();
            set({ currentUser: null, users: [], isLoading: false });
            return;
          }

          const session = data?.session;

          if (session?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            let userData: User = profile || { 
              id: session.user.id, 
              email: session.user.email!, 
              name: session.user.user_metadata?.name || 'Usuário', 
              role: 'user', 
              plan: 'free' 
            };
            
            // Regra Mestre: Joaquim sempre é admin e premium
            if (userData.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
              userData.role = 'admin';
              userData.plan = 'premium';
              
              // CRÍTICO: Sincroniza o status de Admin com o Banco de Dados
              // Se o DB diz que é 'user', mas o código diz 'admin', as Policies RLS falham.
              if (profile?.role !== 'admin') {
                 console.log("Sincronizando permissão de Admin no banco de dados...");
                 await supabase.from('profiles').upsert({ 
                   id: userData.id,
                   email: userData.email,
                   role: 'admin',
                   plan: 'premium',
                   name: userData.name
                 });
              }
            }
            
            set({ currentUser: userData, isLoading: false });

            const { data: dbPlaylists } = await supabase
              .from('playlists')
              .select('*')
              .eq('user_id', userData.id);

            if (dbPlaylists && dbPlaylists.length > 0) {
               const mappedPlaylists = dbPlaylists.map(p => ({
                 id: p.id,
                 name: p.name,
                 tracks: p.tracks || [],
                 createdAt: new Date(p.created_at).getTime(),
                 image: p.image
               }));
               useMusicStore.getState().setPlaylists(mappedPlaylists);
            }
            
            if (userData.role === 'admin') {
              get().fetchUsers();
            }
          } else {
            set({ currentUser: null, users: [], isLoading: false });
          }
        } catch (error) {
          console.error("Erro inesperado na verificação de sessão:", error);
          set({ currentUser: null, users: [], isLoading: false });
        }
      },

      fetchUsers: async () => {
        const { data: allUsers, error } = await supabase
          .from('profiles')
          .select('*')
          .order('name');
        
        if (error) {
          console.error("Erro ao buscar usuários:", error);
          return;
        }

        const processedUsers = (allUsers || []).map(u => {
          if (u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            return { ...u, role: 'admin' as const, plan: 'premium' as const };
          }
          return u;
        });

        set({ users: processedUsers });
      },

      login: async (email, password) => {
        try {
          const { data, error } = await (supabase.auth as any).signInWithPassword({ email, password });
          if (error) return { success: false, message: error.message };
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
            
          let userData: User = profile || { 
            id: data.user.id, 
            email: data.user.email!, 
            name: data.user.user_metadata?.name || 'Usuário', 
            role: 'user', 
            plan: 'free' 
          };

          if (userData.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            userData.role = 'admin';
            userData.plan = 'premium';
            
            // Garante sync no login também
            if (profile?.role !== 'admin') {
                 await supabase.from('profiles').upsert({ 
                   id: userData.id,
                   email: userData.email,
                   role: 'admin',
                   plan: 'premium',
                   name: userData.name
                 });
            }
          }
          
          set({ currentUser: userData });
          
          const { data: dbPlaylists } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', userData.id);

          if (dbPlaylists && dbPlaylists.length > 0) {
             const mappedPlaylists = dbPlaylists.map(p => ({
               id: p.id,
               name: p.name,
               tracks: p.tracks || [],
               createdAt: new Date(p.created_at).getTime(),
               image: p.image
             }));
             useMusicStore.getState().setPlaylists(mappedPlaylists);
          }

          if (userData.role === 'admin') get().fetchUsers();
          
          return { success: true, message: 'Login realizado!' };
        } catch (error: any) {
          return { success: false, message: error.message || 'Falha na conexão.' };
        }
      },

      register: async (name, email, password, isAdminCreating = false) => {
        try {
          const { data, error } = await (supabase.auth as any).signUp({ 
            email, 
            password, 
            options: { data: { name } } 
          });
          
          if (error) return { success: false, message: error.message };
          
          if (data.user) {
            const isTargetAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            const profile = { 
              id: data.user.id, 
              name, 
              email, 
              plan: isTargetAdmin ? 'premium' : 'free', 
              role: isTargetAdmin ? 'admin' : 'user',
              created_at: new Date().toISOString()
            };
            await supabase.from('profiles').insert(profile);
            
            if (isAdminCreating) {
              get().fetchUsers();
              return { success: true, message: 'Usuário criado com sucesso!' };
            }
          }
          
          return { success: true, message: 'Conta criada! Verifique seu e-mail.' };
        } catch (error: any) {
          return { success: false, message: error.message || 'Erro no cadastro.' };
        }
      },

      updateProfile: async (name: string, userId?: string) => {
        const admin = get().currentUser;
        const targetId = userId || admin?.id;
        
        if (!targetId) return { success: false, message: 'Não autenticado' };

        try {
          const { error } = await supabase
            .from('profiles')
            .update({ name })
            .eq('id', targetId);

          if (error) throw error;

          if (!userId) {
            set({ currentUser: { ...get().currentUser!, name } });
          } else {
            get().fetchUsers();
          }
          
          return { success: true, message: 'Perfil atualizado!' };
        } catch (error: any) {
          return { success: false, message: error.message };
        }
      },

      logout: async () => {
        const user = get().currentUser;
        if (user) {
          await useMusicStore.getState().syncPlaylists(user.id);
        }
        await (supabase.auth as any).signOut();
        set({ currentUser: null, users: [] });
      },

      deleteUser: async (id) => {
        const { users, currentUser } = get();
        if (id === currentUser?.id) return;
        const userToDelete = users.find(u => u.id === id);
        if (userToDelete && userToDelete.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;

        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) {
          set((state) => ({ users: state.users.filter(u => u.id !== id) }));
        }
      },

      toggleUserRole: async (id) => {
        const { users, currentUser } = get();
        if (id === currentUser?.id && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;

        const user = users.find(u => u.id === id);
        if (!user) return;
        if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return;
        
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
        
        if (!error) {
          set((state) => ({
            users: state.users.map(u => u.id === id ? { ...u, role: newRole } : u)
          }));
        }
      },

      updatePlan: async (userId, plan, subscriptionType) => {
        // Se subscriptionType for undefined (plano free), salva como null no DB
        const dbSubscriptionType = subscriptionType || null;
        
        const { error } = await supabase
          .from('profiles')
          .update({ plan, subscriptionType: dbSubscriptionType })
          .eq('id', userId);
          
        if (!error) {
          set((state) => ({
            currentUser: state.currentUser?.id === userId 
              ? { ...state.currentUser, plan, subscriptionType } as User
              : state.currentUser,
            users: state.users.map(u => u.id === userId ? { ...u, plan, subscriptionType } as User : u)
          }));
        }
      }
    }),
    {
      name: 'nova-auth-storage',
      partialize: (state) => ({ 
        currentUser: state.currentUser 
      }),
    }
  )
);