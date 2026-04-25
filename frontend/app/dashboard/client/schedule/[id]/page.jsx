"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHearingById, fetchCitizenCaseDocuments } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Scale, 
  User, 
  AlertCircle,
  Download,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";

export default function HearingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: hearing, isLoading: loadingHearing, error: hearingError } = useQuery({
    queryKey: ["hearing", id],
    queryFn: () => fetchHearingById(id),
  });

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ["case-documents", hearing?.case],
    queryFn: () => fetchCitizenCaseDocuments(hearing.case),
    enabled: !!hearing?.case,
  });

  if (loadingHearing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (hearingError || !hearing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Hearing Not Found</h2>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const caseDetails = hearing.case_details || {};
  const isCancelled = hearing.status === "CANCELLED";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full hover:bg-muted"
          onClick={() => router.push("/dashboard/client/schedule")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">{hearing.title || "Hearing Details"}</h1>
          <p className="text-muted-foreground font-medium">Case: {caseDetails.file_number} — {caseDetails.title}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="overflow-hidden border-none shadow-2xl bg-white">
            <div className={cn(
              "h-2 w-full",
              isCancelled ? "bg-destructive" : "bg-primary"
            )} />
            <CardHeader className="p-8">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <Badge className={cn("mb-2 uppercase tracking-widest px-3 py-1 font-black text-[10px]", statusColors[hearing.status])}>
                    {hearing.status}
                  </Badge>
                  <CardTitle className="text-2xl font-black">{hearing.hearing_type}</CardTitle>
                  <CardDescription className="text-base font-semibold">Scheduled sequence #{hearing.hearing_number}</CardDescription>
                </div>
                <div className="bg-primary/10 p-4 rounded-2xl text-primary text-center min-w-[80px]">
                  <span className="block text-xs font-black uppercase tracking-widest">{format(new Date(hearing.scheduled_date), "MMM")}</span>
                  <span className="block text-3xl font-black">{format(new Date(hearing.scheduled_date), "dd")}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8">
              <div className="grid sm:grid-cols-2 gap-8 p-6 rounded-3xl bg-muted/30 border border-border/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center shadow-sm">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Time</p>
                    <p className="font-bold text-slate-900">{format(new Date(hearing.scheduled_date), "h:mm a")} ({hearing.duration_minutes} mins)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center shadow-sm">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location</p>
                    <p className="font-bold text-slate-900">{hearing.location}</p>
                  </div>
                </div>
              </div>

              {hearing.agenda && (
                <div className="space-y-3">
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" /> Agenda
                  </h3>
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 leading-relaxed text-slate-800 font-medium whitespace-pre-wrap">
                    {hearing.agenda || "No agenda provided for this hearing."}
                  </div>
                </div>
              )}

              {isCancelled && hearing.cancellation_reason && (
                <div className="p-6 rounded-3xl bg-destructive/5 border border-destructive/20 space-y-2">
                  <h3 className="text-destructive font-black flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Cancellation Reason
                  </h3>
                  <p className="font-semibold text-destructive/80 leading-relaxed italic">
                    "{hearing.cancellation_reason}"
                  </p>
                </div>
              )}
              
              {hearing.summary && (
                <div className="space-y-3">
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-500" /> Hearing Summary
                  </h3>
                  <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 leading-relaxed font-medium">
                    {hearing.summary}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          {/* Parties Card */}
          <Card className="border-none shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600/70">Plaintiff</p>
                <p className="font-black text-slate-900 text-xl">{caseDetails.plaintiff || "N/A"}</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/50 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600/70">Defendant</p>
                <p className="font-black text-slate-900 text-xl">{caseDetails.defendant || "N/A"}</p>
              </div>
              <div className="pt-4 border-t border-border">
                <Link href={`/dashboard/client/cases`} className="text-xs font-black text-primary hover:underline flex items-center gap-2">
                  View Case Files <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Related Documents */}
          <Card className="border-none shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingDocs ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}
                </div>
              ) : documents?.length > 0 ? (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border group hover:bg-muted/30 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate">{doc.document_type_display || doc.document_type}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">
                          {doc.latest_version?.uploaded_at 
                            ? format(new Date(doc.latest_version.uploaded_at), "MMM d, yyyy") 
                            : "No Date"}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg group-hover:bg-primary/20">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm font-bold">
                  No documents found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
