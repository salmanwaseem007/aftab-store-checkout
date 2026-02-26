import { usePageCleanup } from '../hooks/usePageCleanup';
import ImportPageContent from '../components/ImportPage';

export default function ImportPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['import-data']);

  return <ImportPageContent />;
}
