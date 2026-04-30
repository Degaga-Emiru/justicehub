"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHearingById, fetchDefendantDocuments } from "@/lib/api";
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
  ExternalLink,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/mock-data";
import Link from "next/link";

export default function DefendantHearingDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: hearing, isLoading: loadingHearing, error: hearingError } = useQuery({
    queryKey: ["hearing", id],
    queryFn: () => fetchHearingById(id),
  });

  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ["defendant-documents", hearing?.case],
    queryFn: () => fetchDefendantDocuments(hearing.case),
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
        <h2 className="text-xl font-bold text-[#1A202C]">Hearing Not Found</h2>
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
          className="rounded-full hover:bg-slate-100"
          onClick={() => router.push("/dashboard/defendant/schedule")}
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A202C]">{hearing.title || "Hearing Details"}</h1>
          <p className="text-[#4A5568] font-bold opacity-100">Case: {caseDetails.file_number} — {caseDetails.title}</p>
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
                  <CardTitle className="text-2xl font-bold text-[#1A202C]">{hearing.hearing_type}</CardTitle>
                  <CardDescription className="text-base font-bold text-[#4A5568] opacity-100">Scheduled sequence #{hearing.hearing_number}</CardDescription>
                </div>
                <div className="bg-primary/10 p-4 rounded-2xl text-primary text-center min-w-[80px]">
                  <span className="block text-xs font-black uppercase tracking-widest">{format(new Date(hearing.scheduled_date), "MMM")}</span>
                  <span className="block text-3xl font-black">{format(new Date(hearing.scheduled_date), "dd")}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8">
              <div className="grid sm:grid-cols-2 gap-8 p-6 rounded-3xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D3748] opacity-100">Time</p>
                    <p className="font-bold text-[#1A202C] text-lg">{format(new Date(hearing.scheduled_date), "h:mm a")} ({hearing.duration_minutes} mins)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#2D3748] opacity-100">Location</p>
                    <p className="font-bold text-[#1A202C] text-lg">{hearing.location}</p>
                  </div>
                </div>
              </div>

              {hearing.agenda && (
                <div className="space-y-3">
                  <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 text-[#1A202C]">
                    <FileText className="h-5 w-5 text-primary" /> Agenda
                  </h3>
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 leading-relaxed text-[#4A5568] font-bold whitespace-pre-wrap opacity-100">
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
                  <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 text-emerald-700">
                    <CheckCircle className="h-5 w-5" /> Hearing Summary
                  </h3>
                  <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 leading-relaxed font-bold text-[#4A5568] opacity-100">
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
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
                <User className="h-5 w-5 text-primary" /> Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 opacity-100">Plaintiff</p>
                <p className="font-bold text-[#1A202C] text-xl">{caseDetails.plaintiff || "N/A"}</p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#C53030] opacity-100">Defendant</p>
                <p className="font-bold text-[#1A202C] text-xl">{caseDetails.defendant || "N/A"}</p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <Link href={`/dashboard/defendant/cases`} className="text-xs font-black text-primary hover:underline flex items-center gap-2">
                  View Case Files <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Related Documents */}
          <Card className="border-none shadow-xl bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900">
                <FileText className="h-5 w-5 text-primary" /> Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingDocs ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
              ) : documents?.length > 0 ? (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 group hover:bg-slate-100 transition-all">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate text-[#1A202C]">{doc.document_type_display || doc.document_type}</p>
                        <p className="text-[10px] font-bold text-[#4A5568] uppercase opacity-100">
                          {doc.latest_version?.uploaded_at 
                            ? format(new Date(doc.latest_version.uploaded_at), "MMM d, yyyy") 
                            : "No Date"}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg group-hover:bg-primary/20 text-slate-400 hover:text-primary">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm font-bold">
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
