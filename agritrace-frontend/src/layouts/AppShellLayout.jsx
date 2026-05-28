import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/app/Sidebar";
import { Topbar } from "../components/app/Topbar";
import { useAuth } from "../hooks/useAuth";

export function AppShellLayout() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* Fixed-width sidebar */}
      <Sidebar 
        role={user?.role} 
        isMobileMenuOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-h-screen bg-surface-container-low min-w-0">
        <Topbar onMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 px-4 pb-4 pt-6 md:px-6 md:pb-6 md:pt-8 lg:px-8 lg:pb-8 lg:pt-10 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
