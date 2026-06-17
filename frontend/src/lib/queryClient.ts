import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data considered fresh for 30s
      retry: 1, // retry once on transient failure
      refetchOnWindowFocus: false,
    },
  },
});
