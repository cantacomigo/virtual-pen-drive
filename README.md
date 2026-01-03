# Virtual Pen-Drive

A modern, private music player for managing your own collection like a cloud-based pen-drive.

## Features

- **Personal Cloud Storage**: Upload your MP3, WAV, and OGG files securely.
- **Cross-Device Sync**: Access your library from any device.
- **Advanced Player**: Visualizer, queues, shuffle, repeat, and more.
- **Admin Panel**: Manage users and global music catalog.
- **Request System**: Users can request songs from the admin.
- **Offline Mode**: Download tracks for offline listening (Premium).

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React
- **State Management**: Zustand, TanStack Query
- **Backend/Storage**: Supabase
- **Audio Engine**: Howler.js
- **Build Tool**: Vite

## Getting Started

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## License

MIT
