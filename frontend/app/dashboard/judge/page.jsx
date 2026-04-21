"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchJudgeDashboard, fetchJudgeCases, fetchJudgeCaseHearings,
    fetchNotifications, scheduleHearing, updateCaseStatus,
    cancelHearing, completeHearing, fetchHearings,
    rescheduleHearing, updateHearing, scheduleNextHearing,
    recordHearingAttendance, fetchCaseTimeline, downloadJudgeDocument
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { statusColors, priorityColors } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Clock, MapPin, FileText, Gavel, CalendarDays, Briefcase, Scale, AlertCircle, ArrowRight, Bell, CheckCircle, Play, XCircle, RotateCcw, Search, PlusCircle, Pencil, Users, History, Download } from "lucide-react";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function JudgeDashboard() {
    const { user } = useAuthStore();
    const [date, setDate] = useState(new Date());
    const [selectedHearing, setSelectedHearing] = useState(null);
    const [selectedCase, setSelectedCase] = useState(null);
    const [isScheduling, setIsScheduling] = useState(false);
    const [caseFilter, setCaseFilter] = useState("all");
    const [completingHearing, setCompletingHearing] = useState(null);
    const [completeNotes, setCompleteNotes] = useState({ summary: "", action: "CONTINUED", judge_comment: "", minutes: "" });
    const [nextHearingDate, setNextHearingDate] = useState("");
    const [cancelReason, setCancelReason] = useState("");
    const [cancellingHearing, setCancellingHearing] = useState(null);
    const [reschedulingHearing, setReschedulingHearing] = useState(null);
    const [rescheduleData, setRescheduleData] = useState({ new_date: "", new_time: "", reason: "" });
    const [editingHearing, setEditingHearing] = useState(null);
    const [editData, setEditData] = useState({ title: "", location: "", agenda: "", hearing_type: "" });
    const [attendanceHearing, setAttendanceHearing] = useState(null);
    const [attendanceData, setAttendanceData] = useState([]);
    const [caseTimeline, setCaseTimeline] = useState([]);
    const [showTimeline, setShowTimeline] = useState(false);
    const [scheduleData, setScheduleData] = useState({
        case: "",
        title: "",
        hearing_type: "INITIAL",
        scheduled_date: "",
        duration_minutes: 60,
        location: "",
        agenda: ""
    });
    const queryClient = useQueryClient();

    // Fetch dashboard stats from dedicated judge endpoint
    const { data: dashboardStats } = useQuery({
        queryKey: ["judge-dashboard-stats"],
        queryFn: fetchJudgeDashboard,
    });

    // Fetch assigned cases from judge-specific endpoint
    const { data: cases, isLoading: casesLoading } = useQuery({
        queryKey: ["judge-cases"],
        queryFn: () => fetchJudgeCases(),
    });

    // Fetch hearings from backend (filtered by judge role automatically)
    const { data: hearings, isLoading: hearingsLoading } = useQuery({
        queryKey: ["judge-hearings"],
        queryFn: () => fetchHearings(),
    });

    // Fetch notifications
    const { data: notifications } = useQuery({
        queryKey: ["judge-notifications"],
        queryFn: () => fetchNotifications(),
    });

    // Schedule hearing mutation
    const scheduleMutation = useMutation({
        mutationFn: scheduleHearing,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["judge-hearings"] });
            queryClient.invalidateQueries({ queryKey: ["judge-dashboard-stats"] });
            setIsScheduling(false);
            setScheduleData({
                case: "", title: "", hearing_type: "INITIAL", scheduled_date: "",
                duration_minutes: 60, location: "", agenda: ""
            });
            alert("Hearing scheduled successfully!");
        },
        onError: (err) => {
            alert(err.message || "Failed to schedule hearing");
        }
    });

    // Start case (ASSIGNED → IN_PROGRESS)
    const startCaseMutation = useMutation({
        mutationFn: ({ caseId }) => updateCaseStatus(caseId, { status: "IN_PROGRESS" }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["judge-cases"] });
            queryClient.invalidateQueries({ queryKey: ["judge-dashboard-stats"] });
            setSelectedCase(null);
            alert("Case marked as In Progress.");
        },
        onError: (err) => alert(err.message || "Failed to start case")
    });

    // Complete hearing mutation
    const completeHearingMutation = useMutation({
        mutationFn: ({ hearingId, data }) => completeHearing(hearingId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["judge-hearings"] });
            queryClient.invalidateQueries({ queryKey: ["judge-dashboard-stats"] });
            setCompletingHearing(null);
            setCompleteNotes({ summary: "", action: "CONTINUED", judge_comment: "", minutes: "" });
            setNextHearingDate("");
            alert("Hearing completed successfully!");
        },
        onError: (err) => alert(err.message || "Failed to complete hearing")
    });

    // Cancel hearing mutation
    const cancelHearingMutation = useMutation({
        mutationFn: ({ hearingId, reason }) => cancelHearing(hearingId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["judge-hearings"] });
            queryClient.invalidateQueries({ queryKey: ["judge-dashboard-stats"] });
            setCancellingHearing(null);
            setCancelReason("");
            alert("Hearing cancelled.");
        },
        onError: (err) => alert(err.message || "Failed to cancel hearing")
    });

    // Reschedule hearing mutation
    const rescheduleMutation = useMutation({
        mutationFn: ({ hearingId, data }) => rescheduleHearing(hearingId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["judge-hearings"] });
            setReschedulingHearing(null);
            setRescheduleData({ new_date: "", new_time: "", reason: "" });
            alert("Hearing rescheduled successfully!");
        },
        onError: (err) => alert(err.message || "Failed to reschedule hearing")
    });

    // Edit hearing mutation
    const editHearingMutation = useMutation({
        mutationFn: ({ hearingId, data }) => updateHearing(hearingId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["judge-hearings"] });
            setEditingHearing(null);
            alert("Hearing updated successfully!");
        },
        onError: (err) => alert(err.message || "Failed to update hearing")
    });

    // Record attendance mutation
    const recordAttendanceMutation = useMutation({
        mutationFn: ({ hearingId, data }) => recordHearingAttendance(hearingId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["judge-hearings"] });
            setAttendanceHearing(null);
            setAttendanceData([]);
            alert("Attendance recorded successfully!");
        },
        onError: (err) => alert(err.message || "Failed to record attendance")
    });

    // Schedule next hearing mutation
    const nextHearingMutation = useMutation({
        mutationFn: ({ hearingId, data }) => scheduleNextHearing(hearingId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["judge-hearings"] });
            queryClient.invalidateQueries({ queryKey: ["judge-dashboard-stats"] });
            alert("Follow-up hearing scheduled!");
        },
        onError: (err) => alert(err.message || "Failed to schedule next hearing")
    });

    const handleScheduleSubmit = (e) => {
        e.preventDefault();
        scheduleMutation.mutate({
            ...scheduleData,
            judge: user?.id
        });
    };

    const handleCompleteHearing = () => {
        if (!completingHearing) return;
        completeHearingMutation.mutate({
            hearingId: completingHearing.id,
            data: {
                summary: completeNotes.summary,
                action: completeNotes.action.toUpperCase(),
                judge_comment: completeNotes.judge_comment || "",
                minutes: completeNotes.minutes || "",
                ...(nextHearingDate ? { next_hearing_date: new Date(nextHearingDate).toISOString() } : {})
            }
        });
    };

    // Statistics from backend
    const totalCases = dashboardStats?.assigned_cases || 0;
    const pendingCases = dashboardStats?.pending_cases || 0;
    const closedCases = dashboardStats?.closed_cases || 0;
    const upcomingHearings = dashboardStats?.upcoming_hearings || 0;

    // Filter cases based on tab selection
    const filteredCases = cases?.filter(c => {
        if (caseFilter === "all") return true;
        if (caseFilter === "pending") return ["ASSIGNED", "PENDING_REVIEW"].includes(c.status);
        if (caseFilter === "active") return c.status === "IN_PROGRESS";
        if (caseFilter === "closed") return c.status === "CLOSED";
        return true;
    }) || [];

    // Filter hearings for the selected date
    const selectedDateHearings = hearings?.filter(h => {
        const hearingDate = new Date(h.scheduled_date || h.date);
        return (
            hearingDate.getDate() === date?.getDate() &&
            hearingDate.getMonth() === date?.getMonth() &&
            hearingDate.getFullYear() === date?.getFullYear()
        );
    }) || [];

    // Get dates that have hearings for highlighting in calendar
    const hearingDates = hearings?.map(h => new Date(h.scheduled_date || h.date)) || [];

    // Unread notifications
    const unreadNotifications = notifications?.filter(n => !n.is_read) || [];    return (
        <div className="space-y-10 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Judicial Command</h1>
                    <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        {format(new Date(), "EEEE, MMMM do, yyyy")}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/judge/search">
                        <Button variant="outline" className="h-12 px-6 rounded-xl font-bold border-white/10 glass hover:bg-white/5 transition-all text-sm group">
                            <Search className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                            Search cases
                        </Button>
                    </Link>
                    <Link href="/dashboard/judge/decisions">
                        <Button className="h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 text-white">
                            <Gavel className="mr-2 h-4 w-4" />
                            Decisions
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Statistics Cards - Enhanced Judicial Look */}
            <div className="grid gap-6 md:grid-cols-4">
                <Card className="glass-card hover:border-blue-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Total Assigned</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Briefcase className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{totalCases}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Lifecycle active</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-purple-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Pending Cases</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <Scale className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{pendingCases}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Awaiting Review</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-emerald-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Coming Hearings</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{upcomingHearings}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Scheduled Session</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-slate-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-slate-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Closed</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{closedCases}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Resolved Archive</p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs - Modern Styled */}
            <Tabs defaultValue="cases" className="w-full space-y-8">
                <TabsList className="h-14 p-1.5 bg-muted/30 border border-white/5 rounded-2xl glass backdrop-blur-xl w-full lg:max-w-2xl mx-auto flex">
                    <TabsTrigger value="cases" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
                        <Briefcase className="h-4 w-4" />
                        My Cases ({cases?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="hearings" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Hearings ({hearings?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 gap-2 relative">
                        <Bell className="h-4 w-4" />
                        Updates
                        {unreadNotifications.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black leading-none text-white ring-2 ring-background ring-offset-background">
                                {unreadNotifications.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* CASES TAB */}
                <TabsContent value="cases" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 border-b border-white/5">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-black font-display tracking-tight">Assigned Portfolio</CardTitle>
                                    <CardDescription className="text-muted-foreground font-medium">Manage and review cases within your jurisdiction.</CardDescription>
                                </div>
                                <div className="flex bg-muted/30 p-1 rounded-xl border border-white/5">
                                    {[
                                        { key: "all", label: "All" },
                                        { key: "pending", label: "New" },
                                        { key: "active", label: "Active" },
                                        { key: "closed", label: "Closed" },
                                    ].map(f => (
                                        <Button
                                            key={f.key}
                                            size="sm"
                                            variant="ghost"
                                            className={cn(
                                                "h-8 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300",
                                                caseFilter === f.key ? "bg-white text-slate-900 shadow-md scale-105" : "text-muted-foreground hover:text-white"
                                            )}
                                            onClick={() => setCaseFilter(f.key)}
                                        >
                                            {f.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            {casesLoading ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/20 rounded-2xl animate-pulse" />)}
                                </div>
                            ) : filteredCases.length > 0 ? (
                                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
                                    {filteredCases.map((caseItem) => (
                                        <div
                                            key={caseItem.id}
                                            className="group relative p-6 rounded-3xl border border-white/5 bg-background/40 hover:bg-white/5 transition-all duration-500 cursor-pointer overflow-hidden shadow-sm hover:shadow-xl"
                                            onClick={() => setSelectedCase(caseItem)}
                                        >
                                            {/* Hover Active Indicator */}
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-gradient-to-b from-primary to-blue-600 rounded-r-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                                            
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-black font-display text-xl tracking-tight group-hover:text-primary transition-colors">{caseItem.title}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-muted/50", priorityColors[caseItem.priority])}>
                                                                {caseItem.priority}
                                                            </Badge>
                                                            <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border-none", statusColors[caseItem.status])}>
                                                                {caseItem.status?.replace("_", " ")}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6 text-xs font-bold text-muted-foreground uppercase tracking-[0.15em]">
                                                        <span className="flex items-center gap-1.5"><FileText className="h-3 w-3 text-primary" /> {caseItem.file_number || "F-PENDING"}</span>
                                                        <span className="flex items-center gap-1.5"><Scale className="h-3 w-3 text-primary" /> {caseItem.category?.name || caseItem.category || "GENERAL"}</span>
                                                        <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-primary" /> {caseItem.filing_date ? format(new Date(caseItem.filing_date), "MMM d, yyyy") : "—"}</span>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" className="rounded-xl box-content px-4 py-2 hover:bg-primary/10 hover:text-primary transition-all font-bold text-xs uppercase tracking-widest scale-95 group-hover:scale-100 opacity-0 group-hover:opacity-100">
                                                    Open Record <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                    <div className="h-24 w-24 rounded-full bg-muted/10 flex items-center justify-center">
                                        <Briefcase className="h-12 w-12 text-muted-foreground/30" />
                                    </div>
                                    <div className="space-y-2 max-w-xs">
                                        <p className="text-xl font-black font-display text-foreground">No records found</p>
                                        <p className="text-sm font-medium text-muted-foreground">Try adjusting your filters or search criteria.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HEARINGS TAB */}
                <TabsContent value="hearings" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid gap-8 lg:grid-cols-7 items-start">
                        {/* Calendar Section */}
                        <div className="lg:col-span-3">
                            <Card className="glass-card border-white/5 shadow-2xl overflow-hidden h-full">
                                <CardHeader className="p-8 pb-4">
                                    <CardTitle className="text-2xl font-black font-display tracking-tight">Docket Calendar</CardTitle>
                                    <CardDescription className="text-muted-foreground font-medium">Visual overview of your court session schedule.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 pt-2 flex flex-col items-center">
                                    <div className="w-full bg-muted/20 rounded-[2.5rem] p-6 border border-white/5 shadow-inner">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            className="w-full pointer-events-auto"
                                            modifiers={{
                                                hasHearing: hearingDates
                                            }}
                                            modifiersStyles={{
                                                hasHearing: { fontWeight: 'black', color: 'hsl(var(--primary))', backgroundColor: 'hsla(var(--primary), 0.1)' }
                                            }}
                                        />
                                    </div>
                                    <div className="w-full mt-8 p-6 rounded-3xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                            <CalendarDays className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-widest text-primary">Active Dates Highlighted</p>
                                            <p className="text-[11px] font-bold text-muted-foreground/80 mt-1 uppercase tracking-tight">Sessions currently defined in backend</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Hearings List Section */}
                        <div className="lg:col-span-4 h-full">
                            <Card className="glass-card border-white/5 shadow-2xl overflow-hidden flex flex-col h-full min-h-[600px]">
                                <CardHeader className="p-8 pb-4 border-b border-white/5">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-1">
                                            <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
                                                Session: {date ? format(date, "MMM do") : "Today"}
                                                <Badge className="bg-primary/20 text-primary border-none text-[10px] font-black uppercase px-2 h-6">
                                                    {selectedDateHearings.length}
                                                </Badge>
                                            </CardTitle>
                                            <CardDescription className="text-muted-foreground font-medium">Court proceedings scheduled for the selected date.</CardDescription>
                                        </div>
                                        <Button className="h-11 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20" onClick={() => setIsScheduling(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Schedule
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 flex-1 overflow-y-auto max-h-[600px] no-scrollbar">
                                    {hearingsLoading ? (
                                        <div className="space-y-4">
                                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted/20 rounded-2xl animate-pulse" />)}
                                        </div>
                                    ) : selectedDateHearings.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedDateHearings.map((hearing) => (
                                                <div
                                                    key={hearing.id}
                                                    className="group relative p-6 rounded-3xl border border-white/5 bg-background/40 hover:bg-white/5 transition-all duration-500 cursor-pointer shadow-sm hover:shadow-xl"
                                                    onClick={() => setSelectedHearing(hearing)}
                                                >
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="space-y-1">
                                                            <h4 className="font-black font-display text-lg tracking-tight text-foreground group-hover:text-primary transition-colors">{hearing.title || hearing.case?.title || "Hearing Session"}</h4>
                                                            <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                                                <FileText className="h-3 w-3 text-primary" /> {hearing.case?.file_number || hearing.caseId || "N/A"}
                                                            </p>
                                                        </div>
                                                        <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none", statusColors[hearing.status])}>
                                                            {hearing.status}
                                                        </Badge>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                                        <div className="flex items-center gap-2 group-hover:text-foreground transition-colors">
                                                            <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center">
                                                                <Clock className="h-4 w-4 text-blue-500" />
                                                            </div>
                                                            <span>{hearing.scheduled_date ? format(new Date(hearing.scheduled_date), "h:mm a") : hearing.time || "N/A"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 group-hover:text-foreground transition-colors">
                                                            <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center">
                                                                <MapPin className="h-4 w-4 text-rose-500" />
                                                            </div>
                                                            <span className="truncate">{hearing.location || hearing.courtroom || "N/A"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 group-hover:text-foreground transition-colors md:col-span-1">
                                                            <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center">
                                                                <Gavel className="h-4 w-4 text-amber-500" />
                                                            </div>
                                                            <span>{hearing.hearing_type || hearing.type || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-6">
                                            <div className="h-24 w-24 rounded-[2rem] bg-muted/10 flex items-center justify-center border border-white/5 rotate-3 shadow-inner">
                                                <CalendarDays className="h-12 w-12 text-muted-foreground/20" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xl font-black font-display text-foreground">Clear Session</p>
                                                <p className="text-sm font-medium text-muted-foreground">No hearings recorded for this date.</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* NOTIFICATIONS TAB */}
                <TabsContent value="notifications" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden max-w-4xl mx-auto">
                        <CardHeader className="p-8 border-b border-white/5">
                            <CardTitle className="text-2xl font-black font-display tracking-tight">System Updates</CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">Keep track of case assignments and procedural changes.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            {notifications?.length > 0 ? (
                                <div className="space-y-4">
                                    {notifications.slice(0, 20).map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={cn(
                                                "relative p-6 rounded-[2rem] border transition-all duration-300 group",
                                                !notif.is_read 
                                                    ? 'bg-primary/5 border-primary/20 shadow-lg shadow-primary/5' 
                                                    : 'bg-background/40 border-white/5 hover:bg-white/5'
                                            )}
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        {!notif.is_read && <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/50 animate-pulse" />}
                                                        <h4 className="font-black font-display text-lg tracking-tight text-foreground">{notif.title}</h4>
                                                        <Badge variant="outline" className="px-2 py-0 h-5 rounded-md text-[9px] font-black uppercase tracking-widest border-none bg-muted/50 text-muted-foreground">
                                                            {notif.type?.replace("_", " ")}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">{notif.message}</p>
                                                    {notif.case_details && (
                                                        <div className="pt-2">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/50 border border-white/5 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">
                                                                <FileText className="h-3 w-3 text-primary" /> 
                                                                Docket: {notif.case_details.file_number || notif.case_details.title}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest bg-muted/20 px-3 py-1 rounded-full">
                                                        {notif.created_at ? format(new Date(notif.created_at), "MMM d, h:mm a") : ""}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                    <div className="h-24 w-24 rounded-[3rem] bg-muted/10 border border-white/5 flex items-center justify-center -rotate-12 shadow-inner">
                                        <Bell className="h-12 w-12 text-muted-foreground/20" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl font-black font-display text-foreground">Awaiting Notifications</p>
                                        <p className="text-sm font-medium text-muted-foreground">Procedural updates and alerts will appear here.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Case Detail Dialog */}
            <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
                <DialogContent className="sm:max-w-[650px]">
                    <DialogHeader>
                        <DialogTitle>Case Details</DialogTitle>
                        <DialogDescription>
                            {selectedCase?.file_number || "Pending"} — {selectedCase?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCase && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">File Number</span>
                                    <p className="font-medium">{selectedCase.file_number || "Pending"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</span>
                                    <div>
                                        <Badge className={statusColors[selectedCase.status] || ""}>
                                            {selectedCase.status?.replace("_", " ")}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Category</span>
                                    <p className="font-medium">{selectedCase.category?.name || selectedCase.category || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Priority</span>
                                    <div>
                                        <Badge variant="outline" className={priorityColors[selectedCase.priority] || ""}>
                                            {selectedCase.priority}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Filed Date</span>
                                    <p className="font-medium">
                                        {selectedCase.filing_date ? format(new Date(selectedCase.filing_date), "PPP") : "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Court</span>
                                    <p className="font-medium">{selectedCase.court_name || "Not assigned"}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Description</span>
                                <p className="text-sm leading-relaxed border rounded-lg p-3 bg-muted/50">
                                    {selectedCase.description || "No description provided."}
                                </p>
                            </div>

                            {/* Parties */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Plaintiff</span>
                                    <p className="font-medium text-sm">{selectedCase.plaintiff_name || selectedCase.created_by_name || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Defendant</span>
                                    <p className="font-medium text-sm">{selectedCase.defendant_name || "N/A"}</p>
                                </div>
                            </div>

                            {selectedCase.documents?.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Documents ({selectedCase.documents.length})</span>
                                    <div className="space-y-1">
                                        {selectedCase.documents.map((doc, i) => {
                                            const activeVersion = doc.versions?.find(v => v.is_active) || doc.versions?.[0];
                                            const fileName = activeVersion?.file_name || doc.description || doc.document_type || "Document";
                                            const docId = doc.document_id || doc.id;
                                            return (
                                                <div key={docId || i} className="flex items-center justify-between text-sm p-2 border rounded hover:bg-muted/30 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <span className="font-medium">{fileName}</span>
                                                            <span className="text-xs text-muted-foreground ml-2">{doc.document_type}</span>
                                                        </div>
                                                    </div>
                                                    {docId && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-primary text-xs h-7 px-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                downloadJudgeDocument(docId).catch(err => alert(err.message));
                                                            }}
                                                        >
                                                            <Download className="h-3 w-3 mr-1" />
                                                            Download
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setSelectedCase(null)}>Close</Button>
                        {selectedCase?.status === "ASSIGNED" && (
                            <Button
                                onClick={() => startCaseMutation.mutate({ caseId: selectedCase.id })}
                                disabled={startCaseMutation.isPending}
                            >
                                <Play className="mr-2 h-4 w-4" />
                                {startCaseMutation.isPending ? "Starting..." : "Start Case"}
                            </Button>
                        )}
                        {["ASSIGNED", "IN_PROGRESS"].includes(selectedCase?.status) && (
                            <Link href="/dashboard/judge/decisions">
                                <Button variant="secondary">
                                    <Gavel className="mr-2 h-4 w-4" />
                                    Issue Decision
                                </Button>
                            </Link>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hearing Details Dialog */}
            <Dialog open={!!selectedHearing} onOpenChange={(open) => !open && setSelectedHearing(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Hearing Details</DialogTitle>
                        <DialogDescription>
                            {selectedHearing?.case?.file_number || selectedHearing?.caseId} — {selectedHearing?.title || selectedHearing?.case?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedHearing && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Date & Time</span>
                                    <p className="font-medium flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        {selectedHearing.scheduled_date
                                            ? format(new Date(selectedHearing.scheduled_date), "PPP 'at' h:mm a")
                                            : `${selectedHearing.date} at ${selectedHearing.time}`}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Location</span>
                                    <p className="font-medium flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {selectedHearing.location || selectedHearing.courtroom || "N/A"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hearing Type</span>
                                    <p className="font-medium">{selectedHearing.hearing_type || selectedHearing.type || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</span>
                                    <Badge variant="outline" className={statusColors[selectedHearing.status] || ""}>{selectedHearing.status}</Badge>
                                </div>
                            </div>

                            {selectedHearing.agenda && (
                                <div className="space-y-2">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Agenda</span>
                                    <p className="text-sm border rounded-lg p-3 bg-muted/50">{selectedHearing.agenda}</p>
                                </div>
                            )}

                            {/* Participants */}
                            {selectedHearing.participants?.length > 0 && (
                                <div className="space-y-2">
                                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Participants</span>
                                    <div className="space-y-1">
                                        {selectedHearing.participants.map((p, i) => (
                                            <div key={i} className="flex justify-between items-center text-sm p-2 border rounded">
                                                <span>{p.user_name || p.name}</span>
                                                <Badge variant="outline" className="text-xs">{p.role_in_hearing || p.role}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 flex-wrap">
                        <Button variant="outline" onClick={() => setSelectedHearing(null)}>Close</Button>
                        {selectedHearing && !["CONDUCTED", "CANCELLED", "COMPLETED"].includes(selectedHearing.status) && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setEditData({
                                            title: selectedHearing.title || "",
                                            location: selectedHearing.location || "",
                                            agenda: selectedHearing.agenda || "",
                                            hearing_type: selectedHearing.hearing_type || ""
                                        });
                                        setEditingHearing(selectedHearing);
                                        setSelectedHearing(null);
                                    }}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setReschedulingHearing(selectedHearing);
                                        setSelectedHearing(null);
                                    }}
                                >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Reschedule
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const participants = selectedHearing.participants?.map(p => ({
                                            user_id: p.user?.id || p.id,
                                            name: p.user?.full_name || p.user_name || p.name || "Unknown",
                                            role: p.role_in_hearing || p.role || "Participant",
                                            attendance_status: p.attendance_status || "PENDING"
                                        })) || [];
                                        setAttendanceData(participants);
                                        setAttendanceHearing(selectedHearing);
                                        setSelectedHearing(null);
                                    }}
                                >
                                    <Users className="mr-2 h-4 w-4" />
                                    Attendance
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => { setCancellingHearing(selectedHearing); setSelectedHearing(null); }}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => { setCompletingHearing(selectedHearing); setSelectedHearing(null); }}
                                >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Conduct
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Complete Hearing Dialog */}
            <Dialog open={!!completingHearing} onOpenChange={(open) => !open && setCompletingHearing(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Complete Hearing</DialogTitle>
                        <DialogDescription>
                            Record the outcome and optionally schedule a follow-up hearing.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Summary *</Label>
                            <Textarea
                                placeholder="Brief summary of what occurred..."
                                value={completeNotes.summary}
                                onChange={(e) => setCompleteNotes({ ...completeNotes, summary: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Action Taken *</Label>
                            <Select value={completeNotes.action} onValueChange={(v) => setCompleteNotes({ ...completeNotes, action: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CONTINUED">Continued</SelectItem>
                                    <SelectItem value="POSTPONED">Postponed</SelectItem>
                                    <SelectItem value="ADJOURNED">Adjourned</SelectItem>
                                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Judge Comment</Label>
                            <Textarea
                                placeholder="Judge's observations or comments..."
                                value={completeNotes.judge_comment}
                                onChange={(e) => setCompleteNotes({ ...completeNotes, judge_comment: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Meeting Minutes / Proceedings</Label>
                            <Textarea
                                placeholder="Record of proceedings..."
                                value={completeNotes.minutes}
                                onChange={(e) => setCompleteNotes({ ...completeNotes, minutes: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Schedule Follow-up Hearing {completeNotes.action === "POSTPONED" ? "(Required)" : "(Optional)"}</Label>
                            <Input
                                type="datetime-local"
                                value={nextHearingDate}
                                onChange={(e) => setNextHearingDate(e.target.value)}
                            />
                            {completeNotes.action === "POSTPONED" && !nextHearingDate && (
                                <p className="text-xs text-red-500 font-medium">Next hearing date is required when action is &quot;Postponed&quot;.</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCompletingHearing(null)}>Cancel</Button>
                        <Button onClick={handleCompleteHearing} disabled={completeHearingMutation.isPending || !completeNotes.summary || (completeNotes.action === "POSTPONED" && !nextHearingDate)}>
                            {completeHearingMutation.isPending ? "Saving..." : "Complete Hearing"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Hearing Dialog */}
            <Dialog open={!!cancellingHearing} onOpenChange={(open) => !open && setCancellingHearing(null)}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Cancel Hearing</DialogTitle>
                        <DialogDescription>This will notify all participants.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Reason for Cancellation</Label>
                            <Textarea
                                placeholder="Provide a reason..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancellingHearing(null)}>Back</Button>
                        <Button
                            variant="destructive"
                            onClick={() => cancelHearingMutation.mutate({ hearingId: cancellingHearing.id, reason: cancelReason })}
                            disabled={cancelHearingMutation.isPending || !cancelReason}
                        >
                            {cancelHearingMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Schedule Hearing Dialog */}
            <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Schedule New Hearing</DialogTitle>
                        <DialogDescription>
                            Create a new hearing event and notify all parties.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleScheduleSubmit}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="case">Case</Label>
                                <Select required value={scheduleData.case || undefined} onValueChange={(val) => setScheduleData({ ...scheduleData, case: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a case" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cases?.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(String(c.status).toUpperCase())).map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.file_number || "PENDING"} - {c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hearing_type">Hearing Type</Label>
                                    <Select required value={scheduleData.hearing_type} onValueChange={(val) => setScheduleData({ ...scheduleData, hearing_type: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INITIAL">Initial Hearing</SelectItem>
                                            <SelectItem value="STATUS">Status Conference</SelectItem>
                                            <SelectItem value="EVIDENTIARY">Evidentiary Hearing</SelectItem>
                                            <SelectItem value="MOTION">Motion Hearing</SelectItem>
                                            <SelectItem value="TRIAL">Trial</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration (minutes)</Label>
                                    <Input 
                                        id="duration" 
                                        type="number" 
                                        min="15" 
                                        required
                                        value={scheduleData.duration_minutes}
                                        onChange={(e) => setScheduleData({ ...scheduleData, duration_minutes: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">Title / Objective</Label>
                                <Input 
                                    id="title" 
                                    required 
                                    placeholder="e.g. Preliminary Arguments" 
                                    value={scheduleData.title}
                                    onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date">Date & Time</Label>
                                    <Input 
                                        id="date" 
                                        type="datetime-local" 
                                        required 
                                        value={scheduleData.scheduled_date}
                                        onChange={(e) => setScheduleData({ ...scheduleData, scheduled_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Courtroom / Location</Label>
                                    <Input 
                                        id="location" 
                                        required 
                                        placeholder="e.g. Courtroom 3B" 
                                        value={scheduleData.location}
                                        onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="agenda">Agenda / Notes</Label>
                                <Textarea 
                                    id="agenda" 
                                    placeholder="Brief agenda for the hearing..." 
                                    value={scheduleData.agenda}
                                    onChange={(e) => setScheduleData({ ...scheduleData, agenda: e.target.value })}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsScheduling(false)}>Cancel</Button>
                            <Button type="submit" disabled={scheduleMutation.isPending}>
                                {scheduleMutation.isPending ? "Scheduling..." : "Schedule Hearing"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Reschedule Hearing Dialog */}
            <Dialog open={!!reschedulingHearing} onOpenChange={(open) => !open && setReschedulingHearing(null)}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Reschedule Hearing</DialogTitle>
                        <DialogDescription>
                            Move this hearing to a new date and time. A new hearing will be created and participants notified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New Date *</Label>
                            <Input
                                type="date"
                                value={rescheduleData.new_date}
                                onChange={(e) => setRescheduleData({ ...rescheduleData, new_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>New Time *</Label>
                            <Input
                                type="time"
                                value={rescheduleData.new_time}
                                onChange={(e) => setRescheduleData({ ...rescheduleData, new_time: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Reason for Rescheduling</Label>
                            <Textarea
                                placeholder="Provide a reason..."
                                value={rescheduleData.reason}
                                onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReschedulingHearing(null)}>Cancel</Button>
                        <Button
                            onClick={() => rescheduleMutation.mutate({ hearingId: reschedulingHearing.id, data: rescheduleData })}
                            disabled={rescheduleMutation.isPending || !rescheduleData.new_date || !rescheduleData.new_time}
                        >
                            {rescheduleMutation.isPending ? "Rescheduling..." : "Reschedule"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Hearing Dialog */}
            <Dialog open={!!editingHearing} onOpenChange={(open) => !open && setEditingHearing(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Hearing</DialogTitle>
                        <DialogDescription>
                            Update hearing details. Changes will be applied immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={editData.title}
                                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                placeholder="Hearing title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hearing Type</Label>
                            <Select value={editData.hearing_type} onValueChange={(v) => setEditData({ ...editData, hearing_type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INITIAL">Initial Hearing</SelectItem>
                                    <SelectItem value="INTRO">Case Introduction</SelectItem>
                                    <SelectItem value="EVIDENCE">Evidence Hearing</SelectItem>
                                    <SelectItem value="WITNESS">Witness Hearing</SelectItem>
                                    <SelectItem value="ARGUMENT">Argument Hearing</SelectItem>
                                    <SelectItem value="FINAL">Final Hearing</SelectItem>
                                    <SelectItem value="FINAL_ARGUMENT">Final Argument</SelectItem>
                                    <SelectItem value="JUDGMENT">Judgment</SelectItem>
                                    <SelectItem value="STATUS">Status Conference</SelectItem>
                                    <SelectItem value="EVIDENTIARY">Evidentiary Hearing</SelectItem>
                                    <SelectItem value="MOTION">Motion Hearing</SelectItem>
                                    <SelectItem value="TRIAL">Trial</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Location / Courtroom</Label>
                            <Input
                                value={editData.location}
                                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                placeholder="Courtroom 3B"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Agenda</Label>
                            <Textarea
                                value={editData.agenda}
                                onChange={(e) => setEditData({ ...editData, agenda: e.target.value })}
                                placeholder="Updated agenda..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingHearing(null)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                const payload = {};
                                if (editData.title) payload.title = editData.title;
                                if (editData.hearing_type) payload.hearing_type = editData.hearing_type;
                                if (editData.location) payload.location = editData.location;
                                if (editData.agenda) payload.agenda = editData.agenda;
                                editHearingMutation.mutate({ hearingId: editingHearing.id, data: payload });
                            }}
                            disabled={editHearingMutation.isPending}
                        >
                            {editHearingMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Record Attendance Dialog */}
            <Dialog open={!!attendanceHearing} onOpenChange={(open) => !open && setAttendanceHearing(null)}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Record Attendance</DialogTitle>
                        <DialogDescription>
                            Mark each participant as Present, Absent, or Late for this hearing session.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
                        {attendanceData.length > 0 ? attendanceData.map((p, i) => (
                            <div key={p.user_id || i} className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-background/40">
                                <div className="space-y-0.5">
                                    <p className="font-bold text-sm">{p.name}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{p.role}</p>
                                </div>
                                <Select
                                    value={p.attendance_status}
                                    onValueChange={(v) => {
                                        const updated = [...attendanceData];
                                        updated[i] = { ...updated[i], attendance_status: v };
                                        setAttendanceData(updated);
                                    }}
                                >
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRESENT">
                                            <span className="flex items-center gap-2"><CheckCircle className="h-3 w-3 text-green-500" /> Present</span>
                                        </SelectItem>
                                        <SelectItem value="ABSENT">
                                            <span className="flex items-center gap-2"><XCircle className="h-3 w-3 text-red-500" /> Absent</span>
                                        </SelectItem>
                                        <SelectItem value="LATE">
                                            <span className="flex items-center gap-2"><Clock className="h-3 w-3 text-yellow-500" /> Late</span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No participants found for this hearing.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAttendanceHearing(null)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                const payload = {
                                    participants: attendanceData.map(p => ({
                                        user_id: p.user_id,
                                        role: p.role,
                                        attendance_status: p.attendance_status
                                    }))
                                };
                                recordAttendanceMutation.mutate({ hearingId: attendanceHearing.id, data: payload });
                            }}
                            disabled={recordAttendanceMutation.isPending || attendanceData.length === 0}
                        >
                            {recordAttendanceMutation.isPending ? "Saving..." : "Save Attendance"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
