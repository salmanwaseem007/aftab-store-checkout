import { useEffect, useRef } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Component that cancels all running queries on route changes.
 * Should be placed at the router level to catch all navigation events.
 */
export default function NavigationCleanup() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    // Only cancel queries if the path actually changed
    if (previousPathRef.current !== location.pathname) {
      // Cancel all running queries except admin-status (which has 30-day cache)
      queryClient.cancelQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return queryKey !== 'admin-status';
        },
      });

      previousPathRef.current = location.pathname;
    }
  }, [location.pathname, queryClient]);

  return null;
}
