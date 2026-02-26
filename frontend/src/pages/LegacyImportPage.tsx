import { usePageCleanup } from '../hooks/usePageCleanup';
import LegacyImportPageContent from '../components/LegacyImportPage';

export default function LegacyImportPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['legacy-import']);

  return <LegacyImportPageContent />;
}
