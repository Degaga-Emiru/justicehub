"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDefendantCases, fetchDefendantHearings, acknowledgeDefendantDecision, submitDefendantResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gavel, Calendar, CheckSquare, MessageSquare, AlertCircle, FileText, Clock, MapPin, ArrowRight, Shield, Scale } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
    PENDING_REVIEW: { label: "Reviewing", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    APPROVED: { label: "Pending Action", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    ASSIGNED: { label: "Assigned", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
    IN_PROGRESS: { label: "In Progress", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    DECIDED: { label: "Decided", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
    CLOSED: { label: "Closed", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
};

export default function DefendantDashboardPage() {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();

    // Modals
    const [isResponseOpen, setIsResponseOpen] = useState(false);
    const [isAcknowledgeOpen, setIsAcknowledgeOpen] = useState(false);
    const [targetCase, setTargetCase] = useState(null);
    const [responseText, setResponseText] = useState("");

    // Queries
    const { data: cases = [], isLoading: casesLoading, isError: casesError } = useQuery({
        queryKey: ["defendantCases"],
        queryFn: () => fetchDefendantCases()
    });

    const { data: hearings = [], isLoading: hearingsLoading } = useQuery({
        queryKey: ["defendantHearings"],
        queryFn: () => fetchDefendantHearings()
    });

    // Mutations
    const acknowledgeMutation = useMutation({
        mutationFn: ({ caseId }) => acknowledgeDefendantDecision(caseId, { acknowledged: true }),
        onSuccess: () => {
            queryClient.invalidateQueries(["defendantCases"]);
            setIsAcknowledgeOpen(false);
            setTargetCase(null);
        }
    });

    const responseMutation = useMutation({
        mutationFn: ({ caseId, text }) => submitDefendantResponse(caseId, { response: text }),
        onSuccess: () => {
            queryClient.invalidateQueries(["defendantCases"]);
            setIsResponseOpen(false);
            setTargetCase(null);
            setResponseText("");
        }
    });

    const handleActionClick = (action, caseItem) => {
        setTargetCase(caseItem);
        if (action === "ACKNOWLEDGE") setIsAcknowledgeOpen(true);
        if (action === "RESPOND") setIsResponseOpen(true);
    };

    // Derived stats
    const activeCases = cases.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status));
    const decidedCases = cases.filter(c => c.status === "DECIDED");
    const upcomingHearings = hearings.filter(h => new Date(h.scheduled_date) > new Date());

    return (
        <div className="space-y-10 animate-fade-up">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Defendant Portal</h1>
                    <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        View accusations, track hearings, and submit your official responses.
                    </p>
                </div>
            </div>

            {casesError && (
                <Alert variant="destructive" className="glass border-destructive/50 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-bold">Failed to load your cases. Ensure your backend connection is healthy.</AlertDescription>
                </Alert>
            )}

            {/* Statistics Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="glass-card hover:border-purple-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Total Cases</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <Scale className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{cases.length}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Filed against you</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-blue-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Active Cases</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <FileText className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{activeCases.length}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">In judicial process</p>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "glass-card hover:border-rose-400/50 transition-all duration-500 overflow-hidden relative group",
                    decidedCases.length > 0 ? "border-rose-500/30 bg-rose-500/5" : ""
                )}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-rose-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Decisions</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <Gavel className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{decidedCases.length}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Require attention</p>
                    </CardContent>
                </Card>

                <Card className="glass-card hover:border-emerald-500/30 transition-all duration-500 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Hearings</CardTitle>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <Calendar className="h-5 w-5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black font-display text-foreground">{upcomingHearings.length}</div>
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tight mt-1">Upcoming sessions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-7">
                {/* Cases List */}
                <Card className="col-span-4 glass-card border-white/10 shadow-xl overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <div className="flex justify-between items-center">
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
                                    <Gavel className="h-6 w-6 text-primary" /> Cases Against You
                                </CardTitle>
                                <CardDescription className="text-muted-foreground font-medium">Review and respond to accusations filed in your name.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        {casesLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : cases.length > 0 ? (
                            <div className="space-y-3">
                                {cases.map((caseItem) => {
                                    const statusCfg = STATUS_CONFIG[caseItem.status] || { label: caseItem.status, color: "bg-muted/50 text-muted-foreground" };
                                    return (
                                        <div key={caseItem.id} className="flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-background/30 hover:bg-white/5 transition-all duration-300 group">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-3">
                                                    <p className="font-bold font-display text-lg tracking-tight group-hover:text-primary transition-colors">{caseItem.title}</p>
                                                    <Badge variant="outline" className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border-none", statusCfg.color)}>
                                                        {statusCfg.label}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                                    <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {caseItem.file_number || "PENDING"}</span>
                                                    <span className="flex items-center gap-1.5"><Scale className="h-3 w-3" /> {caseItem.plaintiff_name || caseItem.plaintiff?.first_name || "Unknown"}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {!caseItem.is_defendant_acknowledged && caseItem.status === "DECIDED" && (
                                                    <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs uppercase tracking-widest border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 transition-all" onClick={() => handleActionClick("ACKNOWLEDGE", caseItem)}>
                                                        <CheckSquare className="mr-1.5 h-3.5 w-3.5" /> Acknowledge
                                                    </Button>
                                                )}
                                                <Button size="sm" className="rounded-xl font-bold text-xs uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-none" onClick={() => handleActionClick("RESPOND", caseItem)}>
                                                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Respond
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                                    <Scale className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <p className="text-lg font-bold text-muted-foreground max-w-xs">No active cases found against your record.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Hearings */}
                <Card className="col-span-3 glass-card border-white/10 shadow-xl overflow-hidden flex flex-col">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
                            <Calendar className="h-6 w-6 text-primary" /> Court Sessions
                        </CardTitle>
                        <CardDescription className="text-muted-foreground font-medium">Scheduled appearances requiring your attendance.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8 flex-1">
                        {hearingsLoading ? (
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : hearings.length > 0 ? (
                            <div className="space-y-6">
                                {hearings.map((hearing) => (
                                    <div key={hearing.id} className="flex gap-5 items-center group">
                                        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-primary to-blue-600 text-white w-20 h-20 rounded-[2rem] shrink-0 shadow-lg shadow-primary/20 transform group-hover:-rotate-6 transition-transform duration-500">
                                            <span className="text-[10px] font-black uppercase tracking-widest">{new Date(hearing.scheduled_date).toLocaleString('default', { month: 'short' })}</span>
                                            <span className="text-2xl font-black font-display">{new Date(hearing.scheduled_date).getDate()}</span>
                                        </div>
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-purple-500/10 text-purple-600 border-none text-[9px] font-black uppercase tracking-widest h-5">
                                                    {hearing.status || "Scheduled"}
                                                </Badge>
                                                <h4 className="font-bold text-sm tracking-tight text-foreground truncate">{hearing.case_title || `Case ${hearing.case_number}`}</h4>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs font-black text-muted-foreground/60 uppercase tracking-tighter">
                                                <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-primary" /> {new Date(hearing.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="flex items-center gap-1.5 truncate"><MapPin className="h-3 w-3 text-primary" /> {hearing.hearing_format === "VIRTUAL" ? "Online Court" : `Room ${hearing.court_room || "TBD"}`}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                                    <Calendar className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <p className="text-lg font-bold text-muted-foreground max-w-xs">No upcoming hearings scheduled.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Acknowledge Dialog */}
            <Dialog open={isAcknowledgeOpen} onOpenChange={(open) => !acknowledgeMutation.isPending && setIsAcknowledgeOpen(open)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black font-display">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                <CheckSquare className="h-5 w-5" />
                            </div>
                            Acknowledge Court Decision
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium">
                            By clicking confirm, you legally acknowledge the decision rendered for <span className="font-bold text-foreground">{targetCase?.file_number}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2 sm:gap-0">
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsAcknowledgeOpen(false)} disabled={acknowledgeMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => acknowledgeMutation.mutate({ caseId: targetCase.id })}
                            disabled={acknowledgeMutation.isPending}
                            className="rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20"
                        >
                            {acknowledgeMutation.isPending ? "Confirming..." : "I Acknowledge"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Submit Response Dialog */}
            <Dialog open={isResponseOpen} onOpenChange={(open) => !responseMutation.isPending && setIsResponseOpen(open)}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black font-display">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            Submit Official Response
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium">
                            Submit your arguments or defense statements for <span className="font-bold text-foreground">{targetCase?.file_number}</span>. This will be permanently attached to the case file.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {responseMutation.isError && (
                            <Alert variant="destructive" className="glass border-destructive/50">
                                <AlertDescription className="font-bold">
                                    {responseMutation.error?.message || "Failed to submit response."}
                                </AlertDescription>
                            </Alert>
                        )}
                        <Textarea
                            placeholder="Enter your defensive arguments here..."
                            className="min-h-[150px] bg-background/50 border-white/20 rounded-xl focus:ring-primary/20"
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            disabled={responseMutation.isPending}
                        />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsResponseOpen(false)} disabled={responseMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => responseMutation.mutate({ caseId: targetCase.id, text: responseText })}
                            disabled={!responseText.trim() || responseMutation.isPending}
                            className="rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 text-white shadow-lg shadow-primary/20"
                        >
                            {responseMutation.isPending ? "Submitting..." : "Submit to Court"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
