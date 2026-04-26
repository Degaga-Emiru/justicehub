"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, markNotificationRead, archiveNotification, markAllNotificationsRead } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Archive, Trash2, Clock, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

export default function DefendantNotificationsPage() {
 const queryClient = useQueryClient();

 const { data: notifications, isLoading } = useQuery({
 queryKey: ["notifications"],
 queryFn: () => fetchNotifications(),
 refetchInterval: 30000, // Refresh every 30s
 });

 const markReadMutation = useMutation({
 mutationFn: (id) => markNotificationRead(id),
 onSuccess: () => {
 queryClient.invalidateQueries(["notifications"]);
 },
 onError: (err) => toast.error(err.message || "Failed to mark as read")
 });

 const markAllReadMutation = useMutation({
 mutationFn: () => markAllNotificationsRead(),
 onSuccess: () => {
 queryClient.invalidateQueries(["notifications"]);
 toast.success("All notifications marked as read");
 },
 onError: (err) => toast.error(err.message || "Failed to mark all as read")
 });

 const getIcon = (type) => {
 switch (type) {
 case 'HEARING_SCHEDULED': return <Calendar className="h-5 w-5 text-blue-500" />;
 case 'DEFENSE_RESPONSE_SUBMITTED': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
 case 'PAYMENT_RECEIVED': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
 default: return <Bell className="h-5 w-5 text-primary" />;
 }
 };

 return (
 <div className="space-y-8 animate-fade-up max-w-4xl mx-auto pb-20">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div>
 <h1 className="text-3xl font-black font-display tracking-tight text-white mb-2">Notifications</h1>
 <p className="text-muted-foreground font-medium">Clear communication on your case progression.</p>
 </div>
 <Button 
 variant="outline" 
 className="rounded-xl border-border hover:bg-muted/30"
 onClick={() => markAllReadMutation.mutate()}
 disabled={!notifications?.length || markAllReadMutation.isPending}
 >
 <CheckCircle className="mr-2 h-4 w-4" /> Mark All as Read
 </Button>
 </div>

 <div className="space-y-4">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center py-20 space-y-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Syncing Alert Feed...</p>
 </div>
 ) : notifications?.length > 0 ? (
 notifications.map((notif) => (
 <Card 
 key={notif.id} 
 className={cn(
 "bg-card shadow-sm border-border border-border transition-all duration-300 hover:border-primary/30",
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
 <div className="flex-1 space-y-1">
 <div className="flex justify-between items-start">
 <h3 className={cn("text-base font-bold", !notif.is_read ? "text-white" : "text-muted-foreground")}>
 {notif.title}
 </h3>
 <span className="text-[10px] font-black text-muted-foreground uppercase py-1">
 {format(new Date(notif.created_at), "MMM d, HH:mm")}
 </span>
 </div>
 <p className="text-sm font-medium text-muted-foreground leading-relaxed">
 {notif.message}
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
 </CardContent>
 </Card>
 ))
 ) : (
 <div className="flex flex-col items-center justify-center py-40 space-y-4 ">
 <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center">
 <Bell className="h-10 w-10 text-muted-foreground" />
 </div>
 <p className="text-lg font-bold text-white">Your feed is clear</p>
 <p className="text-sm text-center max-w-[300px]">We'll notify you here when the court takes any action on your cases.</p>
 </div>
 )}
 </div>
 </div>
 );
}
