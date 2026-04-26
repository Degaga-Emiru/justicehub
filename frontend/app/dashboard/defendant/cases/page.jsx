"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDefendantCases, acknowledgeDefendantDecision } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { statusColors } from "@/lib/mock-data";
import { Shield, CheckCircle, AlertTriangle, FileText, MessageSquare, ArrowRight, Clock, Scale } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABELS = {
 PENDING_REVIEW: "Investigation",
 APPROVED: "Awaiting Plaintiff Fee",
 REJECTED: "Dismissed",
 PAID: "Active",
 ASSIGNED: "Assigned",
 IN_PROGRESS: "In Progress",
 DECIDED: "Judgment Rendered",
 CLOSED: "Archived",
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

export default function DefendantCasesPage() {
 const { user } = useAuthStore();
 const router = useRouter();
 const queryClient = useQueryClient();
 
 // Defendant-specific modal state
 const [acknowledgingCase, setAcknowledgingCase] = useState(null);
 const [statusFilter, setStatusFilter] = useState("ACTIVE");

 const { data: cases, isLoading: isLoadingCases } = useQuery({
 queryKey: ["defendant-cases", user?.id],
 queryFn: () => fetchDefendantCases(),
 enabled: !!user,
 });

 const acknowledgeMutation = useMutation({
 mutationFn: ({ caseId }) => acknowledgeDefendantDecision(caseId, { acknowledged: true }),
 onSuccess: () => {
 queryClient.invalidateQueries(["defendant-cases"]);
 setAcknowledgingCase(null);
 }
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

 const needsAction = allCases.filter(c => 
 (c.status === "DECIDED" && !c.is_defendant_acknowledged) ||
 (c.status === "ASSIGNED" && !c.defendant_response)
 );
 const activeCases = allCases.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status));

 return (
 <div className="space-y-10 animate-fade-up">
 {/* Header */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Legal Standings</h1>
 <p className="text-muted-foreground font-semibold text-lg leading-relaxed flex items-center gap-2">
 <Shield className="h-5 w-5 text-primary" />
 Review all claims filed against you and manage your formal defense responses.
 </p>
 </div>
 </div>

 {/* Tabs */}
 <Tabs defaultValue="all" className="w-full space-y-8">
 <TabsList className="h-14 p-1.5 bg-muted/30 border border-border rounded-2xl bg-background shadow-sm border-border backdrop-blur-xl w-full lg:max-w-xl mx-auto flex">
 <TabsTrigger value="all" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 All Claims
 </TabsTrigger>
 <TabsTrigger value="action" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 relative gap-2">
 Attention Required
 {needsAction.length > 0 && (
 <Badge className="bg-rose-500/20 text-rose-600 border-none text-[10px] font-black h-5 px-1.5">{needsAction.length}</Badge>
 )}
 </TabsTrigger>
 <TabsTrigger value="active" className="flex-1 rounded-xl font-bold font-display tracking-tight text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
 Active Litigation
 </TabsTrigger>
 </TabsList>

 <div className="flex justify-end mb-4">
   <div className="w-full md:w-64">
     <Select value={statusFilter} onValueChange={setStatusFilter}>
       <SelectTrigger className="h-12 bg-background border-border rounded-xl shadow-sm">
         <SelectValue placeholder="Filter by Status" />
       </SelectTrigger>
       <SelectContent>
         <SelectItem value="ACTIVE">All Active Claims</SelectItem>
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
 <CardTitle className="text-2xl font-black font-display tracking-tight">Dispute History</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">A complete record of all legal filings where you are named as defendant.</CardDescription>
 </CardHeader>
 <CardContent className="p-0">
 {isLoadingCases ? (
 <div className="p-8 space-y-4">
 {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <CaseTable data={filteredCases} router={router} emptyMessage="No disputes found." onAcknowledge={setAcknowledgingCase} />
 )}
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="action" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-rose-500/20 shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
 <AlertTriangle className="h-5 w-5" />
 </div>
 <div>
 <CardTitle className="text-2xl font-black font-display tracking-tight">Defenses Required</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Cases awaiting your response or decision acknowledgment.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {isLoadingCases ? (
 <div className="p-8 space-y-4">
 {[1, 2].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <CaseTable data={needsAction} router={router} emptyMessage="No pending actions required." onAcknowledge={setAcknowledgingCase} />
 )}
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="active" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <Card className="bg-card shadow-sm border-border border-indigo-500/20 shadow-2xl overflow-hidden">
 <CardHeader className="p-8 border-b border-border">
 <div className="flex items-center gap-3">
 <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
 <Scale className="h-5 w-5" />
 </div>
 <div>
 <CardTitle className="text-2xl font-black font-display tracking-tight">Ongoing Proceedings</CardTitle>
 <CardDescription className="text-muted-foreground font-medium">Cases currently being heard in court.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-0">
 {isLoadingCases ? (
 <div className="p-8 space-y-4">
 {[1, 2].map(i => <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />)}
 </div>
 ) : (
 <CaseTable data={activeCases} router={router} emptyMessage="No active litigation at this time." onAcknowledge={setAcknowledgingCase} />
 )}
 </CardContent>
 </Card>
 </TabsContent>
 </Tabs>

 {/* Acknowledge Decision Dialog */}
 <Dialog open={!!acknowledgingCase} onOpenChange={(open) => !acknowledgeMutation.isPending && !open && setAcknowledgingCase(null)}>
 <DialogContent className="sm:max-w-[480px]">
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2 text-xl font-black font-display">
 <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
 <CheckCircle className="h-5 w-5" />
 </div>
 Confirm Receipt of Decision
 </DialogTitle>
 <DialogDescription className="text-muted-foreground font-medium leading-relaxed">
 You are legally acknowledging that you have received and reviewed the court's judgment for: <span className="font-bold text-white tracking-tight">{acknowledgingCase?.file_number || acknowledgingCase?.title}</span>.
 </DialogDescription>
 </DialogHeader>
 <DialogFooter className="mt-4 gap-2 sm:gap-0">
 <Button variant="outline" className="rounded-xl" onClick={() => setAcknowledgingCase(null)} disabled={acknowledgeMutation.isPending}>Cancel</Button>
 <Button onClick={() => acknowledgeMutation.mutate({ caseId: acknowledgingCase.id })} disabled={acknowledgeMutation.isPending} className="rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20">
 {acknowledgeMutation.isPending ? "Acknowledging..." : "I Acknowledge Decision"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 </div>
 );
}

function CaseTable({ data, router, emptyMessage, onAcknowledge }) {
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
 <TableHead className="py-5 font-black uppercase text-[11px] tracking-[0.2em] text-muted-foreground pl-8">File Number</TableHead>
 <TableHead className="py-5 font-black uppercase text-[11px] tracking-[0.2em] text-muted-foreground">Dispute Title</TableHead>
 <TableHead className="py-5 font-black uppercase text-[11px] tracking-[0.2em] text-muted-foreground">Category</TableHead>
 <TableHead className="py-5 font-black uppercase text-[11px] tracking-[0.2em] text-muted-foreground">Last Update</TableHead>
 <TableHead className="py-5 font-black uppercase text-[11px] tracking-[0.2em] text-muted-foreground">Standing</TableHead>
 <TableHead className="py-5 font-black uppercase text-[11px] tracking-[0.2em] text-muted-foreground text-right pr-8">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {data.map((item) => (
 <TableRow 
 key={item.id} 
 onClick={() => router.push(`/dashboard/defendant/cases/${item.id}`)}
 className="border-border hover:bg-muted/30 transition-all duration-300 group cursor-pointer"
 >
 <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-8">
 {item.file_number || "F-PENDING"}
 </TableCell>
 <TableCell className="py-6">
 <div className="flex flex-col gap-1">
 <span className="font-black font-display text-base tracking-tight text-white group-hover:text-primary transition-colors">{item.title}</span>
 <span className="text-xs text-muted-foreground font-bold flex items-center gap-1.5 mt-1">
 <Clock className="h-3.5 w-3.5 text-primary/90" /> Filed {new Date(item.filing_date || item.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
 </span>
 </div>
 </TableCell>
 <TableCell className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.category?.name || "General"}</TableCell>
 <TableCell className="text-xs font-bold">
 {new Date(item.updated_at || item.created_at).toLocaleDateString()}
 </TableCell>
 <TableCell>
 <Badge className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] border-none shadow-sm", STATUS_STYLES[item.status] || "bg-muted/50 text-muted-foreground")}>
 {STATUS_LABELS[item.status] || item.status}
 </Badge>
 </TableCell>
 <TableCell className="text-right pr-8">
 <div className="flex justify-end gap-2">
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 {item.status === "DECIDED" && !item.is_defendant_acknowledged && (
 <Button 
 size="sm" 
 className="h-8 rounded-lg font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border-none"
 onClick={(e) => { e.stopPropagation(); onAcknowledge?.(item); }}
 >
 Acknowledge
 </Button>
 )}
 {!item.defendant_response && item.status === "ASSIGNED" ? (
 <Button 
 size="sm" 
 className="h-8 rounded-lg font-black text-[10px] uppercase tracking-widest bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all border border-primary/20"
 onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/defendant/cases/${item.id}`); }}
 >
 Respond
 </Button>
 ) : (
 ["PAID", "ASSIGNED", "IN_PROGRESS"].includes(item.status) && (
 <Button 
 size="sm" 
 className="h-8 rounded-lg font-black text-[10px] uppercase tracking-widest bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
 onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/defendant/cases/${item.id}`); }}
 >
 Add Evidence
 </Button>
 )
 )}
 <Button variant="ghost" size="sm" className="h-8 px-3 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-muted/50 group-hover:text-primary transition-colors">
 View Details <ArrowRight className="ml-1.5 h-3 w-3" />
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
