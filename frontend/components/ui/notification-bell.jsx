"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { Bell, CheckSquare, Clock, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
 const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

 const getIconForType = (type) => {
 switch (type) {
 case 'CASE_UPDATE': return <Bell className="h-4 w-4 text-blue-500" />;
 case 'HEARING_SCHEDULED': return <Clock className="h-4 w-4 text-amber-500" />;
 case 'DECISION_PUBLISHED': return <Gavel className="h-4 w-4 text-emerald-500" />;
 default: return <Bell className="h-4 w-4 text-muted-foreground" />;
 }
 };

 const getIconBgForType = (type) => {
 switch (type) {
 case 'CASE_UPDATE': return 'bg-blue-500/10';
 case 'HEARING_SCHEDULED': return 'bg-amber-500/10';
 case 'DECISION_PUBLISHED': return 'bg-emerald-500/10';
 default: return 'bg-muted/30';
 }
 };

 return (
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all group">
 <Bell className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
 {unreadCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-rose-500 to-pink-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-in zoom-in shadow-lg shadow-rose-500/30">
 {unreadCount > 9 ? "9+" : unreadCount}
 </span>
 )}
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-96 bg-card shadow-sm border-border border-border shadow-2xl p-0 rounded-2xl overflow-hidden">
 <DropdownMenuLabel className="flex items-center justify-between px-6 py-4 border-b border-border">
 <span className="text-sm font-black font-display tracking-tight">Notifications</span>
 {unreadCount > 0 && (
 <Button 
 variant="ghost" 
 size="sm" 
 className="h-auto text-[10px] font-black text-primary uppercase tracking-widest p-0 hover:bg-transparent hover:text-blue-500 transition-colors"
 onClick={(e) => { e.preventDefault(); markAllAsRead(); }}
 >
 Mark all as read
 </Button>
 )}
 </DropdownMenuLabel>
 
 <div className="max-h-[360px] overflow-y-auto">
 {notifications.length === 0 ? (
 <div className="py-16 flex flex-col items-center justify-center space-y-3">
 <div className="h-12 w-12 rounded-xl bg-muted/20 flex items-center justify-center">
 <Bell className="h-6 w-6 text-muted-foreground/30" />
 </div>
 <p className="text-sm font-bold text-muted-foreground">No notifications yet</p>
 </div>
 ) : (
 notifications.map((n) => (
 <div 
 key={n.id} 
 className={cn(
 "flex gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-all duration-200 cursor-pointer group",
 !n.is_read && "bg-primary/5"
 )}
 onClick={() => !n.is_read && markAsRead(n.id)}
 >
 <div className="mt-0.5 relative shrink-0">
 <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", getIconBgForType(n.type))}>
 {getIconForType(n.type)}
 </div>
 {!n.is_read && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background shadow-lg shadow-primary/30" />}
 </div>
 <div className="flex-1 min-w-0 space-y-1">
 <p className={cn(
 "text-sm leading-snug",
 !n.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground"
 )}>
 {n.title}
 </p>
 <p className="text-xs text-muted-foreground/70 line-clamp-2 font-medium leading-relaxed">
 {n.content}
 </p>
 <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest pt-0.5">
 {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
 </p>
 </div>
 </div>
 ))
 )}
 </div>
 </DropdownMenuContent>
 </DropdownMenu>
 );
}
