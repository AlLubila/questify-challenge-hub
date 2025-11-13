import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Zap, Crown, Trophy, Gift, Volume2, VolumeX, Filter } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "boost_applied":
      return <Zap className="h-4 w-4 text-orange-500" />;
    case "subscription_activated":
      return <Crown className="h-4 w-4 text-yellow-500" />;
    case "subscription_cancelled":
      return <Crown className="h-4 w-4 text-muted-foreground" />;
    case "reward_earned":
      return <Trophy className="h-4 w-4 text-green-500" />;
    case "payment_success":
      return <Gift className="h-4 w-4 text-blue-500" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

export const NotificationsDropdown = () => {
  const [filterType, setFilterType] = useState<string>("all");
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    isMarkingAllRead,
    soundEnabled,
    setSoundEnabled
  } = useNotifications(filterType);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-auto p-1"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllRead}
                className="h-auto p-1 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="boost_applied" className="text-xs">Boosts</TabsTrigger>
              <TabsTrigger value="subscription_activated" className="text-xs">Subs</TabsTrigger>
              <TabsTrigger value="reward_earned" className="text-xs">Rewards</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer ${
                  !notification.is_read ? "bg-accent/50" : ""
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
