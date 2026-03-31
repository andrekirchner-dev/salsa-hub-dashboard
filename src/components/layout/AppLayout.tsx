import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { Outlet } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { useState } from "react";
import { NotificationsDrawer } from "@/components/NotificationsDrawer";

export function AppLayout() {
  const [notifOpen, setNotifOpen] = useState(false);
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center px-4 md:px-6 shrink-0">
            <SidebarTrigger className="hidden md:flex text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <div className="md:hidden flex items-center gap-2">
              <img src="/parsley.png" alt="SalsaHub" className="w-7 h-7" />
              <span className="font-bold text-foreground">SalsaHub</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={() => setNotifOpen(true)}
                className="relative p-1.5 rounded-xl hover:bg-surface-mid transition-colors"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-primary" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-20 md:pb-4">
            <Outlet />
          </main>
          <MobileNav />
        </div>
      </div>
      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </SidebarProvider>
  );
}
