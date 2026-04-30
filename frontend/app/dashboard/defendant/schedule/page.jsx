"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDefendantHearings, confirmHearingAttendance, declineHearingAttendance } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MapPin, CheckCircle, XCircle, Loader2, Calendar as CalendarIcon, ArrowRight, AlertCircle, Info, Shield } from "lucide-react";
import { useState, useMemo } from "react";
import { format, isBefore, startOfDay, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DefendantSchedulePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState("UPCOMING");
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false);
  
  // Decline Dialog State
  const [declineOpen, setDeclineOpen] = useState(false);
  const [selectedHearingId, setSelectedHearingId] = useState(null);
  const [declineReason, setDeclineReason] = useState("");

  const { data: hearings, isLoading } = useQuery({
    queryKey: ["defendant-hearings", user?.id],
    queryFn: () => fetchDefendantHearings(),
    enabled: !!user,
  });

  const myHearings = hearings || [];

  // Filtering Logic
  const filteredHearings = useMemo(() => {
    const today = startOfDay(new Date());
    
    return myHearings.filter(h => {
      // Use a robust date parsing approach
      const rawDate = h.scheduled_date || h.date;
      if (!rawDate) return false;
      const hDate = new Date(rawDate);
      const hStatus = h.status?.toUpperCase();

      // 1. Date Selection Logic (Priority)
      if (hasUserSelectedDate && date) {
        if (!isSameDay(hDate, date)) return false;
        
        // When a date is selected, we only filter by status categories, 
        // NOT by the "future-only" constraint of the Upcoming tab.
        if (statusFilter === "UPCOMING") return ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(hStatus);
        if (statusFilter === "CONDUCTED") return ["CONDUCTED", "COMPLETED"].includes(hStatus);
        if (statusFilter === "CANCELLED") return hStatus === "CANCELLED";
        if (statusFilter === "RESCHEDULED") return hStatus === "RESCHEDULED";
        return true; // "ALL"
      }

      // 2. Default View Logic (No date selected)
      if (statusFilter === "UPCOMING") {
        return (
          ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(hStatus) &&
          !isBefore(hDate, today)
        );
      }
      if (statusFilter === "CONDUCTED") return ["CONDUCTED", "COMPLETED"].includes(hStatus);
      if (statusFilter === "CANCELLED") return hStatus === "CANCELLED";
      if (statusFilter === "RESCHEDULED") return hStatus === "RESCHEDULED";
      
      return true; // "ALL"
    }).sort((a, b) => new Date(a.scheduled_date || a.date) - new Date(b.scheduled_date || b.date));
  }, [myHearings, statusFilter, date, hasUserSelectedDate]);

  const hearingDates = myHearings.map(h => new Date(h.scheduled_date || h.date));

  // Confirm Attendance Mutation
  const confirmMutation = useMutation({
    mutationFn: (id) => confirmHearingAttendance(id, "Defendant"),
    onSuccess: () => {
      toast.success("Attendance confirmed.");
      queryClient.invalidateQueries(["defendant-hearings"]);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to confirm attendance.");
    }
  });

  // Decline Attendance Mutation
  const declineMutation = useMutation({
    mutationFn: ({ id, reason }) => declineHearingAttendance(id, reason, "Defendant"),
    onSuccess: () => {
      toast.success("Attendance declined.");
      setDeclineOpen(false);
      setDeclineReason("");
      setSelectedHearingId(null);
      queryClient.invalidateQueries(["defendant-hearings"]);
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
      toast.error("Please provide a reason.");
      return;
    }
    declineMutation.mutate({ id: selectedHearingId, reason: declineReason });
  };

  const handleDateSelect = (newDate) => {
    if (newDate) {
      setDate(newDate);
      setHasUserSelectedDate(true);
    }
  };

  const resetFilters = () => {
    setHasUserSelectedDate(false);
    setStatusFilter("UPCOMING");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A202C]">Court Schedule</h1>
          <p className="text-[#4A5568] font-bold opacity-100">Monitor your legal appearances and requirements.</p>
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-3 md:flex h-12 p-1 bg-slate-200 rounded-xl">
            <TabsTrigger 
              value="UPCOMING" 
              className="rounded-lg font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
            >
              Upcoming
            </TabsTrigger>
            <TabsTrigger 
              value="CONDUCTED" 
              className="rounded-lg font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
            >
              Conducted
            </TabsTrigger>
            <TabsTrigger 
              value="CANCELLED" 
              className="rounded-lg font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
            >
              Cancelled
            </TabsTrigger>
            <TabsTrigger 
              value="RESCHEDULED" 
              className="hidden md:flex rounded-lg font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
            >
              Rescheduled
            </TabsTrigger>
            <TabsTrigger 
              value="ALL" 
              className="hidden md:flex rounded-lg font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all"
            >
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid lg:grid-cols-[400px_1fr] gap-8">
        <div className="space-y-6">
          <Card className="border-none shadow-2xl bg-white overflow-hidden">
            <div className="h-1.5 w-full bg-primary" />
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-[#1A202C]">
                <CalendarIcon className="h-5 w-5 text-primary" /> Calendar View
              </CardTitle>
              <CardDescription className="font-bold text-[10px] uppercase tracking-widest text-[#2D3748] opacity-100">Select a day to inspect</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                className="rounded-2xl border-none bg-transparent"
                modifiers={{ hasHearing: hearingDates }}
                modifiersStyles={{
                  hasHearing: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' }
                }}
              />
            </CardContent>
            {hasUserSelectedDate && (
              <div className="p-4 pt-0">
                <Button variant="ghost" className="w-full text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/10" onClick={resetFilters}>
                  Reset to Upcoming
                </Button>
              </div>
            )}
          </Card>

          <Card className="border-none shadow-xl bg-primary/5 border border-primary/10">
            <CardContent className="p-6 flex gap-4 items-start text-slate-700">
              <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-primary uppercase tracking-widest">Legal Standing</p>
                <p className="text-xs font-bold text-[#4A5568] leading-relaxed opacity-100">
                  Hearings listed here are mandatory unless cancelled by the court. Attendance tracking is live.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-[#1A202C]">
              {hasUserSelectedDate ? format(date, "MMMM do, yyyy") : `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} Proceedings`}
            </h3>
            <Badge variant="outline" className="font-bold text-[10px] px-3 py-1 bg-slate-100 border-none uppercase tracking-[0.1em] text-[#4A5568] opacity-100">
              {filteredHearings.length} Found
            </Badge>
          </div>

          <div className="grid gap-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 animate-pulse">Syncing Docket...</p>
              </div>
            ) : filteredHearings.length > 0 ? (
              filteredHearings.map((hearing) => {
                const isUpcoming = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(hearing.status?.toUpperCase());
                return (
                  <Card key={hearing.id} className="border-none shadow-xl bg-white group hover:border-primary/20 transition-all duration-300">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-stretch min-h-[140px]">
                        <div className={cn(
                          "w-full sm:w-32 flex flex-col items-center justify-center p-6 text-white sm:rounded-l-3xl transition-all duration-500 group-hover:brightness-110",
                          isUpcoming ? "bg-gradient-to-br from-primary to-blue-600" : "bg-slate-200 text-slate-500"
                        )}>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{format(new Date(hearing.scheduled_date || hearing.date), "MMM")}</span>
                          <span className="text-3xl font-black font-display">{format(new Date(hearing.scheduled_date || hearing.date), "dd")}</span>
                          <span className="text-[10px] font-bold mt-1 opacity-70">{format(new Date(hearing.scheduled_date || hearing.date), "yyyy")}</span>
                        </div>
                        <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest h-5">
                                  {hearing.hearing_type}
                                </Badge>
                                <span className="text-xs font-bold text-[#4A5568]">#{hearing.hearing_number || "1"}</span>
                              </div>
                              <h4 className="font-bold text-lg tracking-tight text-[#1A202C] group-hover:text-primary transition-colors">{hearing.case?.title || hearing.title}</h4>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-slate-200 bg-slate-50 px-3 py-1 text-[#4A5568] opacity-100">
                              {hearing.status}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-6 items-center pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#4A5568] opacity-100">
                              <Clock className="h-4 w-4 text-primary" />
                              {format(new Date(hearing.scheduled_date || hearing.date), "h:mm a")}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-[#4A5568] truncate max-w-[200px] opacity-100">
                              <MapPin className="h-4 w-4 text-primary" />
                              {hearing.courtroom || hearing.location || "TBD"}
                            </div>
                            <div className="flex-1 flex justify-end">
                              <Link href={`/dashboard/defendant/schedule/${hearing.id}`}>
                                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-primary/5 text-primary hover:bg-primary/20 transition-all gap-2">
                                  View Details <ArrowRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>

                          {/* Action buttons */}
                          {hearing.status === "SCHEDULED" && (
                            <div className="flex gap-3 mt-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="flex-1 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:text-emerald-400 font-bold rounded-xl"
                                onClick={() => handleConfirm(hearing.id)}
                                disabled={confirmMutation.isPending}
                              >
                                {confirmMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Acknowledge
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="flex-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 font-bold rounded-xl"
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
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50">
                <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                  <Shield className="h-12 w-12 text-slate-300" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <p className="text-2xl font-black tracking-tight text-slate-900">No matching records</p>
                  <p className="text-sm font-bold text-slate-500">
                    Your current filter selection yielded no results. Try adjusting the status or selecting a different date.
                  </p>
                </div>
                <Button variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-8 border-slate-200 hover:bg-slate-100" onClick={resetFilters}>
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decline Reason Dialog */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2 text-slate-900">
              <AlertCircle className="h-6 w-6 text-rose-500" /> Decline Summons
            </DialogTitle>
            <DialogDescription className="font-semibold text-slate-500">
              Provide a justifiable reason for your inability to attend.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Detailed reason for absence..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50 text-slate-900 focus:bg-white transition-all"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl font-bold text-slate-500" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700"
              onClick={handleDeclineSubmit}
              disabled={declineMutation.isPending}
            >
              {declineMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
