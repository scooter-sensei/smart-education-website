import { QueryClient } from '@tanstack/react-query'

/* Internal ops tool against a mock layer: no transient failures to retry, and
   background refetch-on-focus would just churn. Keep data fresh-ish but calm. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
    mutations: {
      retry: false,
    },
  },
})
