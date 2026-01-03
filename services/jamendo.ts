
import { JamendoTrack } from '../types';

// O sistema agora opera exclusivamente com dados locais do Supabase.
// As funções abaixo retornam arrays vazios para manter compatibilidade sem buscar dados externos.

export async function fetchFeaturedTracks(limit = 12, tag?: string): Promise<JamendoTrack[]> {
  return [];
}

export async function fetchFeaturedAlbums(limit = 12) {
  return [];
}

export async function fetchAlbumTracks(albumId: string): Promise<JamendoTrack[]> {
  return [];
}

export async function searchTracks(query: string, limit = 20): Promise<JamendoTrack[]> {
  return [];
}

export async function fetchTopArtists(limit = 6) {
  return [];
}
