import { usePageCleanup } from '../hooks/usePageCleanup';
import SalesAnalyticsPageContent from '../components/SalesAnalyticsPage';

export default function SalesAnalyticsPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['sales-analytics', 'categories-for-analytics']);

  return <SalesAnalyticsPageContent />;
}
