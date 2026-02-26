import { usePageCleanup } from '../hooks/usePageCleanup';
import ExportPageContent from '../components/ExportPage';

export default function ExportPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['export-data']);

  return <ExportPageContent />;
}
