import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePageCleanup } from '../hooks/usePageCleanup';
import Products from '../components/ProductsPage';

export default function ProductsPageContent() {
  const queryClient = useQueryClient();

  // Use comprehensive cleanup hook
  usePageCleanup(['products', 'categories', 'product', 'product-search']);

  // Enhanced remount handling for products page
  useEffect(() => {
    // Reset queries on mount for clean state
    queryClient.resetQueries({ queryKey: ['products'], exact: false });

    return () => {
      // Invalidate on unmount to ensure fresh data on next visit
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
    };
  }, [queryClient]);

  return <Products />;
}
