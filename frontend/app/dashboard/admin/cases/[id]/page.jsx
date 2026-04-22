"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchCaseById, fetchCaseTimeline } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, User, Calendar, Scale, Loader2, Shield, History, CheckCircle, Database } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { statusColors, priorityColors } from "@/lib/mock-data";

export default function AdminCaseDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const { data: caseData, isLoading, isError } = useQuery({
        queryKey: ["case-detail", id],
        queryFn: () => fetchCaseById(id),
        enabled: !!id,
    });

    const { data: timeline, isLoading: timelineLoading } = useQuery({
        queryKey: ["case-timeline", id],
        queryFn: () => fetchCaseTimeline(id),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Accessing Secure Records...</p>
            </div>
        );
    }

    if (isError || !caseData) {
        return (
            <div className="space-y-4 p-6">
                <Button variant="outline" className="rounded-xl border-white/10" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <p className="text-muted-foreground font-bold italic">Case record not found in system index.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-fade-up pb-20 mt-4">
            {/* Header Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> System Oversight
                </Button>
                
                <div className="flex items-center gap-3">
                     <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                        Admin Observation Mode
                    </Badge>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Case Info */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                         <Database className="h-4 w-4 text-primary" />
                                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Entity ID: {caseData.id}</span>
                                    </div>
                                    <CardTitle className="text-3xl font-black font-display tracking-tight text-white leading-tight">
                                        {caseData.title}
                                    </CardTitle>
                                    <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mt-2">
                                        <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> {caseData.file_number || "PENDING"}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> Created {format(new Date(caseData.created_at || caseData.filing_date), "PPP")}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge className={cn("px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border-none shadow-lg", statusColors[caseData.status])}>
                                        {caseData.status?.replace("_", " ")}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <Separator className="bg-white/5" />
                        <CardContent className="p-8 space-y-8">
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                                    <p className="text-sm font-bold text-white">{caseData.category?.name || caseData.category || "—"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Priority</p>
                                    <p className="text-sm font-bold text-white">{caseData.priority}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filing Fee Status</p>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase">Verified</Badge>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" /> Case Manifest
                                </h3>
                                <p className="text-sm font-medium leading-relaxed italic text-slate-400">
                                    {caseData.description || "The manifest contains no descriptive entries."}
                                </p>
                            </div>

                            {/* Documents Read-Only */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-primary" /> Document Assets
                                </h3>
                                <div className="grid gap-3">
                                    {caseData.documents?.length > 0 ? (
                                        caseData.documents.map((doc, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-background/50 hover:bg-white/5 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                                    <span className="text-xs font-bold">{doc.document_type || "Legal Asset"}</span>
                                                </div>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter opacity-60">Read Only</Badge>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs italic text-muted-foreground text-center py-4">No assets found for this entity.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline Oversight */}
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
                                <History className="h-5 w-5 text-primary" />
                                Audit Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            {timelineLoading ? (
                                <div className="space-y-4 pt-4">
                                    {[1, 2].map(i => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
                                </div>
                            ) : timeline?.length > 0 ? (
                                <div className="space-y-4 pt-4">
                                    {timeline.map((event, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                                            <div className="flex items-center gap-4">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <CheckCircle className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{event.title || event.event_type}</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium">{event.description}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{format(new Date(event.date), "MMM d, HH:mm")}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs italic text-muted-foreground text-center py-10">No audit events found for this case entity.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Oversight */}
                <div className="space-y-8">
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                         <CardHeader className="p-6 pb-2">
                             <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Entity Relationships</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">Plaintiff Entity</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-black">{caseData.plaintiff_name?.charAt(0) || "P"}</div>
                                        <div>
                                            <p className="text-sm font-bold text-white truncate max-w-[150px]">{caseData.plaintiff_name || "Unknown Entity"}</p>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">Filing User ID: {caseData.created_by_id || "772"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500/70">Defendant Entity</p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center font-black">{caseData.defendant_name?.charAt(0) || "D"}</div>
                                        <div>
                                            <p className="text-sm font-bold text-white truncate max-w-[150px]">{caseData.defendant_name || "Unlinked"}</p>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase">System ID: {caseData.defendant?.id || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-white/5 bg-primary/5">
                        <CardHeader className="p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">System Metadata</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            <div className="grid gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase">Internal Tag</p>
                                    <p className="text-xs font-bold text-white">{caseData.category?.id || "CAT-UNSPEC"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase">Database Integrity</p>
                                    <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] font-black">STABLE</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
