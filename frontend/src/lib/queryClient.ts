import { QueryClient } from "@tanstack/react-query";

import { QUERY_CACHE_DEFAULTS } from "./constants";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CACHE_DEFAULTS.staleTimeMs,
      gcTime: QUERY_CACHE_DEFAULTS.gcTimeMs,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
