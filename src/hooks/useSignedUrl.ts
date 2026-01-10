import { useState, useEffect } from 'react';
import { getSignedUrl, extractStoragePath } from '../utils/storage';

/**
 * Hook para obter uma URL assinada para um recurso privado do Supabase Storage.
 * @param publicUrl A URL pública do Supabase (que é privada devido ao RLS).
 * @param bucket O nome do bucket ('audio' ou 'images').
 * @returns A URL assinada (string) ou a URL original se não for um recurso do Supabase.
 */
export const useSignedUrl = (publicUrl: string | undefined, bucket: 'audio' | 'images'): string | undefined => {
  const [signedUrl, setSignedUrl] = useState<string | undefined>(publicUrl);

  useEffect(() => {
    if (!publicUrl) {
      setSignedUrl(undefined);
      return;
    }

    // Verifica se a URL é do Supabase Storage
    if (publicUrl.includes('supabase.co/storage/v1/object/public/')) {
      const fetchSignedUrl = async () => {
        try {
          const path = extractStoragePath(publicUrl, bucket);
          // Usamos um tempo de expiração maior (1 dia) para imagens, pois elas são estáticas
          const url = await getSignedUrl(path, bucket, 60 * 60 * 24); 
          setSignedUrl(url || publicUrl); // Fallback para a URL pública se a assinatura falhar (embora deva falhar no carregamento)
        } catch (error) {
          console.error("Erro ao buscar URL assinada para imagem:", error);
          setSignedUrl(publicUrl); // Tenta usar a URL pública como último recurso
        }
      };
      fetchSignedUrl();
    } else {
      // Se não for uma URL do Supabase (ex: fallback de imagem), usa a URL original
      setSignedUrl(publicUrl);
    }
  }, [publicUrl, bucket]);

  return signedUrl;
};