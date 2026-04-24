"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, markNotificationRead, archiveNotification } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, Circle, Clock, Info, AlertOctagon, AlertTriangle, Archive, Trash, ArchiveRestore } from "lucide-react";
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

 const { data: notifications, isLoading } = useQuery({
 queryKey: ["notifications", "client", filter],
 queryFn: () => fetchNotifications({ is_read: filter === "unread" ? false : undefined, is_archived: filter === "archived" ? true : false }),
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
 },
 onError: (err) => toast.error(err.message || "Failed to archive notification"),
 });

 const markAsRead = (id) => markReadMutation.mutate([id]);
 const markAllAsRead = () => markAllReadMutation.mutate();
 const archive = (id) => archiveMutation.mutate(id);

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
 <p className="text-muted-foreground">Stay updated on your cases and hearings.</p>
 </div>
 {filter !== "archived" && notifications && notifications.length > 0 && (
 <Button variant="outline" onClick={markAllAsRead} disabled={markAllReadMutation.isPending}>
 <CheckCircle2 className="mr-2 h-4 w-4" /> 
 Mark All as Read
 </Button>
 )}
 </div>

 <div className="flex space-x-2 border-b border-border pb-4">
 <Button 
 variant={filter === "all" ? "default" : "ghost"} 
 className="rounded-full" 
 onClick={() => setFilter("all")}
 >
 All
 </Button>
 <Button 
 variant={filter === "unread" ? "default" : "ghost"} 
 className="rounded-full" 
 onClick={() => setFilter("unread")}
 >
 Unread
 </Button>
 <Button 
 variant={filter === "archived" ? "default" : "ghost"} 
 className="rounded-full" 
 onClick={() => setFilter("archived")}
 >
 Archived
 </Button>
 </div>

 <div className="space-y-4">
 {isLoading ? (
 [1, 2, 3].map(i => <Card key={i} className="h-24 bg-muted/20 animate-pulse border-border" />)
 ) : notifications && notifications.length > 0 ? (
 notifications.map((notif) => (
 <Card 
 key={notif.id} 
 className={cn(
 "group relative overflow-hidden transition-all bg-background border-border",
 !notif.is_read ? "border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.1)]" : "opacity-80"
 )}
 >
 <CardHeader className="flex flex-row items-start gap-4 p-5">
 <div className={cn(
 "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
 !notif.is_read ? "bg-primary/10" : "bg-muted"
 )}>
 {getIconForType(notif.type)}
 </div>
 <div className="overflow-hidden flex-1 space-y-1">
 <div className="flex items-center justify-between gap-2">
 <CardTitle className="text-sm font-bold flex items-center gap-2">
 {notif.title}
 {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
 </CardTitle>
 <CardDescription className="text-xs shrink-0">{new Date(notif.created_at).toLocaleString()}</CardDescription>
 </div>
 <p className="text-sm text-muted-foreground">{notif.message}</p>
 </div>
 </CardHeader>
 <CardContent className="px-5 pb-5 pt-0 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 {!notif.is_read && (
 <Button variant="ghost" size="sm" className="h-8 text-xs font-bold hover:text-primary" onClick={() => markAsRead(notif.id)}>
 <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark Read
 </Button>
 )}
 {filter !== "archived" && (
 <Button variant="ghost" size="sm" className="h-8 text-xs font-bold hover:text-rose-500" onClick={() => archive(notif.id)}>
 <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
 </Button>
 )}
 </CardContent>
 </Card>
 ))
 ) : (
 <div className="py-16 text-center text-muted-foreground border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 bg-muted/10">
 <Bell className="h-8 w-8 opacity-20 mb-2" />
 <p className="font-bold">No {filter !== "all" ? filter : ""} notifications</p>
 <p className="text-sm">You are all caught up!</p>
 </div>
 )}
 </div>
 </div>
 );
}
