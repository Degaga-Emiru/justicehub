"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCases, fetchHearings } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, ArrowRight, Clock, PlusCircle, AlertTriangle, CreditCard, CheckCircle, Scale } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";
import { useLanguage } from "@/components/language-provider";

const STATUS_LABELS = {
 PENDING_REVIEW: "Pending Review",
 APPROVED: "Awaiting Payment",
 REJECTED: "Rejected",
 PAID: "Pending Payment Verification",
 ASSIGNED: "Assigned",
 IN_PROGRESS: "In Progress",
 CLOSED: "Closed",
};

export default function ClientDashboard() {
 const { user } = useAuthStore();
 const { t } = useLanguage();
 const { data: cases, isLoading: loadingCases } = useQuery({
 queryKey: ["cases", user?.id],
 queryFn: () => fetchCases(),
 enabled: !!user,
 });

 const { data: hearings, isLoading: loadingHearings } = useQuery({
 queryKey: ["hearings"],
 queryFn: () => fetchHearings(),
 });

 const myHearings = hearings?.slice(0, 3) || [];

 // Count cases by backend statuses
 const activeCases = cases?.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)) || [];
 const pendingCases = cases?.filter(c => c.status === "PENDING_REVIEW") || [];
 const awaitingPayment = cases?.filter(c => c.status === "APPROVED") || [];
 const rejectedCases = cases?.filter(c => c.status === "REJECTED") || [];

 return (
 <div className="space-y-10 animate-fade-up">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">{t("overview")}</h1>
 <p className="text-slate-300 font-medium text-lg leading-relaxed">
 {t("welcomeBackName").replace("{name}", user?.name || "Client")}
 </p>
 </div>
 <Link href="/dashboard/client/register-case">
 <Button className="h-14 px-8 rounded-2xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 text-white">
 <PlusCircle className="mr-2 h-5 w-5" />
 {t("newCaseFiling")}
 </Button>
 </Link>
 </div>

 {/* Stats Overview */}
 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
 <Card className="glass-card hover:border-primary/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-primary/10 transition-colors"></div>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-slate-300">{t("activeCasesOverview")}</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
 <FileText className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{activeCases.length}</div>
 <p className="text-xs font-bold text-slate-200 uppercase tracking-tight mt-1">Assigned &amp; In Progress</p>
 </CardContent>
 </Card>

 <Card className="glass-card hover:border-primary/30 transition-all duration-500 overflow-hidden relative group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-primary/10 transition-colors"></div>
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-slate-300">{t("pendingReview")}</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
 <Clock className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{pendingCases.length}</div>
 <p className="text-xs font-bold text-slate-200 uppercase tracking-tight mt-1">{t("awaitingRegistrar")}</p>
 </CardContent>
 </Card>

 <Card className={cn(
 "glass-card hover:border-blue-400/50 transition-all duration-500 overflow-hidden relative group",
 awaitingPayment.length > 0 ? "border-blue-500/30 bg-blue-500/5" : ""
 )}>
 {awaitingPayment.length > 0 && <div className="absolute inset-0 bg-blue-500/5 animate-pulse-slow"></div>}
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-slate-300">Awaiting Payment</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
 <CreditCard className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent className="relative z-10">
 <div className="text-4xl font-black font-display text-foreground">{awaitingPayment.length}</div>
 {awaitingPayment.length > 0 ? (
 <Link href="/dashboard/client/cases" className="inline-flex items-center text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider mt-2 group/pay">
 Pay now <ArrowRight className="ml-1 h-3 w-3 group-hover/pay:translate-x-1 transition-transform" />
 </Link>
 ) : (
 <p className="text-xs font-bold text-slate-200 uppercase tracking-tight mt-1">No pending fees</p>
 )}
 </CardContent>
 </Card>

 {rejectedCases.length > 0 ? (
 <Card className="glass-card border-destructive/30 bg-destructive/5 hover:border-destructive/50 transition-all duration-500 overflow-hidden relative group">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-destructive">Rejected</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
 <AlertTriangle className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-destructive">{rejectedCases.length}</div>
 <Link href="/dashboard/client/cases" className="inline-flex items-center text-xs font-black text-destructive hover:underline uppercase tracking-wider mt-2 group/view">
 View details <ArrowRight className="ml-1 h-3 w-3 group-hover/view:translate-x-1 transition-transform" />
 </Link>
 </CardContent>
 </Card>
 ) : (
 <Card className="glass-card hover:border-primary/30 transition-all duration-500 overflow-hidden relative group">
 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
 <CardTitle className="text-xs font-black uppercase tracking-[0.1em] text-slate-300">{t("upcomingHearings")}</CardTitle>
 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
 <Calendar className="h-5 w-5" />
 </div>
 </CardHeader>
 <CardContent>
 <div className="text-4xl font-black font-display text-foreground">{myHearings.length}</div>
 <p className="text-xs font-bold text-slate-200 uppercase tracking-tight mt-1">{t("next30Days")}</p>
 </CardContent>
 </Card>
 )}
 </div>

 <div className="grid gap-8 md:grid-cols-7">
 {/* Recent Cases List */}
 <Card className="col-span-4 glass-card border-white/10 shadow-xl overflow-hidden">
 <CardHeader className="p-8 pb-4">
 <div className="flex justify-between items-center">
 <div className="space-y-1">
 <CardTitle className="text-2xl font-black font-display tracking-tight">{t("recentCases")}</CardTitle>
 <CardDescription className="text-slate-300 font-medium">{t("recentCasesDesc")}</CardDescription>
 </div>
 <Button variant="ghost" size="sm" className="font-bold text-primary group" asChild>
 <Link href="/dashboard/client/cases">
 {t("viewAll")} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
 <div key={caseItem.id} className="flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-background/30 hover:bg-white/5 transition-all duration-300 group">
 <div className="space-y-2 flex-1">
 <div className="flex items-center gap-3">
 <p className="font-bold font-display text-lg tracking-tight group-hover:text-primary transition-colors">{caseItem.title}</p>
 <Badge variant="outline" className={cn(
 "px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider",
 statusColors[caseItem.status] || "bg-gray-100 text-gray-800"
 )}>
 {STATUS_LABELS[caseItem.status] || caseItem.status}
 </Badge>
 </div>
 <div className="flex items-center gap-4 text-xs font-bold text-slate-300 uppercase tracking-widest leading-none">
 <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {caseItem.file_number || "—"}</span>
 <span className="flex items-center gap-1.5"><PlusCircle className="h-3 w-3" /> {caseItem.category?.name || caseItem.category || "General"}</span>
 </div>
 {caseItem.status === "REJECTED" && caseItem.rejection_reason && (
 <div className="flex items-start gap-2 p-3 mt-3 rounded-xl bg-destructive/5 border border-destructive/10 animate-in fade-in duration-500">
 <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
 <p className="text-xs font-bold text-destructive leading-relaxed capitalize">
 {caseItem.rejection_reason}
 </p>
 </div>
 )}
 </div>
 <Button variant="ghost" size="icon" className="rounded-xl box-content p-2 hover:bg-primary/10 hover:text-primary h-8 w-8 transition-all" asChild>
 <Link href={`/dashboard/client/cases`}>
 <ArrowRight className="h-5 w-5" />
 </Link>
 </Button>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
 <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
 <FileText className="h-8 w-8 text-slate-200" />
 </div>
 <p className="text-lg font-bold text-slate-300 max-w-xs">{t("noCasesStart")}</p>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Upcoming Hearings */}
 <Card className="col-span-3 glass-card border-white/10 shadow-xl overflow-hidden flex flex-col">
 <CardHeader className="p-8 pb-4">
 <CardTitle className="text-2xl font-black font-display tracking-tight">{t("scheduleTitle")}</CardTitle>
 <CardDescription className="text-slate-300 font-medium">{t("scheduleDesc")}</CardDescription>
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
 <div key={hearing.id} className="flex gap-5 items-center group">
 <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary to-blue-600 text-white w-20 h-20 rounded-[2rem] shrink-0 shadow-lg shadow-primary/20 transform group-hover:-rotate-6 transition-transform duration-500">
 <span className="text-[10px] font-black uppercase tracking-widest">{new Date(hearing.date || hearing.scheduled_date).toLocaleString('default', { month: 'short' })}</span>
 <span className="text-2xl font-black font-display">{new Date(hearing.date || hearing.scheduled_date).getDate()}</span>
 </div>
 <div className="space-y-1.5 flex-1">
 <div className="flex items-center gap-2">
 <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-black uppercase tracking-widest h-5">
 Hearing
 </Badge>
 <h4 className="font-bold text-sm tracking-tight text-foreground truncate">{hearing.type || hearing.hearing_type}</h4>
 </div>
 <p className="text-xs font-bold text-slate-300 truncate">{hearing.caseTitle || hearing.title}</p>
 <div className="flex items-center gap-3 text-xs font-black text-slate-200 uppercase tracking-tighter">
 <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-primary" /> {hearing.time || hearing.start_time}</span>
 <span className="flex items-center gap-1.5 truncate"><Scale className="h-3 w-3 text-primary" /> {hearing.courtroom || hearing.location}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
 <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
 <Calendar className="h-8 w-8 text-slate-200" />
 </div>
 <p className="text-lg font-bold text-slate-300 max-w-xs">{t("noUpcomingHearings")}</p>
 </div>
 )}
 </CardContent>
 <div className="p-8 pt-6">
 <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-white/10 glass hover:bg-white/5 transition-all text-sm group" asChild>
 <Link href="/dashboard/client/schedule">
 {t("viewFullCalendar")} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
 </Link>
 </Button>
 </div>
 </Card>
 </div>
 </div>
 );
}
