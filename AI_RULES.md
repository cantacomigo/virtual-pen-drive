# AI Assistant Rules for Virtual Pen-Drive

This document outlines the technical stack and specific library usage guidelines for developing the Virtual Pen-Drive application. Adhering to these rules ensures consistency, maintainability, and leverages the strengths of the chosen technologies.

## Tech Stack Overview

1.  **Frontend Framework**: React 19 with TypeScript for building interactive user interfaces.
2.  **Styling**: Tailwind CSS for all utility-first CSS styling, ensuring responsive and consistent designs.
3.  **UI Components**: Custom components are used extensively. For new UI elements, `shadcn/ui` components should be prioritized when applicable.
4.  **Icons**: `lucide-react` is the designated library for all icons.
5.  **Global State Management**: Zustand is used for managing client-side global application state (e.g., music playback, user authentication status).
6.  **Server State Management**: TanStack Query is employed for efficient data fetching, caching, synchronization, and managing server-side state with Supabase.
7.  **Backend & Database**: Supabase serves as the backend for authentication, database operations, and file storage.
8.  **Audio Engine**: Howler.js handles all audio playback functionalities.
9.  **Build Tool**: Vite is used for fast development and optimized production builds.
10. **Audio Metadata**: `jsmediatags` (loaded via CDN) is used for extracting metadata from uploaded audio files.

## Library Usage Rules

*   **UI Components**:
    *   Always create new components in `src/components/` or `src/pages/` (for page-specific components).
    *   Prioritize using existing custom components or `shadcn/ui` components for new UI elements. Do not modify `shadcn/ui` source files; create new components if customization is needed.
    *   New components should be small and focused, ideally under 100 lines of code.
*   **Styling**:
    *   **Exclusively use Tailwind CSS classes** for all styling. Avoid inline styles or separate CSS files unless absolutely necessary for global resets or external integrations.
    *   Ensure designs are responsive by utilizing Tailwind's responsive utility classes.
*   **Icons**:
    *   All icons must be imported and used from the `lucide-react` library.
*   **Global Application State**:
    *   For managing client-side state that needs to be accessible across multiple components (e.g., current track, queue, user session details), use Zustand (`useMusicStore`, `useAuthStore`).
*   **Data Fetching & Caching**:
    *   All asynchronous data operations involving Supabase (e.g., fetching tracks, albums, user profiles, requests) must use TanStack Query (`useQuery`, `useMutation`).
*   **Backend, Authentication, Database, Storage**:
    *   All interactions with the backend, including user authentication, database queries, and file storage (audio, images), must be performed via the Supabase client (`supabase` object).
*   **Audio Playback**:
    *   Howler.js (`Howl` instances) is the sole library for handling audio playback, pausing, seeking, volume control, and other audio-related functionalities.
*   **Routing**:
    *   The application currently manages views using React's `useState`. If more complex, URL-driven navigation is required, `react-router-dom` should be introduced and configured in `src/App.tsx`.
*   **Notifications**:
    *   Use the existing custom notification system implemented via `useMusicStore.addNotification` for all user feedback (success, info, error messages). Do not introduce external toast libraries unless explicitly requested.
*   **Audio File Metadata**:
    *   When processing uploaded audio files, use the globally available `jsmediatags` library (loaded via CDN) to extract metadata like title, artist, album, and cover art.