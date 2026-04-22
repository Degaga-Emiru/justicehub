"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDefendantCases, fetchDefendantDocuments } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, Download, Loader2, Search, Filter, ArrowRight, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function DefendantDocumentsPage() {
    const [selectedCaseId, setSelectedCaseId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const { data: cases, isLoading: loadingCases } = useQuery({
        queryKey: ["defendant-cases"],
        queryFn: () => fetchDefendantCases(),
    });

    const { data: documents, isLoading: loadingDocs } = useQuery({
        queryKey: ["case-documents-defendant", selectedCaseId],
        queryFn: () => fetchDefendantDocuments(selectedCaseId),
        enabled: !!selectedCaseId,
    });

    const filteredCases = cases?.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.file_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedCase = cases?.find(c => c.id === selectedCaseId);

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black font-display tracking-tight text-white mb-2">Legal Documents</h1>
                    <p className="text-muted-foreground font-medium">Access all official court orders, filings, and judgments.</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Case Selector */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Find Case..." 
                            className="pl-10 bg-white/5 border-white/10 rounded-xl focus-visible:ring-primary/40"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="space-y-3">
                        {loadingCases ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
                            ))
                        ) : filteredCases?.length > 0 ? (
                            filteredCases.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setSelectedCaseId(c.id)}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl border transition-all duration-300 group",
                                        selectedCaseId === c.id 
                                            ? "bg-primary/20 border-primary shadow-lg shadow-primary/10" 
                                            : "bg-white/5 border-white/5 hover:bg-white/10"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary bg-primary/5">
                                            {c.file_number}
                                        </Badge>
                                        <ArrowRight className={cn("h-4 w-4 text-primary transition-transform", selectedCaseId === c.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
                                    </div>
                                    <p className="font-bold text-sm text-white truncate">{c.title}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium mt-1">{c.status}</p>
                                </button>
                            ))
                        ) : (
                            <p className="text-center text-xs text-muted-foreground py-10">No cases found.</p>
                        )}
                    </div>
                </div>

                {/* Document List */}
                <div className="lg:col-span-2">
                    {selectedCaseId ? (
                        <Card className="glass-card border-white/5 shadow-2xl overflow-hidden min-h-[500px]">
                            <CardHeader className="p-8 border-b border-white/5 bg-white/5">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl font-black">{selectedCase?.title}</CardTitle>
                                        <CardDescription>Documents assigned to this case file.</CardDescription>
                                    </div>
                                    <FolderOpen className="h-8 w-8 text-primary/40" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingDocs ? (
                                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Retrieving Secure Files...</p>
                                    </div>
                                ) : documents?.length > 0 ? (
                                    <div className="divide-y divide-white/5">
                                        {documents.map((doc, idx) => (
                                            <div key={idx} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <div>
                                                        <Badge className="bg-primary/5 text-primary border border-primary/20 text-[10px] font-black uppercase px-2 mb-1">
                                                            {doc.document_type}
                                                        </Badge>
                                                        <p className="text-sm font-bold text-white">{doc.description || "Official Filing"}</p>
                                                        <p className="text-[11px] text-muted-foreground">Version 1.0 • {doc.latest_version?.uploaded_at ? new Date(doc.latest_version.uploaded_at).toLocaleDateString() : 'Shared with you'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        className="rounded-xl border-white/10 hover:bg-white/5 flex-1 md:flex-none"
                                                        onClick={() => doc.latest_version?.file && window.open(doc.latest_version.file, '_blank')}
                                                    >
                                                        <Download className="h-4 w-4 mr-2" /> Download
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-40">
                                        <FolderOpen className="h-16 w-16 stroke-[1]" />
                                        <p className="text-sm font-bold">No public documents shared for this case yet.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.02]">
                            <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                                <Search className="h-8 w-8 text-primary/40" />
                            </div>
                            <h3 className="text-lg font-bold text-white">Select a Case Record</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-[250px] mt-2">
                                Choose a case from the list on the left to browse its official document repository.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
