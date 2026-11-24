import { QueryClient } from "@tanstack/react-query";

// The data is static: fetched once, never refetched.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 } },
});
