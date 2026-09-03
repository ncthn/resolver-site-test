/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Firebase `authDomain`. Unset = the project's default firebaseapp.com domain.
   *  Set to 'auth.resolver.chat' only once the Hosting domain + OAuth client are live.
   *  Mirrors the declaration in the root tree's src/vite-env.d.ts. */
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
