import { useState } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import Header from './Header';
import SidePanel from './SidePanel';
import NavigationCleanup from './NavigationCleanup';

export default function DashboardLayout() {
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const navigate = useNavigate();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();

  const handleNavigate = (route: string) => {
    navigate({ to: route });
    setIsSidePanelOpen(false);
  };

  const handleTitleClick = () => {
    navigate({ to: '/' });
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationCleanup />
      <Header 
        onMenuClick={() => setIsSidePanelOpen(true)} 
        onTitleClick={handleTitleClick}
        onLogout={handleLogout}
      />
      <SidePanel 
        isOpen={isSidePanelOpen} 
        onClose={() => setIsSidePanelOpen(false)}
        onNavigate={handleNavigate}
      />
      
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
