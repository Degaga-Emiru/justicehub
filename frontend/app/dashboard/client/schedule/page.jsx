"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCitizenHearings, confirmCitizenAttendance, declineCitizenAttendance, fetchDefendantHearings } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function SchedulePage() {
 const { user } = useAuthStore();
 const queryClient = useQueryClient();
 const isDefendant = user?.role?.toUpperCase() === "DEFENDANT";
 const [date, setDate] = useState(new Date());
 
 // Decline Dialog State
 const [declineOpen, setDeclineOpen] = useState(false);
 const [selectedHearingId, setSelectedHearingId] = useState(null);
 const [declineReason, setDeclineReason] = useState("");

 const { data: hearings, isLoading } = useQuery({
 queryKey: [isDefendant ? "defendant-hearings" : "client-hearings", user?.id],
 queryFn: () => isDefendant ? fetchDefendantHearings() : fetchCitizenHearings(),
 enabled: !!user,
 });

 const myHearings = hearings || [];

 const selectedDateHearings = myHearings.filter(h => {
 const hearingDate = new Date(h.scheduled_date || h.date);
 return (
 hearingDate.getDate() === date?.getDate() &&
 hearingDate.getMonth() === date?.getMonth() &&
 hearingDate.getFullYear() === date?.getFullYear()
 );
 });

 const hearingDates = myHearings.map(h => new Date(h.scheduled_date || h.date));

 // Confirm Attendance Mutation
 const confirmMutation = useMutation({
 mutationFn: (id) => confirmCitizenAttendance(id),
 onSuccess: () => {
 toast.success("Attendance confirmed successfully.");
 queryClient.invalidateQueries([isDefendant ? "defendant-hearings" : "client-hearings"]);
 },
 onError: (err) => {
 toast.error(err.message || "Failed to confirm attendance.");
 }
 });

 // Decline Attendance Mutation
 const declineMutation = useMutation({
 mutationFn: ({ id, reason }) => declineCitizenAttendance(id, reason),
 onSuccess: () => {
 toast.success("Attendance declined.");
 setDeclineOpen(false);
 setDeclineReason("");
 setSelectedHearingId(null);
 queryClient.invalidateQueries([isDefendant ? "defendant-hearings" : "client-hearings"]);
 },
 onError: (err) => {
 toast.error(err.message || "Failed to decline attendance.");
 }
 });

 const handleConfirm = (id) => {
 confirmMutation.mutate(id);
 };

 const handleDeclineSubmit = () => {
 if (!declineReason.trim()) {
 toast.error("Please provide a reason for declining.");
 return;
 }
 declineMutation.mutate({ id: selectedHearingId, reason: declineReason });
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-500">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">Court Schedule</h1>
 <p className="text-slate-300">Track your upcoming hearings and appearances.</p>
 </div>

 <div className="grid md:grid-cols-[350px_1fr] gap-8">
 <Card className="h-fit">
 <CardHeader>
 <CardTitle>Calendar</CardTitle>
 </CardHeader>
 <CardContent className="flex justify-center">
 <Calendar
 mode="single"
 selected={date}
 onSelect={(d) => d && setDate(d)}
 className="rounded-md border bg-background/50"
 modifiers={{
 hasHearing: hearingDates
 }}
 modifiersStyles={{
 hasHearing: { fontWeight: 'bold', borderBottom: '2px solid var(--primary)' }
 }}
 />
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{date ? format(date, "MMMM do, yyyy") : "Selected Date"}</CardTitle>
 <CardDescription>Events scheduled for this day.</CardDescription>
 </CardHeader>
 <CardContent className="space-y-4">
 {isLoading ? (
 <div className="flex justify-center py-8">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 </div>
 ) : selectedDateHearings.length > 0 ? (
 selectedDateHearings.map((hearing) => (
 <div key={hearing.id} className="flex flex-col sm:flex-row items-start gap-4 p-5 border border-white/10 rounded-xl bg-background/50 hover:bg-muted/20 transition-colors shadow-sm">
 <div className="bg-primary/10 text-primary p-3 rounded-xl min-w-[70px] text-center border border-primary/20 shrink-0">
 <span className="block text-[10px] font-black uppercase tracking-widest">{format(new Date(hearing.scheduled_date || hearing.date), "MMM")}</span>
 <span className="block text-2xl font-black">{format(new Date(hearing.scheduled_date || hearing.date), "dd")}</span>
 </div>
 <div className="space-y-2 flex-1 w-full">
 <div className="flex items-center justify-between">
 <h4 className="font-bold">{hearing.hearing_type || hearing.type}</h4>
 <Badge variant={hearing.status === "CONDUCTED" ? "secondary" : "outline"} className="text-[10px] uppercase tracking-widest bg-background">
 {hearing.status}
 </Badge>
 </div>
 <p className="text-sm font-medium text-slate-300">{hearing.case?.title || hearing.title}</p>
 <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-300 mt-2 bg-black/10 p-2 rounded-lg">
 <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {hearing.scheduled_date ? format(new Date(hearing.scheduled_date), "h:mm a") : hearing.time}</span>
 <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {hearing.courtroom || hearing.location || "TBD"}</span>
 </div>
 
 {/* Action buttons if hearing is scheduled and status isn't confirmed/declined locally yet */}
 {hearing.status === "SCHEDULED" && (
 <div className="flex gap-2 mt-4 pt-2 border-t border-white/5">
 <Button 
 size="sm" 
 variant="ghost" 
 className="flex-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 font-bold"
 onClick={() => handleConfirm(hearing.id)}
 disabled={confirmMutation.isPending && confirmMutation.variables === hearing.id}
 >
 {confirmMutation.isPending && confirmMutation.variables === hearing.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
 Confirm Attendance
 </Button>
 <Button 
 size="sm" 
 variant="ghost" 
 className="flex-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 font-bold"
 onClick={() => {
 setSelectedHearingId(hearing.id);
 setDeclineOpen(true);
 }}
 >
 <XCircle className="mr-2 h-4 w-4" /> Decline
 </Button>
 </div>
 )}
 </div>
 </div>
 ))
 ) : (
 <div className="text-center py-16 text-slate-300 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 bg-muted/10">
 <Clock className="h-8 w-8 opacity-20 mb-2" />
 <p className="font-bold text-sm">No hearings scheduled for this date.</p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Decline Reason Dialog */}
 <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Decline Attendance</DialogTitle>
 <DialogDescription>
 Please provide a valid reason for declining attendance. The court will review your request.
 </DialogDescription>
 </DialogHeader>
 <div className="py-4">
 <Textarea 
 placeholder="Enter your reason here..."
 value={declineReason}
 onChange={(e) => setDeclineReason(e.target.value)}
 className="min-h-[100px] border-white/10"
 />
 </div>
 <DialogFooter>
 <Button variant="ghost" onClick={() => setDeclineOpen(false)}>Cancel</Button>
 <Button 
 variant="destructive" 
 onClick={handleDeclineSubmit}
 disabled={declineMutation.isPending}
 >
 {declineMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
 Submit Decline Request
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
