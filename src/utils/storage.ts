import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

/**
 * Gera uma URL assinada (Signed URL) para acessar um arquivo privado no Supabase Storage.
 * Isso é necessário quando o RLS está ativo no bucket e o usuário está autenticado.
 * @param path O caminho completo do arquivo dentro do bucket (ex: 'user_id/filename.mp3')
 * @param bucket O nome do bucket (ex: 'audio')
 * @param expiresIn Segundos de validade da URL (padrão: 60 segundos)
 * @returns A URL assinada ou null em caso de erro.
 */
export async function getSignedUrl(path: string, bucket: 'audio' | 'images', expiresIn: number = 60): Promise<string | null> {
  const session = await supabase.auth.getSession();
  
  // Se não houver sessão, não podemos gerar URL assinada para RLS ativo
  if (!session.data.session) {
    console.error("Não foi possível gerar URL assinada: Usuário não autenticado.");
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return data.signedUrl;
  } catch (error) {
    console.error(`Erro ao gerar URL assinada para ${path}:`, error);
    return null;
  }
}

/**
 * Extrai o caminho do arquivo do Storage a partir da URL pública.
 * Ex: 'https://.../storage/v1/object/public/audio/user_id/filename.mp3' -> 'user_id/filename.mp3'
 * @param publicUrl A URL pública do Supabase Storage.
 * @param bucket O nome do bucket.
 * @returns O caminho do arquivo no Storage.
 */
export function extractStoragePath(publicUrl: string, bucket: 'audio' | 'images'): string {
    const regex = new RegExp(`storage/v1/object/public/${bucket}/(.*)`);
    const match = publicUrl.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    // Fallback para o caso de a URL já ser o caminho interno (menos comum)
    return publicUrl.split('/').slice(-2).join('/');
}