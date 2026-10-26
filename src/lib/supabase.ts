import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configurationError = Boolean(url || key) && (!url || !key || !/^https:\/\//.test(url))
export const supabase =
  url && key && !configurationError
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: {
          fetch: (input, init) =>
            fetch(input, {
              ...init,
              signal: init?.signal
                ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)])
                : AbortSignal.timeout(20000),
            }),
        },
      })
    : null
export const redirectUrl = () => `${location.origin}${import.meta.env.BASE_URL}`
