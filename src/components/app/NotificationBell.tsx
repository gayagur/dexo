import { Bell, Check, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/format-time";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white min-w-[18px] h-[18px] px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 rounded-xl p-0 max-h-[420px] overflow-hidden"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="overflow-y-auto max-h-[340px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`px-4 py-3 cursor-pointer rounded-none border-b border-border/40 last:border-0 flex flex-col items-start gap-1 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <div className={`flex-1 min-w-0 ${n.read ? "pl-4" : ""}`}>
                    <p className="text-sm font-medium text-foreground truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      {formatDistanceToNow(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <Check className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
