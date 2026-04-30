"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDefendantCases, fetchDefendantDocuments, downloadDocument } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, FileText, Download, Loader2, Search, Filter, ArrowRight, ExternalLink, Scale, Gavel, ClipboardList } from "lucide-react";
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

  const groupedDocuments = (documents || []).reduce((acc, doc) => {
    const type = doc.document_type || "OTHER";
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  const documentSections = [
    { type: "PETITION", label: "Formal Filings", icon: <FileText className="h-5 w-5" /> },
    { type: "ORDER", label: "Court Orders", icon: <Scale className="h-5 w-5" /> },
    { type: "JUDGMENT", label: "Judgments & Decisions", icon: <Gavel className="h-5 w-5" /> },
    { type: "EVIDENCE", label: "Evidence & Exhibits", icon: <FolderOpen className="h-5 w-5" /> },
    { type: "AFFIDAVIT", label: "Affidavits", icon: <ClipboardList className="h-5 w-5" /> },
    { type: "OTHER", label: "Other Documents", icon: <FileText className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-[#1A202C] mb-2">Legal Documents</h1>
          <p className="text-[#4A5568] font-semibold opacity-100">Access all official court orders, filings, and judgments.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Case Selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568]" />
            <Input 
              placeholder="Find Case..." 
              className="pl-10 bg-white border-border rounded-xl focus-visible:ring-primary/40 font-bold text-[#1A202C]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {loadingCases ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse" />
              ))
            ) : filteredCases?.length > 0 ? (
              filteredCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl border transition-all duration-300 group",
                    selectedCaseId === c.id 
                      ? "bg-primary/10 border-primary shadow-lg shadow-primary/5" 
                      : "bg-white border-border hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary bg-primary/5">
                      {c.file_number}
                    </Badge>
                    <ArrowRight className={cn("h-4 w-4 text-primary transition-transform", selectedCaseId === c.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
                  </div>
                  <p className="font-bold text-sm text-[#1A202C] leading-tight mb-1">{c.title}</p>
                  <p className="text-[10px] text-[#4A5568] font-black uppercase tracking-wider">{c.status}</p>
                </button>
              ))
            ) : (
              <div className="text-center py-10 bg-muted/20 rounded-2xl border border-dashed">
                <p className="text-xs font-bold text-[#4A5568]">No cases found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Document List */}
        <div className="lg:col-span-2">
          {selectedCaseId ? (
            <Card className="bg-white shadow-xl border-border rounded-[2rem] overflow-hidden min-h-[600px]">
              <CardHeader className="p-8 border-b border-border bg-muted/30">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Scale className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Official Repository</span>
                    </div>
                    <CardTitle className="text-2xl font-bold text-[#1A202C]">{selectedCase?.title}</CardTitle>
                    <CardDescription className="text-[#4A5568] font-bold opacity-100">Browse all legal filings and court records for this case.</CardDescription>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="h-7 w-7 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {loadingDocs ? (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#4A5568]">Decrypting Case Files...</p>
                  </div>
                ) : documents?.length > 0 ? (
                  <div className="space-y-10">
                    {documentSections.map((section) => {
                      const docs = groupedDocuments[section.type] || [];
                      if (docs.length === 0) return null;

                      return (
                        <div key={section.type} className="space-y-4">
                          <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                              {section.icon}
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-[#2D3748]">{section.label}</h3>
                            <Badge variant="secondary" className="ml-auto bg-muted text-[#4A5568] font-bold">
                              {docs.length}
                            </Badge>
                          </div>
                          <div className="grid gap-4">
                            {docs.map((doc, idx) => (
                              <div key={idx} className="group p-5 rounded-2xl border border-border bg-white hover:border-primary/40 hover:shadow-md transition-all duration-300">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center text-[#4A5568] group-hover:text-primary transition-colors">
                                      <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-[#1A202C] group-hover:text-primary transition-colors leading-tight">
                                        {doc.description || "Official Filing"}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-[#4A5568]">
                                          Uploaded by {doc.uploaded_by_role === 'JUDGE' ? 'Honorable Justice' : doc.uploaded_by_name}
                                        </span>
                                        <span className="h-1 w-1 rounded-full bg-border" />
                                        <span className="text-[10px] font-bold text-[#4A5568]">
                                          {doc.latest_version?.uploaded_at ? new Date(doc.latest_version.uploaded_at).toLocaleDateString() : 'Active'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 w-full md:w-auto">
                                    {doc.latest_version?.file_url ? (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="rounded-xl hover:bg-primary/10 hover:text-primary text-xs font-bold px-4"
                                          onClick={() => window.open(doc.latest_version.file_url, '_blank')}
                                        >
                                          <ExternalLink className="h-3.5 w-3.5 mr-2" /> View
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="rounded-xl hover:bg-primary/10 hover:text-primary text-xs font-bold px-4"
                                          onClick={() => downloadDocument(doc.latest_version.file_url, doc.description || "legal_document")}
                                        >
                                          <Download className="h-3.5 w-3.5 mr-2" /> Download
                                        </Button>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-[#4A5568] font-bold italic py-2">Restricted Access</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <div className="h-24 w-24 rounded-full bg-muted/30 flex items-center justify-center border-4 border-white shadow-inner">
                      <FolderOpen className="h-10 w-10 text-muted-foreground opacity-40" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#1A202C]">No Accessible Documents</p>
                      <p className="text-xs text-[#4A5568] mt-1 max-w-[200px]">There are no public documents shared for this case at this time.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[600px] flex flex-col items-center justify-center border-4 border-dashed border-border rounded-[3rem] bg-white/50 backdrop-blur-sm shadow-inner">
              <div className="h-24 w-24 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 transform rotate-3">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-[#1A202C]">Select a Case File</h3>
              <p className="text-sm text-[#4A5568] text-center max-w-[280px] mt-2 font-medium">
                Choose a case from the registry to access its official document repository and secure files.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

