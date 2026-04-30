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
  Loader2, Info, FileText, Trash2, Gavel, Scale
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

export default function JudgeNotificationsPage() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["judge-notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => markNotificationRead([id]),
    onSuccess: () => {
      queryClient.invalidateQueries(["judge-notifications"]);
    },
    onError: (err) => toast.error(err.message || "Failed to mark as read")
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(["judge-notifications"]);
      toast.success("All notifications marked as read");
    },
    onError: (err) => toast.error(err.message || "Failed to mark all as read")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["judge-notifications"]);
      refetch();
      window.dispatchEvent(new CustomEvent('sync-notifications'));
      toast.success("Notification removed");
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message || "Failed to delete notification")
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteNotifications(ids),
    onSuccess: () => {
      queryClient.invalidateQueries(["judge-notifications"]);
      refetch();
      window.dispatchEvent(new CustomEvent('sync-notifications'));
      toast.success(`${selectedIds.length} notifications removed`);
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
      case 'CASE_ASSIGNED': return <Scale className="h-5 w-5 text-indigo-500" />;
      case 'HEARING_SCHEDULED': return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'URGENT_FILING': return <AlertTriangle className="h-5 w-5 text-rose-500" />;
      default: return <Gavel className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-8 animate-fade-up max-w-4xl mx-auto pb-20 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black font-display tracking-tight text-foreground mb-2 flex items-center gap-3">
            <Bell className="h-10 w-10 text-primary" />
            Judicial Notices
          </h1>
          <p className="text-muted-foreground font-medium text-lg">Case assignments, hearing updates, and urgent filings.</p>
        </div>
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
            <Button 
              variant="destructive" 
              className="rounded-xl bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/20"
              onClick={() => setIsBulkDeleting(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Remove Selected ({selectedIds.length})
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

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Retrieving judicial feed...</p>
          </div>
        ) : notifications?.length > 0 ? (
          <>
            <div className="flex items-center justify-between px-2 py-1">
               <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary p-0"
                onClick={toggleSelectAll}
              >
                {selectedIds.length === notifications?.length ? "Deselect All" : "Select All notices"}
              </Button>
            </div>
            {notifications.map((notif) => (
              <div key={notif.id} className="flex gap-4 items-center animate-in slide-in-from-right duration-300">
                <Checkbox 
                  checked={selectedIds.includes(notif.id)}
                  onCheckedChange={() => toggleSelect(notif.id)}
                  className="h-5 w-5 rounded-md border-border data-[state=checked]:bg-primary"
                />
                <Card 
                  className={cn(
                    "flex-1 bg-card shadow-sm border-border transition-all duration-300 hover:border-primary/30 group relative",
                    !notif.is_read ? "border-l-4 border-l-primary bg-primary/5" : "opacity-80"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                        !notif.is_read ? "bg-primary/20" : "bg-muted/30"
                      )}>
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 space-y-1 pr-10">
                        <div className="flex justify-between items-start">
                          <h3 className={cn("text-base font-bold font-display tracking-tight", !notif.is_read ? "text-foreground" : "text-muted-foreground")}>
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
            ))}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 space-y-6">
            <div className="h-24 w-24 rounded-[2.5rem] bg-muted/20 flex items-center justify-center -rotate-6 border border-border shadow-inner">
              <Gavel className="h-10 w-10 text-muted-foreground/20" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black font-display text-foreground uppercase tracking-tight">No New Notices</p>
              <p className="text-sm text-center max-w-[320px] text-muted-foreground font-medium">Your judicial queue is currently up to date.</p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Dialogs */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              Remove Notice
            </DialogTitle>
            <DialogDescription className="text-base font-medium pt-3">
              This action will remove the notice from your judicial feed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-end pt-8">
            <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-xs h-12 px-6" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold uppercase tracking-widest text-xs h-12 px-8 bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/30" 
              onClick={() => deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Confirm Removal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDeleting} onOpenChange={setIsBulkDeleting}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <Trash2 className="h-6 w-6" />
              </div>
              Clear Selection
            </DialogTitle>
            <DialogDescription className="text-base font-medium pt-3">
              Are you sure you want to remove {selectedIds.length} notices?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-end pt-8">
            <Button variant="ghost" className="rounded-xl font-bold uppercase tracking-widest text-xs h-12 px-6" onClick={() => setIsBulkDeleting(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold uppercase tracking-widest text-xs h-12 px-8 bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/30" 
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              disabled={bulkDeleteMutation.isPending}
            >
              Remove Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
