"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDefendantCases, fetchHearings } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, ArrowRight, Clock, AlertTriangle, Shield, CheckCircle, Scale, Gavel } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";
import { useRouter } from "next/navigation";

const STATUS_LABELS = {
 PENDING_REVIEW: "Under Investigation",
 APPROVED: "Fee Pending (Plaintiff)",
 REJECTED: "Dismissed",
 PAID: "Active Intake",
 ASSIGNED: "Case Assigned",
 IN_PROGRESS: "In Progress",
 DECIDED: "Judgment Rendered",
 CLOSED: "Archived",
};

export default function DefendantDashboard() {
 const { user } = useAuthStore();
 const { t } = useLanguage();
 const router = useRouter();
 
 const { data: cases, isLoading: loadingCases } = useQuery({
 queryKey: ["defendant-cases", user?.id],
 queryFn: () => fetchDefendantCases(),
 enabled: !!user,
 });

 const { data: hearings, isLoading: loadingHearings } = useQuery({
 queryKey: ["hearings"],
 queryFn: () => fetchHearings(),
 });

 const myHearings = hearings?.slice(0, 3) || [];

 // Count cases by state
 const activeCases = cases?.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)) || [];
 const pendingActions = cases?.filter(c => 
 (c.status === "DECIDED" && !c.is_defendant_acknowledged) || 
 (c.status === "ASSIGNED" && !c.defendant_response)
 ) || [];
 const upcomingHearingsCount = myHearings.length;
 const resolvedCases = cases?.filter(c => c.status === "CLOSED") || [];

 return (
 <div className="space-y-10 animate-fade-up">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-slate-100">Defense Command</h1>
 <p className="text-slate-200 font-semibold text-lg leading-relaxed">
 Welcome back, {user?.name || "Defendant"}. Monitor your active legal standing.
 </p>
 </div>
 </div>

 {/* Stats Overview */}
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
 <Card className="glass-card hover:border-blue-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors"></div>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-slate-300">Cases Against You</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
 <Shield className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{cases?.length || 0}</div>
 <p className="text-xs font-black text-slate-200 uppercase tracking-[0.05em] mt-1">Total Litigation</p>
 </CardContent>
 </Card>

 <Card className={cn(
 "glass-card hover:border-rose-500/30 transition-all duration-500 overflow-hidden relative group",
 pendingActions.length > 0 ? "border-rose-500/30 bg-rose-500/5" : ""
 )}>
 {pendingActions.length > 0 && <div className="absolute inset-0 bg-rose-500/5 animate-pulse-slow"></div>}
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-slate-300">Pending Actions</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
 <AlertTriangle className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent className="relative z-10">
 <div className="text-4xl font-black font-display text-foreground">{pendingActions.length}</div>
 {pendingActions.length > 0 ? (
 <Link href="/dashboard/defendant/cases" className="inline-flex items-center text-xs font-black text-rose-500 hover:text-rose-600 uppercase tracking-wider mt-2 group/act">
 Respond Now <ArrowRight className="ml-1 h-3 w-3 group-hover/act:translate-x-1 transition-transform" />
 </Link>
 ) : (
 <p className="text-xs font-bold text-slate-200 uppercase tracking-tight mt-1">All clear</p>
 )}
 </CardContent>
 </Card>

 <Card className="glass-card hover:border-emerald-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors"></div>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-slate-300">Hearings</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
 <Calendar className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{upcomingHearingsCount}</div>
 <p className="text-xs font-black text-slate-200 uppercase tracking-[0.05em] mt-1">Next 30 Days</p>
 </CardContent>
 </Card>

 <Card className="glass-card hover:border-slate-500/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-slate-500/10 transition-colors"></div>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-slate-300">Resolved</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-slate-500/10 text-slate-300 flex items-center justify-center">
 <CheckCircle className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{resolvedCases.length}</div>
 <p className="text-xs font-black text-slate-200 uppercase tracking-[0.05em] mt-1">Total Closed</p>
 </CardContent>
 </Card>
 </div>

 <div className="grid gap-8 md:grid-cols-7">
 {/* Recent Cases List */}
 <Card className="col-span-4 glass-card border-white/10 shadow-xl overflow-hidden">
 <CardHeader className="p-8 pb-4">
 <div className="flex justify-between items-center">
 <div className="space-y-1">
 <CardTitle className="text-2xl font-black font-display tracking-tight text-slate-100">Active Disputes</CardTitle>
 <CardDescription className="text-slate-200 font-medium">Ongoing legal proceedings involving your account.</CardDescription>
 </div>
 <Button variant="ghost" size="sm" className="font-bold text-primary group" asChild>
 <Link href="/dashboard/defendant/cases">
 View All <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
 </Link>
 </Button>
 </div>
 </CardHeader>
 <CardContent className="px-8 pb-8">
 {loadingCases ? (
 <div className="space-y-4">
 {[1, 2, 3].map((i) => (
 <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
 ))}
 </div>
 ) : cases?.length > 0 ? (
 <div className="space-y-3">
 {cases.slice(0, 5).map((caseItem) => (
 <div 
 key={caseItem.id} 
 className="flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-background/30 hover:bg-white/5 transition-all duration-300 group cursor-pointer"
 onClick={() => router.push(`/dashboard/defendant/cases/${caseItem.id}`)}
 >
 <div className="space-y-2 flex-1">
 <div className="flex items-center gap-3">
 <p className="font-bold font-display text-lg tracking-tight text-slate-200 group-hover:text-primary transition-colors">{caseItem.title}</p>
 <Badge variant="outline" className={cn(
 "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
 statusColors[caseItem.status] || "bg-gray-100 text-gray-800"
 )}>
 {STATUS_LABELS[caseItem.status] || caseItem.status}
 </Badge>
 </div>
 <div className="flex items-center gap-4 text-xs font-bold text-slate-200 uppercase tracking-[0.1em] leading-none">
 <span className="flex items-center gap-1.5"><FileText className="h-3 w-3 text-primary/90" /> {caseItem.file_number || "F-PENDING"}</span>
 <span className="flex items-center gap-1.5"><Scale className="h-3 w-3 text-primary/90" /> {caseItem.category?.name || caseItem.category || "General"}</span>
 </div>
 </div>
 <Button variant="ghost" size="icon" className="rounded-xl box-content p-2 hover:bg-primary/10 hover:text-primary h-8 w-8 transition-all">
 <ArrowRight className="h-5 w-5" />
 </Button>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
 <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
 <Shield className="h-8 w-8 text-slate-200" />
 </div>
 <p className="text-lg font-bold text-slate-300 max-w-xs text-center px-4">No active legal disputes found for your account.</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Upcoming Hearings */}
 <Card className="col-span-3 glass-card border-white/10 shadow-xl overflow-hidden flex flex-col">
 <CardHeader className="p-8 pb-4">
 <div className="flex justify-between items-center">
 <div className="space-y-1">
 <CardTitle className="text-2xl font-black font-display tracking-tight text-slate-100">Court Schedule</CardTitle>
 <CardDescription className="text-slate-200 font-medium">Your upcoming summons and hearings.</CardDescription>
 </div>
 <Button variant="ghost" size="sm" className="font-bold text-primary group" asChild>
 <Link href="/dashboard/defendant/schedule">
 View All <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
 </Link>
 </Button>
 </div>
 </CardHeader>
 <CardContent className="px-8 pb-0 flex-1">
 {loadingHearings ? (
 <div className="space-y-4">
 {[1, 2].map((i) => (
 <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
 ))}
 </div>
 ) : myHearings.length > 0 ? (
 <div className="space-y-6">
 {myHearings.map((hearing) => (
 <div 
 key={hearing.id} 
 className="flex gap-5 items-center group cursor-pointer hover:bg-white/5 p-3 rounded-2xl transition-all duration-300"
 onClick={() => router.push(`/dashboard/defendant/schedule/${hearing.id}`)}
 >
 <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white w-20 h-20 rounded-[2rem] shrink-0 shadow-lg shadow-blue-500/20 transform group-hover:-rotate-6 transition-transform duration-500">
 <span className="text-[10px] font-black uppercase tracking-widest">{new Date(hearing.date || hearing.scheduled_date).toLocaleString('default', { month: 'short' })}</span>
 <span className="text-2xl font-black font-display">{new Date(hearing.date || hearing.scheduled_date).getDate()}</span>
 </div>
 <div className="space-y-1.5 flex-1">
 <div className="flex items-center gap-2">
 <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] font-black uppercase tracking-widest h-5">
 Required
 </Badge>
 <h4 className="font-bold text-sm tracking-tight text-foreground truncate">{hearing.type || hearing.hearing_type}</h4>
 </div>
 <p className="text-xs font-bold text-slate-300 truncate">{hearing.caseTitle || hearing.title || "Court Intake"}</p>
 <div className="flex items-center gap-3 text-xs font-black text-slate-200 uppercase tracking-tighter">
 <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-primary" /> {hearing.time || hearing.start_time || "Morning"}</span>
 </div>
 </div>
 <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
 <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
 <Calendar className="h-8 w-8 text-slate-200" />
 </div>
 <p className="text-lg font-bold text-slate-300 max-w-xs">No upcoming hearings scheduled.</p>
 </div>
 )}
 </CardContent>
 <div className="p-8 pt-6">
 <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-white/10 glass hover:bg-white/5 transition-all text-sm group" asChild>
 <Link href="/dashboard/defendant/schedule">
 View Full Docket <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
 </Link>
 </Button>
 </div>
 </Card>
 </div>
 </div>
 );
}
