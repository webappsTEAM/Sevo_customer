/**
 * frontend/src/config/environment.js
 * Centralized environment configuration loader.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.PROD
    ? `${window.location.origin}/Caltrack/api`
    : `/api`);

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ??
  (import.meta.env.PROD
    ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/Caltrack`
    : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:8000`);

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY ??
  import.meta.env.VITE_GOOGLE_MAPS_KEY ??
  "";

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  "628867483502-e7snj6l150js2vpvkv70opo5h4aacgus.apps.googleusercontent.com";

export const MEDIA_BASE_URL =
  import.meta.env.VITE_MEDIA_BASE_URL ??
  (import.meta.env.PROD ? `${window.location.origin}` : `http://${window.location.hostname}:8000`);
