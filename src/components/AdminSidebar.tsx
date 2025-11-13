import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Home, Users, FileText, Trophy, BarChart3, ScrollText, DollarSign, PlusCircle } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const menuItems = [
  {
    title: "admin.dashboard",
    url: "/admin",
    icon: Home,
  },
  {
    title: "admin.users",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "admin.submissions",
    url: "/admin/submissions",
    icon: FileText,
  },
  {
    title: "admin.challenges",
    url: "/admin/challenges",
    icon: Trophy,
  },
  {
    title: "admin.createChallenge",
    url: "/admin/create-challenge",
    icon: PlusCircle,
  },
  {
    title: "admin.analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "admin.payments",
    url: "/admin/payments",
    icon: DollarSign,
  },
  {
    title: "admin.activityLogs",
    url: "/admin/logs",
    icon: ScrollText,
  },
];

export const AdminSidebar = () => {
  const { t } = useLanguage();
  
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("admin.panel")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon />
                      <span>{t(item.title)}</span>
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