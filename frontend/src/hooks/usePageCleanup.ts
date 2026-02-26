import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Reusable hook for comprehensive React Query cleanup and cache invalidation.
 * Prevents API call leakage across page remounts and route changes.
 * 
 * @param queryKeys - Array of query keys to clean up on unmount
 * @param resetOnMount - Whether to reset queries on mount (default: false)
 */
export function usePageCleanup(queryKeys: string[], resetOnMount: boolean = false) {
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);

  // Reset queries on mount if requested
  useEffect(() => {
    if (resetOnMount) {
      queryKeys.forEach((key) => {
        queryClient.resetQueries({ queryKey: [key], exact: false });
      });
    }
  }, [queryClient, resetOnMount]); // Only run on mount

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Immediately cancel all queries for these keys
      queryKeys.forEach((key) => {
        queryClient.cancelQueries({ queryKey: [key], exact: false });
      });

      // Delay cache removal to prevent race conditions with remounts
      setTimeout(() => {
        if (!isMountedRef.current) {
          queryKeys.forEach((key) => {
            queryClient.removeQueries({ queryKey: [key], exact: false });
          });
        }
      }, 100);
    };
  }, [queryClient]); // queryKeys intentionally omitted to prevent re-running
}
