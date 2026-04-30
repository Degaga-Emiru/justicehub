"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCitizenHearings, confirmCitizenAttendance, declineCitizenAttendance } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MapPin, CheckCircle, XCircle, Loader2, Calendar as CalendarIcon, ArrowRight, AlertCircle, Info } from "lucide-react";
import { useState, useMemo } from "react";
import { format, isBefore, startOfDay, isSameDay } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function SchedulePage() {
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
    queryKey: ["client-hearings", user?.id],
    queryFn: () => fetchCitizenHearings(),
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
        // Upcoming: Active statuses AND today or future
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
    mutationFn: (id) => confirmCitizenAttendance(id),
    onSuccess: () => {
      toast.success("Attendance confirmed successfully.");
      queryClient.invalidateQueries(["client-hearings"]);
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
      queryClient.invalidateQueries(["client-hearings"]);
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
          <h1 className="text-3xl font-black tracking-tight text-[#1A202C]">Court Schedule</h1>
          <p className="text-[#4A5568] font-bold opacity-100">Track your upcoming hearings and appearances.</p>
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
              <CardTitle className="text-xl font-black flex items-center gap-2 text-[#1A202C]">
                <CalendarIcon className="h-5 w-5 text-primary" /> Select Date
              </CardTitle>
              <CardDescription className="font-black text-[10px] uppercase tracking-widest text-[#2D3748] opacity-100">Click a date to filter events</CardDescription>
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
                  Show All Upcoming
                </Button>
              </div>
            )}
          </Card>

          <Card className="border-none shadow-xl bg-primary/5 border border-primary/10">
            <CardContent className="p-6 flex gap-4 items-start">
              <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-black text-primary">Status Guide</p>
                <p className="text-xs font-bold text-[#4A5568] leading-relaxed opacity-100">
                  Default view shows active upcoming hearings. Switch tabs to see cancelled or completed proceedings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight">
              {hasUserSelectedDate ? format(date, "MMMM do, yyyy") : `${statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()} Hearings`}
            </h3>
            <Badge variant="outline" className="font-black text-[10px] px-3 py-1 bg-muted/30 border-none uppercase tracking-[0.1em]">
              {filteredHearings.length} Results
            </Badge>
          </div>

          <div className="grid gap-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-black text-[10px] uppercase tracking-widest text-slate-600 animate-pulse">Loading proceedings...</p>
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
                          isUpcoming ? "bg-gradient-to-br from-primary to-blue-600" : "bg-muted text-muted-foreground"
                        )}>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{format(new Date(hearing.scheduled_date || hearing.date), "MMM")}</span>
                          <span className="text-3xl font-black font-display">{format(new Date(hearing.scheduled_date || hearing.date), "dd")}</span>
                          <span className="text-[10px] font-bold mt-1">{format(new Date(hearing.scheduled_date || hearing.date), "yyyy")}</span>
                        </div>
                        <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest h-5">
                                  {hearing.hearing_type}
                                </Badge>
                                <span className="text-xs font-black text-[#4A5568] opacity-100">#{hearing.hearing_number || "1"}</span>
                              </div>
                              <h4 className="font-black text-lg tracking-tight group-hover:text-primary transition-colors text-[#1A202C]">{hearing.case?.title || hearing.title}</h4>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/20 bg-background px-3 py-1 text-primary">
                              {hearing.status}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-6 items-center pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2 text-xs font-black text-[#4A5568] opacity-100">
                              <Clock className="h-4 w-4 text-primary/80" />
                              {format(new Date(hearing.scheduled_date || hearing.date), "h:mm a")}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-black text-[#4A5568] truncate max-w-[200px] opacity-100">
                              <MapPin className="h-4 w-4 text-primary/80" />
                              {hearing.courtroom || hearing.location || "TBD"}
                            </div>
                            <div className="flex-1 flex justify-end">
                              <Link href={`/dashboard/client/schedule/${hearing.id}`}>
                                <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl font-bold bg-primary/5 text-primary hover:bg-primary/20 transition-all gap-2">
                                  View Details <ArrowRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>

                          {/* Attendance Actions for Scheduled Hearings */}
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
                                Confirm
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
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 border-2 border-dashed border-slate-300 rounded-[3rem] bg-white">
                <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                  <CalendarIcon className="h-12 w-12 text-slate-400" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <p className="text-2xl font-black tracking-tight text-slate-900">No matching proceedings</p>
                  <p className="text-sm font-semibold text-slate-600">
                    We couldn't find any hearings matching your current status filter or selected date.
                  </p>
                </div>
                <Button variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-8" onClick={resetFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decline Reason Dialog */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-rose-500" /> Decline Attendance
            </DialogTitle>
            <DialogDescription className="font-medium">
              Please provide a valid reason for declining attendance. The court will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea 
              placeholder="Enter your reason here..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="min-h-[120px] rounded-2xl border-border bg-muted/30 focus:bg-background transition-all"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setDeclineOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600"
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
