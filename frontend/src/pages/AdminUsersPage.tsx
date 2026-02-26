import { usePageCleanup } from '../hooks/usePageCleanup';
import AdminUsersPageContent from '../components/AdminUsersPage';

export default function AdminUsersPage() {
  // Use comprehensive cleanup hook
  usePageCleanup(['admin-users', 'user-roles']);

  return <AdminUsersPageContent />;
}
