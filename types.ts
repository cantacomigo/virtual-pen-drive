export interface Album {
  id: string;
  name: string;
  artist_name: string;
  image_url: string; // A capa do álbum
  user_id: string;
  created_at: string;
}

export interface JamendoTrack {
  id: string;
  name: string;
  duration: number;
  artist_id: string;
  artist_name: string;
  album_id: string; // Referência ao ID do álbum
  album_name: string;
  album_image?: string; // Capa do álbum (será buscada da tabela 'albums' ou fallback)
  track_image?: string; // Imagem específica da faixa (opcional)
  audio: string;
  audiodownload: string;
  isLocal?: boolean; 
  format?: string; // Hint de formato para o Howler (ex: 'mp3', 'wav', 'ogg')
  genre?: string;
  year?: string | number;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: JamendoTrack[];
  createdAt: number;
  image?: string; // Capa personalizada da playlist
}

export interface PlaybackState {
  currentTrack: JamendoTrack | null;
  queue: JamendoTrack[];
  history: JamendoTrack[];
  likedTracks: JamendoTrack[];
  uploadedTracks: JamendoTrack[]; 
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  repeat: 'none' | 'one' | 'all';
  playlists: Playlist[];
  playbackCount: number; // Contador de reproduções para usuários free
}

export interface MusicRequest {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  artist: string;
  genre?: string; // Novo campo
  status: 'pending' | 'completed';
  created_at: string;
}

export interface JamendoResponse {
  headers: {
    status: string;
    code: number;
    error_message: string;
    results_count: number;
  };
  results: JamendoTrack[];
}