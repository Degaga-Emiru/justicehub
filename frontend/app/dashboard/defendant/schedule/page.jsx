"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHearings } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Gavel, Loader2, Info, ArrowRight, Video } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DefendantSchedulePage() {
 const router = useRouter();
 const { data: hearings, isLoading } = useQuery({
 queryKey: ["hearings"],
 queryFn: () => fetchHearings(),
 });

 const statusStyles = {
 SCHEDULED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
 IN_PROGRESS: "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
 COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
 CANCELLED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
 };

 return (
 <div className="space-y-8 animate-fade-up pb-20">
 <div>
 <h1 className="text-3xl font-black font-display tracking-tight text-slate-100 mb-2">Hearing Schedule</h1>
 <p className="text-slate-300 font-medium">Official court dates and mandatory appearance sessions.</p>
 </div>

 <div className="space-y-6">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center py-32 space-y-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-xs font-black uppercase tracking-widest text-slate-300">Syncing Judicial Calendar...</p>
 </div>
 ) : hearings?.length > 0 ? (
 hearings.map((hearing) => (
 <Card 
 key={hearing.id} 
 className="glass-card border-white/5 shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden group cursor-pointer"
 onClick={() => router.push(`/dashboard/defendant/schedule/${hearing.id}`)}
 >
 <div className="flex flex-col md:flex-row">
 {/* Date Column */}
 <div className="bg-white/5 md:w-48 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 shrink-0 transition-colors group-hover:bg-primary/5">
 <span className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">
 {format(new Date(hearing.scheduled_date), "MMM")}
 </span>
 <span className="text-4xl font-black text-slate-200 leading-none mb-1">
 {format(new Date(hearing.scheduled_date), "dd")}
 </span>
 <span className="text-xs font-bold text-slate-300">
 {format(new Date(hearing.scheduled_date), "yyyy")}
 </span>
 </div>

 {/* Details Column */}
 <CardContent className="flex-1 p-8">
 <div className="flex flex-col md:flex-row justify-between gap-6">
 <div className="space-y-4">
 <div className="flex flex-wrap items-center gap-3">
 <Badge className={cn("text-[10px] font-black uppercase tracking-widest border px-3", statusStyles[hearing.status] || "")}>
 {hearing.status}
 </Badge>
 <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-white/10 text-slate-300">
 Docket {hearing.case_number || "PENDING"}
 </Badge>
 {hearing.hearing_format === 'VIRTUAL' && (
 <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
 <Video className="h-3 w-3" /> Virtual
 </Badge>
 )}
 </div>

 <h3 className="text-xl font-black text-slate-100 tracking-tight">{hearing.title}</h3>
 
 <div className="flex flex-wrap gap-x-8 gap-y-3">
 <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
 <Clock className="h-4 w-4 text-primary" />
 {format(new Date(hearing.scheduled_date), "HH:mm")} ({hearing.duration_minutes} min)
 </div>
 <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
 <MapPin className="h-4 w-4 text-primary" />
 {hearing.location || (hearing.virtual_meeting_link ? "Virtual Meeting" : "Main Courtroom")}
 </div>
 <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
 <Gavel className="h-4 w-4 text-primary" />
 {hearing.hearing_type?.replace('_', ' ')}
 </div>
 </div>
 </div>

 <div className="flex items-end justify-end">
 <Button 
 className="rounded-xl font-bold bg-white/5 hover:bg-white/10 border-white/10 px-6 group"
 onClick={() => router.push(`/dashboard/defendant/cases/${hearing.case}`)}
 >
 View Case File <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
 </Button>
 </div>
 </div>
 </CardContent>
 </div>
 </Card>
 ))
 ) : (
 <div className="flex flex-col items-center justify-center py-40 space-y-4 ">
 <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center">
 <Calendar className="h-10 w-10 text-slate-300" />
 </div>
 <p className="text-lg font-bold text-slate-200">No hearings scheduled</p>
 <p className="text-sm text-center max-w-[300px]">All judicial dates for your cases will appear here as soon as they are assigned by the Clerk.</p>
 </div>
 )}
 </div>

 <Card className="glass-card border-amber-500/10 bg-amber-500/5">
 <CardContent className="p-6 flex gap-4">
 <Info className="h-5 w-5 text-amber-500 shrink-0" />
 <p className="text-xs text-amber-400 leading-relaxed font-medium">
 Appearance at scheduled hearings is **mandatory**. If you are unable to attend a virtual or physical hearing, please contact the Registrar's office at least 48 hours in advance to file a postponement request.
 </p>
 </CardContent>
 </Card>
 </div>
 );
}
