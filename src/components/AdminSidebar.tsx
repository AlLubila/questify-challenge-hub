import { NavLink } from "react-router-dom";
import { Users, FileCheck, Trophy, LayoutDashboard, Shield } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Users", url: "/admin/users", icon: Users, exact: false },
  { title: "Submissions", url: "/admin/submissions", icon: FileCheck, exact: false },
  { title: "Challenges", url: "/admin/challenges", icon: Trophy, exact: false },
];

export const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {!collapsed && <span>Admin Panel</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.exact}
                      className={({ isActive }) =>
                        `flex items-center gap-2 hover:bg-accent rounded-md ${
                          isActive ? "bg-accent text-accent-foreground font-medium" : ""
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
