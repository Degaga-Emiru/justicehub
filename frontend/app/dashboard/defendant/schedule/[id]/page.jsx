"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHearingById } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
 Calendar, Clock, MapPin, Gavel, Loader2, 
 ArrowLeft, Video, Users, FileText, 
 MessageSquare, AlertCircle, CheckCircle2,
 CalendarClock, Info
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function HearingDetailPage() {
 const router = useRouter();
 const { id } = useParams();
 
 const { data: hearing, isLoading, error } = useQuery({
 queryKey: ["hearing", id],
 queryFn: () => fetchHearingById(id),
 enabled: !!id,
 });

 const statusStyles = {
 SCHEDULED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
 IN_PROGRESS: "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
 CONDUCTED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
 COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
 CANCELLED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
 RESCHEDULED: "bg-slate-500/10 text-slate-300 border-slate-500/20",
 };

 const getNotesText = (notes) => {
 if (!notes) return null;
 if (typeof notes === 'string') return notes;
 if (typeof notes === 'object') {
 if (notes.summary) return notes.summary;
 if (notes.text) return notes.text;
 // Fallback: strip braces for simple objects
 const entries = Object.entries(notes);
 if (entries.length === 1) return entries[0][1];
 return JSON.stringify(notes, null, 2);
 }
 return String(notes);
 };

 const getRoleColor = (role) => {
 const r = role?.toLowerCase() || '';
 if (r.includes('judge')) return 'text-amber-400';
 if (r.includes('plaintiff')) return 'text-blue-400';
 if (r.includes('defendant')) return 'text-rose-400';
 if (r.includes('lawyer')) return 'text-indigo-400';
 return 'text-primary';
 };

 if (isLoading) {
 return (
 <div className="flex flex-col items-center justify-center py-32 space-y-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-xs font-black uppercase tracking-widest text-slate-300">Retrieving Hearing Details...</p>
 </div>
 );
 }

 if (error || !hearing) {
 return (
 <div className="flex flex-col items-center justify-center py-32 space-y-6">
 <div className="h-20 w-20 rounded-full bg-rose-500/10 flex items-center justify-center">
 <AlertCircle className="h-10 w-10 text-rose-500" />
 </div>
 <div className="text-center space-y-2">
 <h2 className="text-2xl font-black text-slate-200">Hearing Not Found</h2>
 <p className="text-slate-300 max-w-md">The hearing record you are looking for might have been moved or deleted.</p>
 </div>
 <Button variant="outline" onClick={() => router.back()} className="rounded-xl border-white/10 glass">
 <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
 </Button>
 </div>
 );
 }

 const scheduledDate = new Date(hearing.scheduled_date);

 return (
 <div className="space-y-10 animate-fade-up pb-20">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
 <div className="space-y-2">
 <button 
 onClick={() => router.back()}
 className="flex items-center text-xs font-black uppercase tracking-[0.2em] text-primary hover:text-primary/80 transition-colors mb-4 group"
 >
 <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
 Back to Schedule
 </button>
 <div className="flex items-center gap-3">
 <h1 className="text-4xl font-black font-display tracking-tight text-slate-100">{hearing.title}</h1>
 <Badge className={cn("text-[10px] font-black uppercase tracking-widest border px-3", statusStyles[hearing.status] || "")}>
 {hearing.status}
 </Badge>
 </div>
 <p className="text-slate-200 font-semibold text-lg leading-relaxed max-w-2xl">
 Official {hearing.hearing_type?.replace('_', ' ').toLowerCase()} proceedings for Case {hearing.case_details?.file_number}.
 </p>
 </div>
 
 <div className="flex gap-3 shrink-0">
 <Button variant="outline" className="rounded-xl border-white/10 glass font-bold h-12 px-6" asChild>
 <Link href={`/dashboard/defendant/cases/${hearing.case}`}>
 <FileText className="mr-2 h-4 w-4" /> View Case
 </Link>
 </Button>
 {hearing.virtual_meeting_link && hearing.status === 'SCHEDULED' && (
 <Button className="rounded-xl bg-primary hover:bg-primary/90 font-bold h-12 px-6 shadow-lg shadow-primary/20 text-white">
 <Video className="mr-2 h-4 w-4" /> Join Virtual Court
 </Button>
 )}
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Main Content */}
 <div className="lg:col-span-2 space-y-8">
 {/* Time and Location Card */}
 <Card className="glass-card border-white/5 overflow-hidden">
 <div className="grid grid-cols-1 md:grid-cols-3">
 <div className="p-8 border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02]">
 <div className="flex items-center gap-3 mb-4 text-primary">
 <Calendar className="h-5 w-5" />
 <span className="text-xs font-black uppercase tracking-widest">Session Date</span>
 </div>
 <p className="text-2xl font-black text-slate-200">{format(scheduledDate, "MMMM dd")}</p>
 <p className="text-sm font-bold text-slate-200">{format(scheduledDate, "yyyy")}</p>
 </div>
 <div className="p-8 border-b md:border-b-0 md:border-r border-white/5 bg-white/[0.02]">
 <div className="flex items-center gap-3 mb-4 text-primary">
 <Clock className="h-5 w-5" />
 <span className="text-xs font-black uppercase tracking-widest">Scheduled Time</span>
 </div>
 <p className="text-2xl font-black text-slate-200">{format(scheduledDate, "HH:mm")}</p>
 <p className="text-sm font-bold text-slate-200">{hearing.duration_minutes} Minute Duration</p>
 </div>
 <div className="p-8 bg-white/[0.02]">
 <div className="flex items-center gap-3 mb-4 text-primary">
 <MapPin className="h-5 w-5" />
 <span className="text-xs font-black uppercase tracking-widest">Venue / Location</span>
 </div>
 <p className="text-2xl font-black text-slate-200 truncate">{hearing.location || "Main Courtroom"}</p>
 {hearing.virtual_meeting_link ? (
 <p className="text-xs font-bold text-indigo-400 truncate">Virtual Link Available Below</p>
 ) : (
 <p className="text-sm font-bold text-slate-200">Physical Attendance Required</p>
 )}
 </div>
 </div>
 </Card>

 {/* Agenda & Notes */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <Card className="glass-card border-white/5">
 <CardHeader>
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
 <Users className="h-4 w-4" />
 </div>
 <CardTitle className="text-lg font-black font-display tracking-tight text-slate-200">Session Agenda</CardTitle>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 {hearing.agenda ? (
 <p className="text-slate-300 font-medium leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
 {hearing.agenda}
 </p>
 ) : (
 <p className="text-slate-300 italic font-medium">No formal agenda has been submitted for this session.</p>
 )}
 </CardContent>
 </Card>

 <Card className="glass-card border-white/5">
 <CardHeader>
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
 <MessageSquare className="h-4 w-4" />
 </div>
 <CardTitle className="text-lg font-black font-display tracking-tight text-slate-200">Court Notes</CardTitle>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 {hearing.notes ? (
 <div className="text-slate-300 font-medium leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
 {getNotesText(hearing.notes)}
 </div>
 ) : (
 <p className="text-slate-300 italic font-medium">General administrative notes for the parties.</p>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Hearing Results (if conducted) */}
 {(hearing.status === 'CONDUCTED' || hearing.status === 'COMPLETED') && (
 <Card className="glass-card border-emerald-500/20 bg-emerald-500/5">
 <CardHeader>
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <Gavel className="h-4 w-4" />
 </div>
 <CardTitle className="text-lg font-black font-display tracking-tight text-emerald-400">Hearing Results</CardTitle>
 </div>
 </CardHeader>
 <CardContent className="space-y-6">
 {hearing.summary && (
 <div className="space-y-2">
 <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Executive Summary</span>
 <div className="text-slate-200 font-medium leading-relaxed">
 {typeof hearing.summary === 'string' ? (
 hearing.summary
 ) : (
 <pre className="text-xs whitespace-pre-wrap font-mono">
 {JSON.stringify(hearing.summary, null, 2)}
 </pre>
 )}
 </div>
 </div>
 )}
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {hearing.action && (
 <div className="space-y-2">
 <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Judicial Action</span>
 <div className="flex items-center gap-2">
 <CheckCircle2 className="h-4 w-4 text-emerald-500" />
 <p className="text-slate-200 font-black">{hearing.action?.replace('_', ' ')}</p>
 </div>
 </div>
 )}
 {hearing.next_hearing_date && (
 <div className="space-y-2">
 <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Next Scheduled Date</span>
 <div className="flex items-center gap-2 text-slate-200">
 <CalendarClock className="h-4 w-4 text-emerald-500" />
 <p className="font-black">{format(new Date(hearing.next_hearing_date), "MMM dd, yyyy 'at' HH:mm")}</p>
 </div>
 </div>
 )}
 </div>

 {hearing.judge_comment && (
 <div className="space-y-2 pt-4 border-t border-emerald-500/10">
 <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Judge's Comments</span>
 <p className="text-slate-300 italic font-medium leading-relaxed">"{hearing.judge_comment}"</p>
 </div>
 )}
 </CardContent>
 </Card>
 )}
 </div>

 {/* Sidebar */}
 <div className="space-y-8">
 {/* Participants Card */}
 <Card className="glass-card border-white/5">
 <CardHeader>
 <CardTitle className="text-lg font-black font-display tracking-tight text-slate-200">Summoned Parties</CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <div className="divide-y divide-white/5">
 {hearing.participants?.length > 0 ? (
 hearing.participants.map((participant, idx) => (
 <div key={idx} className="p-5 flex items-center justify-between group hover:bg-white/5 transition-colors">
 <div className="space-y-1">
 <p className={cn("text-sm font-black", getRoleColor(participant.role_in_hearing))}>
 {participant.user?.full_name || "Unknown Participant"}
 </p>
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-200 group-hover:text-primary transition-colors">
 {participant.role_in_hearing}
 </p>
 </div>
 <Badge variant="outline" className={cn(
 "text-[9px] font-black uppercase tracking-tight",
 participant.confirmation_status === 'CONFIRMED' ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5" :
 participant.confirmation_status === 'DECLINED' ? "border-rose-500/30 text-rose-500 bg-rose-500/5" :
 "border-slate-500/30 text-slate-300"
 )}>
 {participant.confirmation_status || 'PENDING'}
 </Badge>
 </div>
 ))
 ) : (
 <div className="p-10 text-center text-slate-300 italic text-sm">
 No participants listed yet.
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Virtual Meeting Info */}
 {hearing.virtual_meeting_link && (
 <Card className="glass-card border-indigo-500/20 bg-indigo-500/5">
 <CardHeader>
 <div className="flex items-center gap-3">
 <Video className="h-5 w-5 text-indigo-400" />
 <CardTitle className="text-lg font-black font-display tracking-tight text-indigo-400">Virtual Access</CardTitle>
 </div>
 </CardHeader>
 <CardContent className="space-y-4">
 <p className="text-xs font-medium text-slate-200 leading-relaxed">
 This session is being held virtually. Ensure your hardware and internet connection are stable at least 10 minutes prior to commencement.
 </p>
 <div className="p-4 bg-background/50 border border-white/5 rounded-xl flex items-center justify-between">
 <code className="text-[10px] text-slate-300 truncate mr-2">
 {hearing.virtual_meeting_link}
 </code>
 <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/10" onClick={() => {
 navigator.clipboard.writeText(hearing.virtual_meeting_link);
 // Simple toast fallback or just feedback
 }}>
 Copy
 </Button>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Mandatory Appearance Notice */}
 <Card className="glass-card border-amber-500/10 bg-amber-500/5">
 <CardContent className="p-6 space-y-4">
 <div className="flex items-center gap-3 text-amber-500">
 <Info className="h-5 w-5" />
 <span className="text-xs font-black uppercase tracking-widest">Legal Notice</span>
 </div>
 <p className="text-[11px] text-amber-400 leading-relaxed font-medium">
 Attendance at this {hearing.hearing_format?.toLowerCase() || 'scheduled'} hearing is **mandatory** for all summoned parties. Failure to appear without valid legal excuse may result in a default judgment or a warrant of arrest for contempt of court.
 </p>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
