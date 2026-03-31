import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { NotificationsDrawer } from "@/components/NotificationsDrawer";

export function AppLayout() {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="h-14 flex items-center px-4 md:px-6 shrink-0 bg-background/80 backdrop-blur-md z-40 border-b border-surface-mid"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <SidebarTrigger className="hidden md:flex w-9 h-9 items-center justify-center rounded-xl hover:bg-surface-mid transition-colors">
              <Menu className="w-5 h-5" />
            </SidebarTrigger>
            <div className="md:hidden flex items-center gap-2">
              <img src="/parsley.png" alt="SalsaHub" className="w-7 h-7" />
              <span className="font-bold text-foreground text-lg">SalsaHub</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button onClick={() => setNotifOpen(true)} className="relative p-2 rounded-xl hover:bg-surface-mid transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-24 md:pb-4">
            <Outlet />
          </main>
          <MobileNav />
        </div>
      </div>
      <NotificationsDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </SidebarProvider>
  );
}
