"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchNotifications, markNotificationRead, markAllNotificationsRead, 
  deleteNotification, bulkDeleteNotifications 
} from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Bell, CheckCircle, Clock, Calendar, AlertTriangle, 
  Loader2, Info, FileText, CreditCard, Trash2, CheckSquare, Square
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

export default function ClerkNotificationsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["clerk-notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead([id]),
    onSuccess: () => {
      queryClient.invalidateQueries(["clerk-notifications"]);
    },
    onError: (err) => toast.error(err.message || "Failed to mark as read")
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(["clerk-notifications"]);
      toast.success("All notifications marked as read");
    },
    onError: (err) => toast.error(err.message || "Failed to mark all as read")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["clerk-notifications"]);
      refetch(); // Force refetch to ensure UI is in sync
      window.dispatchEvent(new CustomEvent('sync-notifications'));
      toast.success("Notification deleted");
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message || "Failed to delete notification")
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteNotifications(ids),
    onSuccess: () => {
      queryClient.invalidateQueries(["clerk-notifications"]);
      refetch();
      window.dispatchEvent(new CustomEvent('sync-notifications'));
      toast.success(`${selectedIds.length} notifications deleted`);
      setSelectedIds([]);
      setIsBulkDeleting(false);
    },
    onError: (err) => toast.error(err.message || "Failed to delete notifications")
  });

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

  const getIcon = (type) => {
    switch (type) {
      case 'CASE_FILED': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'PAYMENT_PENDING': return <CreditCard className="h-5 w-5 text-amber-500" />;
      case 'PAYMENT_VERIFIED': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'HEARING_SCHEDULED': return <Calendar className="h-5 w-5 text-indigo-500" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl mx-auto pb-20 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground mb-2">Registry Alerts</h1>
          <p className="text-muted-foreground font-medium">Administrative notifications and system updates.</p>
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
          <Button 
            variant="outline" 
            className="rounded-xl border-border hover:bg-muted/30"
            onClick={() => markAllReadMutation.mutate()}
            disabled={!notifications?.length || markAllReadMutation.isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" /> Mark All Read
          </Button>
        </div>
      </div>

      {notifications?.length > 0 && (
        <div className="flex items-center gap-2 px-2 py-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary p-0"
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
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fetching notification feed...</p>
          </div>
        ) : notifications?.length > 0 ? (
          notifications.map((notif) => (
            <div key={notif.id} className="flex gap-4 items-center">
              <Checkbox 
                checked={selectedIds.includes(notif.id)}
                onCheckedChange={() => toggleSelect(notif.id)}
                className="h-5 w-5 rounded-md border-border data-[state=checked]:bg-primary"
              />
              <Card 
                className={cn(
                  "flex-1 bg-card shadow-sm border-border transition-all duration-300 hover:border-primary/30 group",
                  !notif.is_read ? "border-l-4 border-l-primary bg-primary/5" : "opacity-80"
                )}
              >
                <CardContent className="p-6 relative">
                  <div className="flex gap-6">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                      !notif.is_read ? "bg-primary/20" : "bg-muted/30"
                    )}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 space-y-1 pr-10">
                      <div className="flex justify-between items-start">
                        <h3 className={cn("text-base font-bold", !notif.is_read ? "text-foreground" : "text-muted-foreground")}>
                          {notif.title}
                        </h3>
                        <span className="text-[10px] font-black text-muted-foreground uppercase py-1">
                          {notif.created_at ? format(new Date(notif.created_at), "MMM d, HH:mm") : "Just now"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        {notif.content || notif.message}
                      </p>
                      <div className="flex items-center gap-4 pt-3">
                        {!notif.is_read && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 rounded-lg text-primary hover:bg-primary/10 px-3 font-bold text-[10px] uppercase tracking-widest"
                            onClick={() => markReadMutation.mutate(notif.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-6 right-6 h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-600 transition-all text-muted-foreground/30"
                    onClick={() => setDeleteId(notif.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-40 space-y-4 ">
            <div className="h-20 w-20 rounded-[2rem] bg-muted/30 flex items-center justify-center -rotate-6">
              <Bell className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <p className="text-lg font-bold text-foreground">No new alerts</p>
            <p className="text-sm text-center max-w-[300px] text-muted-foreground font-medium">We'll notify you here when new filings or payments require your attention.</p>
          </div>
        )}
      </div>

      {/* Individual Delete Dialog */}
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

      {/* Bulk Delete Dialog */}
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

