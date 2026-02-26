import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuClick: () => void;
  onTitleClick: () => void;
  onLogout: () => void;
}

export default function Header({ onMenuClick, onTitleClick, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="hover:bg-accent"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <button
            onClick={onTitleClick}
            className="text-xl font-bold tracking-tight hover:text-primary transition-colors"
          >
            Aftab Shop
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onLogout}
            className="gap-2 font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
