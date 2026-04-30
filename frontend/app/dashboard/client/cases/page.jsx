"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCases } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { statusColors } from "@/lib/mock-data";
import { CreditCard, CheckCircle, AlertTriangle, XCircle, FileText, Scale, Clock, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABELS = {
 PENDING_REVIEW: "Pending Review",
 APPROVED: "Awaiting Payment",
 REJECTED: "Rejected",
 PAID: "Paid",
 ASSIGNED: "Assigned",
 IN_PROGRESS: "In Progress",
 DECIDED: "Decided",
 CLOSED: "Closed",
};

const STATUS_STYLES = {
 PENDING_REVIEW: "bg-amber-500/10 text-amber-600",
 APPROVED: "bg-blue-500/10 text-blue-600",
 REJECTED: "bg-rose-500/10 text-rose-600",
 PAID: "bg-teal-500/10 text-teal-600",
 ASSIGNED: "bg-indigo-500/10 text-indigo-600",
 IN_PROGRESS: "bg-purple-500/10 text-purple-600",
 DECIDED: "bg-rose-500/10 text-rose-600",
 CLOSED: "bg-slate-500/10 text-muted-foreground",
};

export default function ClientCasesPage() {
 const { user } = useAuthStore();
 const router = useRouter();
 const { t } = useLanguage();

 const [statusFilter, setStatusFilter] = useState("ACTIVE");

 const { data: cases, isLoading: isLoadingCases } = useQuery({
 queryKey: ["client-cases", user?.id],
 queryFn: () => fetchCases(),
 enabled: !!user,
 });

 const allCases = cases || [];

 // Filter logic
 const filteredCases = allCases.filter(c => {
    if (statusFilter === "ACTIVE") {
      return !["CLOSED", "DECIDED"].includes(c.status);
    }
    if (statusFilter === "ALL") return true;
    return c.status === statusFilter;
  });

 const needsAction = allCases.filter(c => ["APPROVED", "REJECTED"].includes(c.status));
 const activeCases = allCases.filter(c => ["PAID", "ASSIGNED", "IN_PROGRESS"].includes(c.status));

 return (
 <div className="space-y-10 animate-fade-up">
 {/* Header */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-[#1A202C]">
 {t("myCasesTitle")}
 </h1>
 <p className="text-[#4A5568] font-bold text-lg leading-relaxed flex items-center gap-2 opacity-100">
 <Scale className="h-5 w-5 text-primary/80" />
 {t("myCasesSubtitle")}
 </p>
 </div>
 <Button 
 onClick={() => router.push('/dashboard/client/register-case')}
 className="rounded-2xl font-black bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 text-white shadow-xl shadow-primary/20 px-8 h-14"
 >
 Register New Case
 </Button>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="all" className="w-full space-y-8">
 <TabsList className="h-14 p-1.5 bg-muted/30 border border-border rounded-2xl bg-background shadow-sm border-border backdrop-blur-xl w-full lg:max-w-xl mx-auto flex">
 <TabsTrigger value="all" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 {t("allCases") || "All Cases"}
 </TabsTrigger>
 <TabsTrigger value="action" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 relative gap-2">
 {t("needsAction") || "Needs Action"}
 {needsAction.length > 0 && (
 <Badge className="bg-rose-500/20 text-rose-600 border-none text-[10px] font-black h-5 px-1.5">{needsAction.length}</Badge>
 )}
 </TabsTrigger>
 <TabsTrigger value="active" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 {t("active") || "Active"}
 </TabsTrigger>
 </TabsList>

  <div className="flex justify-end mb-4">
    <div className="w-full md:w-64">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-12 bg-background border-border rounded-xl shadow-sm">
          <SelectValue placeholder="Filter by Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">All Active Cases</SelectItem>
          <SelectItem value="ALL">Show All History</SelectItem>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>

 <TabsContent value="all" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <CardTitle className="text-2xl font-black font-display tracking-tight text-[#1A202C]">{t("cardFilingsTitle")}</CardTitle>
 <CardDescription className="text-[#4A5568] font-bold opacity-100">{t("cardFilingsDesc")}</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {isLoadingCases ? (
 <div className="p-8 space-y-4">
 {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <CaseTable data={filteredCases} router={router} t={t} emptyMessage={t("emptyFilings")} />
 )}
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="action" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-amber-500/20 shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
 <AlertTriangle className="h-5 w-5" />
 </div>
 <div>
 <CardTitle className="text-2xl font-black font-display tracking-tight text-[#1A202C]">Attention Required</CardTitle>
 <CardDescription className="text-[#4A5568] font-bold opacity-100">Cases awaiting payment or revised documents.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {isLoadingCases ? (
 <div className="p-8 space-y-4">
 {[1, 2].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <CaseTable data={needsAction} router={router} t={t} emptyMessage="Everything is up to date." />
 )}
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-emerald-500/20 shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
 <CheckCircle className="h-5 w-5" />
 </div>
 <div>
 <CardTitle className="text-2xl font-black font-display tracking-tight text-[#1A202C]">Active Litigation</CardTitle>
 <CardDescription className="text-[#4A5568] font-bold opacity-100">Cases currently being processed or heard.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {isLoadingCases ? (
 <div className="p-8 space-y-4">
 {[1, 2].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <CaseTable data={activeCases} router={router} t={t} emptyMessage="No active litigation at this time." />
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>
 </div>
 );
}

function CaseTable({ data, router, emptyMessage = "No cases found.", t }) {
 if (!data || data.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center py-24 space-y-4">
 <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 border border-border shadow-inner">
 <FileText className="h-10 w-10 text-muted-foreground/20" />
 </div>
 <p className="text-lg font-bold text-muted-foreground">{emptyMessage}</p>
 </div>
 );
 }

 return (
 <div className="overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/30">
 <TableRow className="border-border hover:bg-transparent">
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] pl-8 opacity-100">File #</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">{t("tblTitle")}</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Category</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">Registered</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] opacity-100">{t("tblStatus")}</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-[#2D3748] text-right pr-8 opacity-100">{t("tblActions")}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {data.map((item) => (
 <TableRow 
 key={item.id} 
 onClick={() => router.push(`/dashboard/client/cases/${item.id}`)}
 className={cn(
 "border-border hover:bg-muted/30 transition-all duration-300 group cursor-pointer",
 item.status === "REJECTED" && "bg-rose-500/5 hover:bg-rose-500/10"
 )}
 >
 <TableCell className="font-mono text-xs font-black text-[#4A5568] pl-8 opacity-100">
 {item.file_number || "PENDING"}
 </TableCell>
 <TableCell className="py-6">
 <div className="flex flex-col gap-1">
 <span className="font-black font-display text-sm tracking-tight group-hover:text-primary transition-colors">{item.title}</span>
 {item.status === "REJECTED" && item.rejection_reason && (
 <div className="flex items-start gap-1.5 text-[11px] text-rose-500 font-bold">
 <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
 <span className="italic">{item.rejection_reason}</span>
 </div>
 )}
 </div>
 </TableCell>
 <TableCell className="text-[10px] font-black uppercase tracking-widest text-[#2D3748] opacity-100">
  {item.parent_category_name ? `${item.parent_category_name} - ${item.category_name}` : (item.category_name || "General")}
 </TableCell>
 <TableCell className="text-xs font-black text-[#4A5568] opacity-100">
 {new Date(item.created_at || item.filing_date).toLocaleDateString()}
 </TableCell>
 <TableCell>
 <Badge className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border-none shadow-sm", STATUS_STYLES[item.status] || "bg-muted/50 text-muted-foreground")}>
 {STATUS_LABELS[item.status] || item.status}
 </Badge>
 </TableCell>
 <TableCell className="text-right pr-8">
 <div className="flex justify-end gap-2">
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 {item.status === "APPROVED" && (
 <Button 
 size="sm" 
 className="h-8 rounded-lg font-black text-[10px] uppercase tracking-widest bg-gradient-to-r from-blue-600 to-primary text-white hover:from-blue-500 hover:to-primary"
 onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/client/cases/${item.id}`); }}
 >
 <CreditCard className="h-3 w-3 mr-1.5" /> Pay Fee
 </Button>
 )}
 <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-muted/50 group-hover:text-primary transition-colors">
 Details <ArrowRight className="ml-1.5 h-3 w-3" />
 </Button>
 </div>
 </div>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 );
}
