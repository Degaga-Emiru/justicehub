"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchCaseById } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText, Download, User, Calendar, Scale, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = "http://127.0.0.1:8000";

const STATUS_STYLES = {
    PENDING_REVIEW: "bg-amber-500/10 text-amber-600",
    APPROVED: "bg-blue-500/10 text-blue-600",
    PAID: "bg-teal-500/10 text-teal-600",
    ASSIGNED: "bg-indigo-500/10 text-indigo-600",
    IN_PROGRESS: "bg-purple-500/10 text-purple-600",
    CLOSED: "bg-slate-500/10 text-slate-500",
};

function getFileUrl(filePath) {
    if (!filePath) return null;
    if (filePath.startsWith("http")) return filePath;
    return `${BACKEND_URL}${filePath}`;
}

export default function ClerkCaseDetailPage() {
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
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Loading case details...</p>
            </div>
        );
    }

    if (isError || !caseData) {
        return (
            <div className="space-y-4 p-6 animate-fade-up">
                <Button variant="outline" className="rounded-xl" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
                <Card className="glass-card border-destructive/30">
                    <CardContent className="p-12 text-center space-y-3">
                        <div className="h-16 w-16 rounded-[2rem] bg-destructive/10 flex items-center justify-center mx-auto">
                            <FileText className="h-8 w-8 text-destructive/50" />
                        </div>
                        <p className="text-destructive font-bold">Failed to load case details. The case may not exist or you may not have permission.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const documents = caseData.documents || [];

    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-fade-up">
            {/* Back Button */}
            <Button variant="outline" className="rounded-xl border-white/10 hover:bg-primary/10 hover:text-primary transition-all" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cases
            </Button>

            {/* Case Header */}
            <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                <CardHeader className="p-8">
                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <CardTitle className="text-3xl font-black font-display tracking-tight flex items-center gap-3">
                                <Scale className="h-7 w-7 text-primary" />
                                {caseData.title}
                            </CardTitle>
                            <CardDescription className="font-medium text-base">
                                File Number: <span className="font-mono font-black text-foreground">{caseData.file_number || "PENDING"}</span>
                            </CardDescription>
                        </div>
                        <Badge className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-none", STATUS_STYLES[caseData.status] || "bg-muted/50 text-muted-foreground")}>
                            {caseData.status_display || caseData.status}
                        </Badge>
                    </div>
                </CardHeader>
                <Separator className="bg-white/5" />
                <CardContent className="p-8 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</p>
                            <p className="text-sm font-bold">{caseData.category_name || caseData.category?.name || "—"}</p>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Priority</p>
                            <p className="text-sm font-bold">{caseData.priority_display || caseData.priority || "—"}</p>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filed By</p>
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <User className="h-3.5 w-3.5" />
                                </div>
                                <p className="text-sm font-bold">{caseData.client_name || caseData.created_by?.first_name || "Unknown"}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filing Date</p>
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Calendar className="h-3.5 w-3.5" />
                                </div>
                                <p className="text-sm font-bold">{caseData.created_at ? new Date(caseData.created_at).toLocaleDateString() : "—"}</p>
                            </div>
                        </div>
                    </div>

                    {caseData.description && (
                        <div className="space-y-2 pt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</p>
                            <p className="text-sm font-medium leading-relaxed bg-muted/20 p-5 rounded-xl border border-white/5">{caseData.description}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Documents Section */}
            <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                <CardHeader className="p-8">
                    <CardTitle className="text-xl font-black font-display tracking-tight flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        Uploaded Documents
                        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black h-6 px-2">{documents.length}</Badge>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-medium">Documents uploaded by the citizen during case registration.</CardDescription>
                </CardHeader>
                <Separator className="bg-white/5" />
                <CardContent className="p-8">
                    {documents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 border border-white/5 shadow-inner">
                                <FileText className="h-10 w-10 text-muted-foreground/20" />
                            </div>
                            <p className="text-lg font-bold text-muted-foreground">No documents were uploaded for this case.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {documents.map((doc, i) => {
                                const latestVersion = doc.versions?.[0];
                                const fileUrl = getFileUrl(latestVersion?.file || latestVersion?.file_url);

                                return (
                                    <div key={doc.document_id || doc.id || i} className="flex items-center justify-between p-5 border border-white/5 rounded-xl hover:bg-white/5 transition-colors group">
                                        <div className="flex items-center gap-4 overflow-hidden">
                                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transform group-hover:-rotate-6 transition-transform duration-500">
                                                <FileText className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex flex-col truncate">
                                                <span className="text-sm font-bold">{doc.document_type || "Document"}</span>
                                                {latestVersion?.file_name && (
                                                    <span className="text-xs text-muted-foreground truncate font-medium">{latestVersion.file_name}</span>
                                                )}
                                                {latestVersion?.size_display && (
                                                    <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">{latestVersion.size_display}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 ml-4">
                                            {latestVersion?.status && (
                                                <Badge className="bg-muted/50 text-muted-foreground border-none text-[9px] font-black uppercase tracking-widest">
                                                    {latestVersion.status_display || latestVersion.status}
                                                </Badge>
                                            )}
                                            {fileUrl ? (
                                                <Button variant="outline" size="sm" asChild className="rounded-xl border-white/10 hover:bg-primary/10 hover:text-primary transition-all">
                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                                        <Download className="h-4 w-4 mr-2" /> View
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" disabled className="rounded-xl">
                                                    No File
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
