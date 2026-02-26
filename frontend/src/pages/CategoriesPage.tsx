import { usePageCleanup } from '../hooks/usePageCleanup';
import Categories from '../components/CategoriesPage';

export default function CategoriesPageContent() {
  // Use comprehensive cleanup hook
  usePageCleanup(['categories']);

  return <Categories />;
}
