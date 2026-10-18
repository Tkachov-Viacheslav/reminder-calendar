// TypeScript declarations for Deno runtime in Supabase Edge Functions

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): { [key: string]: string };
  }

  export const env: Env;

  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
    options?: { port?: number; onListen?: (params: { port: number; hostname: string }) => void }
  ): void;
}

declare namespace EdgeRuntime {
  export function waitUntil(promise: Promise<any>): void;
}

declare module 'jsr:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}
