import { usePageCleanup } from '../hooks/usePageCleanup';
import StoreDetailsPageContent from '../components/StoreDetailsPage';

export default function StoreDetailsPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['store-details']);

  return <StoreDetailsPageContent />;
}
