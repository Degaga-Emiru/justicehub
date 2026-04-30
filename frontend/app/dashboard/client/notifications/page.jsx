"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchNotifications, markNotificationRead, archiveNotification, 
  deleteNotification, bulkDeleteNotifications 
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Bell, CheckCircle2, Circle, Clock, Info, AlertOctagon, 
  AlertTriangle, Archive, Trash2, ArchiveRestore, Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState } from "react";

const getIconForType = (type) => {
  switch (type) {
    case "CASE_STATUS_UPDATED": return <Info className="h-5 w-5 text-blue-500" />;
    case "HEARING_SCHEDULED": return <Clock className="h-5 w-5 text-purple-500" />;
    case "DOCUMENT_REJECTED": return <AlertOctagon className="h-5 w-5 text-rose-500" />;
    case "PAYMENT_OVERDUE": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "CASE_APPROVED": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    default: return <Bell className="h-5 w-5 text-primary" />;
  }
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all"); // 'all' | 'unread' | 'archived'
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["notifications", "client", filter],
    queryFn: () => fetchNotifications({ 
      is_read: filter === "unread" ? false : undefined, 
      is_archived: filter === "archived" ? true : false 
    }),
    refetchInterval: 60000, // Poll every minute
  });

  const markReadMutation = useMutation({
    mutationFn: (notifIds) => markNotificationRead(notifIds),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries(["unread-notifications-count"]);
    },
    onError: (err) => toast.error(err.message || "Failed to mark as read"),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markNotificationRead([], true),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries(["unread-notifications-count"]);
    },
    onError: (err) => toast.error(err.message || "Failed to mark all as read"),
  });
  
  const archiveMutation = useMutation({
    mutationFn: (id) => archiveNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      toast.success("Notification archived");
    },
    onError: (err) => toast.error(err.message || "Failed to archive notification"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries(["unread-notifications-count"]);
      refetch();
      window.dispatchEvent(new CustomEvent('sync-notifications'));
      toast.success("Notification deleted");
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message || "Failed to delete notification")
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteNotifications(ids),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications"]);
      queryClient.invalidateQueries(["unread-notifications-count"]);
      refetch();
      window.dispatchEvent(new CustomEvent('sync-notifications'));
      toast.success(`${selectedIds.length} notifications deleted`);
      setSelectedIds([]);
      setIsBulkDeleting(false);
    },
    onError: (err) => toast.error(err.message || "Failed to delete notifications")
  });

  const markAsRead = (id) => markReadMutation.mutate([id]);
  const markAllAsRead = () => markAllReadMutation.mutate();
  const archive = (id) => archiveMutation.mutate(id);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications?.map(n => n.id) || []);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-[#1A202C]">Notifications</h1>
          <p className="text-[#4A5568] font-bold opacity-100">Stay updated on your cases and hearings.</p>
        </div>
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              className="rounded-xl bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20"
              onClick={() => setIsBulkDeleting(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Selected ({selectedIds.length})
            </Button>
          )}
          {filter !== "archived" && notifications && notifications.length > 0 && (
            <Button variant="outline" className="rounded-xl" onClick={markAllAsRead} disabled={markAllReadMutation.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> 
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      <div className="flex space-x-2 border-b border-border pb-4">
        <Button 
          variant={filter === "all" ? "default" : "ghost"} 
          className="rounded-full px-6" 
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button 
          variant={filter === "unread" ? "default" : "ghost"} 
          className="rounded-full px-6" 
          onClick={() => setFilter("unread")}
        >
          Unread
        </Button>
        <Button 
          variant={filter === "archived" ? "default" : "ghost"} 
          className="rounded-full px-6" 
          onClick={() => setFilter("archived")}
        >
          Archived
        </Button>
      </div>

      {notifications?.length > 0 && (
        <div className="flex items-center gap-2 px-2 py-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest text-[#4A5568] hover:text-primary p-0 opacity-100"
            onClick={toggleSelectAll}
          >
            {selectedIds.length === notifications?.length ? "Deselect All" : "Select All"}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-[#4A5568] opacity-100">Syncing Alert Feed...</p>
          </div>
        ) : notifications && notifications.length > 0 ? (
          notifications.map((notif) => (
            <div key={notif.id} className="flex gap-4 items-center">
              <Checkbox 
                checked={selectedIds.includes(notif.id)}
                onCheckedChange={() => toggleSelect(notif.id)}
                className="h-5 w-5 rounded-md border-border data-[state=checked]:bg-primary"
              />
              <Card 
                className={cn(
                  "group relative overflow-hidden transition-all bg-card border-border flex-1",
                  !notif.is_read ? "border-l-4 border-l-primary bg-primary/5 shadow-sm" : "opacity-80"
                )}
              >
                <CardHeader className="flex flex-row items-start gap-4 p-5">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner",
                    !notif.is_read ? "bg-primary/20" : "bg-muted"
                  )}>
                    {getIconForType(notif.type)}
                  </div>
                  <div className="overflow-hidden flex-1 space-y-1 pr-8">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-black flex items-center gap-2 text-[#1A202C]">
                        {notif.title}
                        {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                      </CardTitle>
                      <CardDescription className="text-[10px] font-black uppercase tracking-widest shrink-0 text-[#2D3748] opacity-100">
                        {new Date(notif.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <p className="text-sm font-bold text-[#4A5568] leading-relaxed opacity-100">{notif.message}</p>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notif.is_read && (
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest hover:text-primary rounded-lg" onClick={() => markAsRead(notif.id)}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Read
                    </Button>
                  )}
                  {filter !== "archived" && (
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest hover:text-amber-600 rounded-lg" onClick={() => archive(notif.id)}>
                      <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-[10px] font-black uppercase tracking-widest hover:text-rose-600 rounded-lg" 
                    onClick={() => setDeleteId(notif.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-muted/10">
            <div className="h-16 w-16 rounded-[1.25rem] bg-muted/30 flex items-center justify-center -rotate-6">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-black text-xl font-display tracking-tight text-[#1A202C]">No {filter !== "all" ? filter : ""} notifications</p>
              <p className="text-sm font-bold text-[#4A5568] opacity-100">You are all caught up!</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
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
            <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20" 
              onClick={() => deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDeleting} onOpenChange={setIsBulkDeleting}>
        <DialogContent className="sm:max-w-md rounded-3xl border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              Delete {selectedIds.length} Notifications
            </DialogTitle>
            <DialogDescription className="text-sm font-medium pt-2">
              Are you sure you want to delete all selected notifications? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-end pt-6">
            <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setIsBulkDeleting(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold uppercase tracking-widest text-[10px] bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20" 
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


