"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { fetchCaseById } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, FileText, Download, User, Calendar, Scale, 
  Loader2, CheckCircle, Clock, Gavel, History, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const BACKEND_URL = "http://127.0.0.1:8000";

function getFileUrl(filePath) {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return `${BACKEND_URL}${filePath}`;
}

export default function ClosedCaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: caseData, isLoading, isError } = useQuery({
    queryKey: ["case-detail", id],
    queryFn: () => fetchCaseById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Loading archive details...</p>
      </div>
    );
  }

  if (isError || !caseData) {
    return (
      <div className="space-y-4 p-6 animate-fade-up">
        <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
        <Card className="bg-card shadow-sm border-border border-destructive/30">
          <CardContent className="p-12 text-center space-y-3">
            <div className="h-16 w-16 rounded-[2rem] bg-destructive/10 flex items-center justify-center mx-auto">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-destructive font-bold">Failed to load archive. The case may not exist or is not closed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hearings = caseData.hearings || [];
  const decisions = caseData.decisions || [];
  const documents = caseData.documents || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-700 pb-20 p-6">
      <Button variant="outline" className="rounded-xl border-border hover:bg-primary/10 hover:text-primary transition-all" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Archive
      </Button>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Case Overview */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
            <CardHeader className="p-8 bg-muted/10 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-black uppercase tracking-widest px-2 py-1">
                    Archived Case
                  </Badge>
                  <CardTitle className="text-3xl font-black font-display tracking-tight">
                    {caseData.title}
                  </CardTitle>
                  <CardDescription className="font-medium text-base">
                    Docket ID: <span className="font-mono font-black text-foreground">{caseData.file_number}</span>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                  <Badge className="bg-slate-500/10 text-muted-foreground border-none text-[10px] font-black uppercase tracking-widest px-3 py-1.5">
                    CLOSED
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                  <p className="text-sm font-bold text-foreground">{caseData.category?.name || caseData.category_name}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assigned Judge</p>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                      {caseData.current_assignment?.judge_name?.charAt(0) || "J"}
                    </div>
                    <p className="text-sm font-bold">{caseData.current_assignment?.judge_name || "Unassigned"}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Closure Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <p className="text-sm font-bold">{caseData.closed_date ? format(new Date(caseData.closed_date), "MMMM d, yyyy") : "—"}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plaintiff</p>
                  <p className="text-sm font-bold">{caseData.plaintiff?.first_name} {caseData.plaintiff?.last_name}</p>
                </div>
              </div>

              <Separator className="bg-muted/30" />

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Final Outcome / Decision</p>
                {decisions.length > 0 ? (
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <Gavel className="h-5 w-5" />
                      <h4 className="font-black font-display tracking-tight">{decisions[0].title}</h4>
                    </div>
                    <p className="text-sm font-medium leading-relaxed italic">
                      {decisions[0].content}
                    </p>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-black uppercase text-muted-foreground">Finalized on {format(new Date(decisions[0].created_at), "MMM d, yyyy")}</span>
                      <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase tracking-widest">Enforceable</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-muted/20 rounded-2xl text-center italic text-muted-foreground text-sm font-medium">
                    No formal decision record found.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Case Description</p>
                <p className="text-sm font-medium leading-relaxed bg-muted/20 p-6 rounded-2xl border border-border">
                  {caseData.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                Case Documents Archive
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black h-6 px-2">{documents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <Separator className="bg-muted/30" />
            <CardContent className="p-8">
              <div className="grid gap-3">
                {documents.map((doc, i) => {
                  const latestVersion = doc.versions?.[0];
                  const fileUrl = getFileUrl(latestVersion?.file || latestVersion?.file_url);

                  return (
                    <div key={doc.id || i} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{doc.document_type_display || doc.document_type}</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{latestVersion?.size_display}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild className="rounded-xl hover:bg-primary/10 hover:text-primary">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Process Timeline */}
        <div className="space-y-8">
          <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden sticky top-8">
            <CardHeader className="p-6 bg-primary/5">
              <CardTitle className="text-lg font-black font-display tracking-tight flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Process Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-muted/50 before:to-transparent">
                
                {/* 1. Filing */}
                <div className="relative flex items-center justify-between gap-4 pl-10">
                  <div className="absolute left-0 h-10 w-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 z-10">
                    <FileText className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Filing</p>
                    <p className="text-sm font-bold">Case Submitted</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(caseData.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>

                {/* 2. Review */}
                <div className="relative flex items-center justify-between gap-4 pl-10">
                  <div className="absolute left-0 h-10 w-10 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 z-10">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Review</p>
                    <p className="text-sm font-bold">Accepted by Registrar</p>
                    <p className="text-xs text-muted-foreground">{caseData.reviewed_at ? format(new Date(caseData.reviewed_at), "MMM d, yyyy") : "—"}</p>
                  </div>
                </div>

                {/* 3. Assignment */}
                <div className="relative flex items-center justify-between gap-4 pl-10">
                  <div className="absolute left-0 h-10 w-10 rounded-full bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 z-10">
                    <User className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Assignment</p>
                    <p className="text-sm font-bold">Judge Allocated</p>
                    <p className="text-xs text-muted-foreground">{caseData.current_assignment?.assigned_at ? format(new Date(caseData.current_assignment.assigned_at), "MMM d, yyyy") : "—"}</p>
                  </div>
                </div>

                {/* 4. Hearings */}
                {hearings.length > 0 && (
                  <div className="relative flex items-center justify-between gap-4 pl-10">
                    <div className="absolute left-0 h-10 w-10 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 z-10">
                      <Calendar className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-muted-foreground">Proceedings</p>
                      <p className="text-sm font-bold">{hearings.length} Hearing(s) Conducted</p>
                      <p className="text-xs text-muted-foreground">Last: {format(new Date(hearings[0].scheduled_date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                )}

                {/* 5. Closure */}
                <div className="relative flex items-center justify-between gap-4 pl-10">
                  <div className="absolute left-0 h-10 w-10 rounded-full bg-slate-500/20 border-2 border-slate-500 flex items-center justify-center shadow-lg shadow-slate-500/20 z-10">
                    <CheckCircle className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground">Closure</p>
                    <p className="text-sm font-bold">Case Closed</p>
                    <p className="text-xs text-muted-foreground font-black text-primary">{caseData.closed_date ? format(new Date(caseData.closed_date), "MMM d, yyyy") : "—"}</p>
                  </div>
                </div>

              </div>

              <div className="mt-10 p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Duration</p>
                <p className="text-xl font-black font-display tracking-tight text-foreground">{caseData.days_pending} Days</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
