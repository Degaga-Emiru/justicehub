"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchCaseById, fetchCaseTimeline } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    ArrowLeft, FileText, User, Calendar, Scale, Loader2, 
    Shield, History, CheckCircle, Database, MapPin, 
    Gavel, Briefcase, Clock, AlertTriangle, Download,
    ExternalLink, Activity, Info
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusStyles = {
    PENDING_REVIEW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    APPROVED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    REJECTED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    PAID: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    ASSIGNED: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    IN_PROGRESS: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    CLOSED: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

const priorityStyles = {
    LOW: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    MEDIUM: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    URGENT: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

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
            <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="h-20 w-20 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                    <Database className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-primary animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                    <p className="text-sm font-black text-foreground uppercase tracking-[0.3em]">JusticeHub Protocol</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Decrypting Case Records...</p>
                </div>
            </div>
        );
    }

    if (isError || !caseData) {
        return (
            <div className="max-w-4xl mx-auto p-12 text-center space-y-6">
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 shadow-2xl shadow-rose-500/10 rotate-12 mb-4">
                    <AlertTriangle className="h-10 w-10 text-rose-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black font-display tracking-tight text-foreground">Record Integrity Violation</h2>
                    <p className="text-muted-foreground font-medium max-w-md mx-auto">The requested case entity could not be located in the centralized database. It may have been archived or deleted.</p>
                </div>
                <Button variant="outline" className="h-12 px-8 rounded-xl font-bold border-white/10 hover:bg-white/5 transition-all" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Return to Index
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-[1400px] mx-auto animate-fade-up pb-24">
            {/* Navigation & Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 px-4">
                <div className="space-y-4">
                    <Button 
                        variant="ghost" 
                        className="p-0 h-auto font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Case Index
                    </Button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1">
                                Case Profile
                            </Badge>
                            <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">UID: {caseData.id.slice(0, 18)}...</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black font-display tracking-tight text-foreground leading-tight max-w-4xl">
                            {caseData.title}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <Button variant="outline" className="h-14 flex-1 lg:flex-none px-8 rounded-2xl font-bold border-white/5 bg-white/5 hover:bg-white/10 transition-all shadow-xl">
                        <Download className="mr-2 h-4 w-4" /> Export Dossier
                    </Button>
                    <Badge className={cn("h-14 px-8 rounded-2xl text-sm font-black uppercase tracking-widest border shadow-2xl flex items-center justify-center", statusStyles[caseData.status])}>
                        {caseData.status_display || caseData.status?.replace("_", " ")}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Primary Data */}
                <div className="lg:col-span-8 space-y-10">
                    {/* Key Metrics Ribbon */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                        <MetricCard label="System Index" value={caseData.file_number || "PENDING"} icon={Database} color="primary" />
                        <MetricCard label="Priority Level" value={caseData.priority_display || caseData.priority} icon={AlertTriangle} color="amber" />
                        <MetricCard label="Time in Pipeline" value={`${caseData.days_pending || 0} Days`} icon={Clock} color="blue" />
                        <MetricCard label="Filing Integrity" value="Verified" icon={CheckCircle} color="emerald" />
                    </div>

                    {/* Case Narrative */}
                    <Card className="glass-card border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
                                <FileText className="h-6 w-6 text-primary" /> Case Narrative
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-10 pt-0 space-y-10">
                            <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Info className="h-4 w-4 text-primary" /> Formal Description
                                </h4>
                                <div className="p-8 rounded-3xl bg-muted/20 border border-white/5 leading-relaxed text-lg font-medium text-slate-300 italic">
                                    "{caseData.description || "No formal description provided for this legal entity."}"
                                </div>
                            </div>

                            {caseData.case_summary && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Executive Summary</h4>
                                    <p className="text-base text-muted-foreground leading-relaxed pl-4 border-l-2 border-primary/20">
                                        {caseData.case_summary}
                                    </p>
                                </div>
                            )}

                            {/* Party Identification Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                                <PartyCard 
                                    type="Plaintiff / Petitioner" 
                                    name={caseData.plaintiff?.full_name || caseData.created_by?.full_name || "Anonymous Entity"} 
                                    lawyer={caseData.plaintiff_lawyer?.full_name}
                                    color="blue"
                                />
                                <PartyCard 
                                    type="Defendant / Respondent" 
                                    name={caseData.defendant_name || caseData.defendant?.full_name || "Unidentified"} 
                                    address={caseData.defendant_address}
                                    lawyer={caseData.defendant_lawyer?.full_name}
                                    color="rose"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Evidence & Documentation */}
                    <Card className="glass-card border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                            <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
                                <Shield className="h-6 w-6 text-primary" /> Evidence Vault
                            </CardTitle>
                            <CardDescription className="text-muted-foreground font-medium">Digital assets and verified legal filings.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {caseData.documents && caseData.documents.length > 0 ? (
                                    caseData.documents.map((doc, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/20 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <FileText className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black font-display group-hover:text-primary transition-colors">{doc.document_type_display || doc.document_type}</span>
                                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{doc.versions?.length || 1} Version(s)</span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/20 hover:text-primary">
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4 border border-dashed border-white/10 rounded-3xl bg-muted/10">
                                        <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center border border-white/5">
                                            <Shield className="h-8 w-8 text-muted-foreground/30" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-lg font-black font-display text-foreground">Vault Empty</p>
                                            <p className="text-sm font-medium text-muted-foreground">No digital evidence has been registered for this case entity.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Meta & Audit */}
                <div className="lg:col-span-4 space-y-10">
                    {/* Judicial Assignment */}
                    <Card className="glass-card border-white/5 shadow-2xl rounded-[2.5rem] bg-primary/5 border-primary/10 overflow-hidden">
                        <CardHeader className="p-8">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary">Judicial Assignment</CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            {caseData.current_assignment ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center shadow-xl">
                                            <Gavel className="h-8 w-8 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black font-display text-foreground leading-tight">Judge {caseData.current_assignment.judge_name}</span>
                                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Presiding Officer</span>
                                        </div>
                                    </div>
                                    <div className="grid gap-4 pt-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-black uppercase text-muted-foreground tracking-widest">Assigned On</span>
                                            <span className="font-bold text-foreground">{format(new Date(caseData.current_assignment.assigned_at), "MMM d, yyyy")}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-black uppercase text-muted-foreground tracking-widest">Assigned By</span>
                                            <span className="font-bold text-foreground">{caseData.current_assignment.assigned_by || "System Admin"}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-10 text-center space-y-4">
                                    <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 mx-auto flex items-center justify-center">
                                        <User className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black font-display text-foreground uppercase tracking-widest">Pending Assignment</p>
                                        <p className="text-xs font-medium text-muted-foreground">No presiding officer has been designated yet.</p>
                                    </div>
                                </div>
                            )}
                            
                            {caseData.court_name && (
                                <div className="pt-6 border-t border-primary/10">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 text-primary mt-0.5" />
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black uppercase text-primary tracking-widest">Jurisdiction</span>
                                            <span className="text-sm font-bold text-foreground">{caseData.court_name}</span>
                                            <span className="text-xs font-medium text-muted-foreground">Chamber {caseData.court_room || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Timeline Tracker */}
                    <Card className="glass-card border-white/5 shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="p-8">
                            <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
                                <Activity className="h-5 w-5 text-primary" /> Lifecycle Audit
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                            {timelineLoading ? (
                                <div className="space-y-6 pt-4">
                                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
                                </div>
                            ) : timeline && timeline.length > 0 ? (
                                <div className="relative space-y-8 pt-4 before:absolute before:inset-0 before:left-[19px] before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:to-transparent">
                                    {timeline.map((event, idx) => (
                                        <div key={idx} className="relative flex gap-6 group">
                                            <div className="relative z-10 h-10 w-10 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center shrink-0 group-hover:border-primary/50 transition-colors shadow-lg">
                                                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            </div>
                                            <div className="flex flex-col space-y-1 pb-4">
                                                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{format(new Date(event.date), "MMM d, HH:mm")}</p>
                                                <p className="text-sm font-black text-foreground font-display leading-tight">{event.title || event.event_type}</p>
                                                <p className="text-xs font-medium text-muted-foreground leading-relaxed">{event.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 text-center space-y-3">
                                    <History className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Initial Audit State</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Taxonomy & Data Metadata */}
                    <Card className="glass-card border-white/5 shadow-inner bg-muted/10 rounded-[2rem]">
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Legal Taxonomy</p>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-black font-display text-white">{caseData.category?.name || "UNCLASSIFIED"}</span>
                                </div>
                            </div>
                            <Separator className="bg-white/5" />
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filing Date</p>
                                    <p className="text-xs font-bold text-white">{format(new Date(caseData.filing_date), "MMM d, yyyy")}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Records Checksum</p>
                                    <Badge className="bg-emerald-500/20 text-emerald-500 border-none text-[8px] font-black px-2 py-0">INTEGRITY OK</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ label, value, icon: Icon, color }) {
    const colorMap = {
        primary: "bg-primary/10 text-primary border-primary/20",
        amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    };

    return (
        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 shadow-xl space-y-3 group hover:border-white/10 transition-all hover:translate-y-[-2px]">
            <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", colorMap[color])}>
                <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{label}</p>
                <p className="text-lg font-black font-display tracking-tight text-foreground truncate">{value}</p>
            </div>
        </div>
    );
}

function PartyCard({ type, name, lawyer, address, color }) {
    const colorMap = {
        blue: {
            bg: "bg-blue-500/10",
            text: "text-blue-500",
            border: "border-blue-500/20",
            iconBg: "bg-blue-500/20"
        },
        rose: {
            bg: "bg-rose-500/10",
            text: "text-rose-500",
            border: "border-rose-500/20",
            iconBg: "bg-rose-500/20"
        }
    };

    const c = colorMap[color];

    return (
        <div className={cn("p-8 rounded-3xl border transition-all hover:bg-white/5", c.bg, c.border)}>
            <p className={cn("text-[10px] font-black uppercase tracking-widest mb-6", c.text)}>{type}</p>
            <div className="flex items-start gap-5">
                <div className={cn("h-16 w-16 rounded-[1.25rem] flex items-center justify-center font-black text-2xl shadow-inner border border-white/10 shrink-0", c.iconBg, c.text)}>
                    {name?.charAt(0) || "?"}
                </div>
                <div className="flex flex-col space-y-4 flex-1 min-w-0">
                    <div className="space-y-1">
                        <p className="text-xl font-black font-display text-white truncate leading-tight">{name}</p>
                        {address && <p className="text-xs text-muted-foreground font-medium italic truncate">{address}</p>}
                    </div>
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-2">
                            <Scale className={cn("h-3.5 w-3.5 opacity-50", c.text)} />
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Legal Counsel</span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                            {lawyer ? (
                                <span className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-primary" /> {lawyer}
                                </span>
                            ) : (
                                <span className="text-muted-foreground opacity-40">Pro Se / Self Represented</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
