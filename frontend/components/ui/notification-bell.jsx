"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { Bell, CheckSquare, Clock, Gavel, FileText, Info, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const { user } = useAuthStore();
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const getIconForType = (type) => {
    switch (type) {
      case 'CASE_UPDATE': return <Bell className="h-4 w-4 text-blue-500" />;
      case 'CASE_FILED': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'PAYMENT_VERIFIED': return <CheckSquare className="h-4 w-4 text-emerald-500" />;
      case 'HEARING_SCHEDULED': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'DECISION_PUBLISHED': return <Gavel className="h-4 w-4 text-emerald-500" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getIconBgForType = (type) => {
    switch (type) {
      case 'CASE_UPDATE':
      case 'CASE_FILED': return 'bg-blue-500/10';
      case 'PAYMENT_VERIFIED': return 'bg-emerald-500/10';
      case 'HEARING_SCHEDULED': return 'bg-amber-500/10';
      case 'DECISION_PUBLISHED': return 'bg-emerald-500/10';
      default: return 'bg-muted/30';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'URGENT': return 'text-red-500';
      case 'HIGH': return 'text-orange-500';
      case 'MEDIUM': return 'text-blue-500';
      case 'LOW': return 'text-slate-400';
      default: return 'text-blue-500';
    }
  };

  const getPriorityBg = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500/10';
      case 'HIGH': return 'bg-orange-500/10';
      case 'MEDIUM': return 'bg-blue-500/10';
      case 'LOW': return 'bg-slate-400/10';
      default: return 'bg-blue-500/10';
    }
  };

  const getNotificationLink = () => {
    const role = user?.role?.toUpperCase();
    if (role === 'ADMIN') return "/dashboard/admin/notifications";
    if (role === 'CLERK') return "/dashboard/clerk/notifications";
    if (role === 'REGISTRAR') return "/dashboard/registrar/notifications";
    if (role === 'DEFENDANT') return "/dashboard/defendant/notifications";
    if (role === 'CITIZEN' || role === 'LAWYER') return "/dashboard/client/notifications";
    return "/dashboard";
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      const success = await deleteNotification(deleteConfirmId);
      if (success) {
        toast.success("Notification deleted");
      } else {
        toast.error("Failed to delete notification");
      }
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
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
        <DropdownMenuContent align="end" className="w-96 bg-card shadow-sm border-border shadow-2xl p-0 rounded-2xl overflow-hidden">
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
                    "flex gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-all duration-200 cursor-pointer group relative",
                    !n.is_read && "bg-primary/5"
                  )}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                >
                  <div className="mt-0.5 relative shrink-0">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", getPriorityBg(n.priority))}>
                      {getIconForType(n.type)}
                    </div>
                    {!n.is_read && <span className={cn("absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background shadow-lg", n.priority === 'URGENT' ? 'bg-red-500 shadow-red-500/30' : 'bg-primary shadow-primary/30')} />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1 pr-6">
                    <p className={cn(
                      "text-sm leading-snug",
                      !n.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                    )}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground/70 line-clamp-2 font-medium leading-relaxed">
                      {n.content || n.message}
                    </p>
                    <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest pt-0.5">
                      {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : "just now"}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 right-4 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-600 transition-all text-muted-foreground/40"
                    onClick={(e) => handleDelete(e, n.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-border bg-muted/20">
              <Button asChild variant="ghost" className="w-full rounded-xl text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                <Link href={getNotificationLink()}>
                  View All Notifications
                </Link>
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              Delete Notification
            </DialogTitle>
            <DialogDescription className="text-sm font-medium pt-2">
              Are you sure you want to delete this notification? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-end pt-6">
            <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20" onClick={confirmDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
