import { Home, MessageCircle, Camera, CheckSquare, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SaheliLogo from "./SaheliLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Chat", url: "/chat", icon: MessageCircle },
  { title: "Fit-Check", url: "/fit-check", icon: Camera },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="glass-strong pt-4">
        <div className={`flex items-center gap-3 px-4 pb-6 ${collapsed ? "justify-center px-2" : ""} glass-subtle p-4 rounded-2xl mx-2 mb-6 saheli-glow-sm`}>
          <SaheliLogo size={collapsed ? 30 : 36} />
          {!collapsed && (
            <span className="font-display text-xl font-bold saheli-gradient-text drop-shadow-lg">Saheli</span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 hover:bg-white/5 hover:backdrop-blur-sm hover:scale-105 group glass-btn hover:saheli-glow"
                      activeClassName="bg-white/20 text-primary font-semibold scale-105 saheli-glow animate-[neon-glow_2s_ease-in-out_infinite] shadow-lg"
                    >
                      <item.icon className="h-5 w-5 shrink-0 sidebar-icon group-hover:animate-[hover-scale_0.2s] group-[.active]:animate-[neon-glow_1.5s_infinite]" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pb-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all duration-300 hover:bg-white/5 hover:text-foreground hover:saheli-glow-sm hover:scale-105 glass-btn group"
                >
                  <LogOut className="h-5 w-5 shrink-0 group-hover:animate-[hover-scale_0.2s]" />
                  {!collapsed && <span>Logout</span>}
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
