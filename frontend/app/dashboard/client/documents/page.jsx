"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UploadCloud, FileText, Trash2, Plus, Loader2, Download, AlertTriangle, Shield } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCases, fetchCitizenCaseDocuments, uploadCitizenDocument, downloadCitizenDocumentVersion, deleteCitizenDocument, fetchDefendantCases } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function DocumentsPage() {
 const { user } = useAuthStore();
 const queryClient = useQueryClient();
 const isDefendant = user?.role?.toUpperCase() === "DEFENDANT";
 
 const [isUploadOpen, setIsUploadOpen] = useState(false);
 const [selectedCaseId, setSelectedCaseId] = useState("");
 const [deleteConfirmId, setDeleteConfirmId] = useState(null);
 const [uploadForm, setUploadForm] = useState({
 case_id: "",
 document_type: "OTHER",
 file: null,
 });

 // 1. Fetch user's cases for the dropdowns
 const { data: cases, isLoading: isLoadingCases } = useQuery({
 queryKey: [isDefendant ? "defendant-cases" : "client-cases", user?.id],
 queryFn: () => isDefendant ? fetchDefendantCases() : fetchCases(),
 enabled: !!user,
 });

 // We select the first case automatically if none is selected
 const activeCaseId = selectedCaseId || (cases && cases.length > 0 ? cases[0].id : "");

 // 2. Fetch documents for the selected case
 const { data: documents, isLoading: isLoadingDocuments, refetch } = useQuery({
 queryKey: ["client-documents", activeCaseId],
 queryFn: () => fetchCitizenCaseDocuments(activeCaseId),
 enabled: !!activeCaseId,
 });

 // 3. Document Upload Mutation
 const uploadMutation = useMutation({
 mutationFn: (data) => uploadCitizenDocument(data.case_id, data),
 onSuccess: () => {
 toast.success("Document uploaded successfully");
 setIsUploadOpen(false);
 setUploadForm({ case_id: "", document_type: "OTHER", file: null });
 refetch(); // Refresh current documents list
 },
 onError: (err) => toast.error(err.message || "Failed to upload document"),
 });

 // 4. Document Delete Mutation
 const deleteMutation = useMutation({
 mutationFn: (docId) => deleteCitizenDocument(docId),
 onSuccess: () => {
 toast.success("Document deleted successfully");
 setDeleteConfirmId(null);
 refetch();
 },
 onError: (err) => toast.error(err.message || "Failed to delete document"),
 });

 const handleUploadSubmit = (e) => {
 e.preventDefault();
 if (!uploadForm.case_id) return toast.error("Please select a case");
 if (!uploadForm.file) return toast.error("Please select a file");
 
 uploadMutation.mutate(uploadForm);
 };

 const handleFileChange = (e) => {
 if (e.target.files && e.target.files.length > 0) {
 setUploadForm({ ...uploadForm, file: e.target.files[0] });
 }
 };

 const handleDownload = async (versionId, fileName) => {
 try {
 const res = await downloadCitizenDocumentVersion(versionId);
 const blob = await res.blob();
 const url = window.URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = fileName || "document";
 document.body.appendChild(a);
 a.click();
 window.URL.revokeObjectURL(url);
 a.remove();
 toast.success("Download started");
 } catch (err) {
 toast.error(err.message || "Failed to download document");
 }
 };

 // Helper: get the active/latest version from a document
 const getActiveVersion = (doc) => {
 if (!doc.versions || doc.versions.length === 0) return null;
 return doc.versions.find(v => v.is_active) || doc.versions[0];
 };

 const STATUS_STYLES = {
 APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
 PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
 REJECTED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-500">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">{isDefendant ? "Case Documents" : "My Documents"}</h1>
 <p className="text-slate-300">
 {isDefendant 
 ? "View court documents, evidence and filings related to your cases." 
 : "Manage and upload documents for your active cases."}
 </p>
 </div>
 
 {!isDefendant && (
 <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
 <DialogTrigger asChild>
 <Button className="font-bold">
 <Plus className="mr-2 h-4 w-4" /> Upload Document
 </Button>
 </DialogTrigger>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Upload Case Document</DialogTitle>
 <DialogDescription>Attach a new file to an existing legal matter.</DialogDescription>
 </DialogHeader>
 <form onSubmit={handleUploadSubmit} className="space-y-4 py-4">
 <div className="space-y-2">
 <Label>Select Case</Label>
 <Select 
 value={uploadForm.case_id} 
 onValueChange={(val) => setUploadForm({...uploadForm, case_id: val})}
 disabled={isLoadingCases}
 >
 <SelectTrigger>
 <SelectValue placeholder="Select case..." />
 </SelectTrigger>
 <SelectContent>
 {cases?.map((c) => (
 <SelectItem key={c.id} value={c.id}>
 {c.file_number ? `${c.file_number} - ` : ""}{c.title}
 </SelectItem>
 ))}
 {(!cases || cases.length === 0) && (
 <SelectItem value="none" disabled>No cases available</SelectItem>
 )}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>Document Type</Label>
 <Select 
 value={uploadForm.document_type} 
 onValueChange={(val) => setUploadForm({...uploadForm, document_type: val})}
 >
 <SelectTrigger>
 <SelectValue placeholder="Select type..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="EVIDENCE">Evidence</SelectItem>
 <SelectItem value="IDENTIFICATION">Identification</SelectItem>
 <SelectItem value="AFFIDAVIT">Affidavit</SelectItem>
 <SelectItem value="OTHER">Other</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2 group">
 <Label>File</Label>
 <Input type="file" onChange={handleFileChange} />
 </div>
 <DialogFooter>
 <Button type="submit" disabled={uploadMutation.isPending}>
 {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
 {uploadMutation.isPending ? "Uploading..." : "Upload"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 )}
 </div>

 {/* Case Filter Selector */}
 <div className="max-w-xs">
 <Label className="text-xs uppercase tracking-widest font-black text-slate-300 mb-2 block">Viewing Documents For</Label>
 <Select 
 value={activeCaseId} 
 onValueChange={setSelectedCaseId}
 disabled={isLoadingCases || !cases?.length}
 >
 <SelectTrigger className="font-bold border-white/10 bg-muted/30 h-12">
 <SelectValue placeholder={isLoadingCases ? "Loading cases..." : "Select a case..."} />
 </SelectTrigger>
 <SelectContent>
 {cases?.map((c) => (
 <SelectItem key={c.id} value={c.id} className="font-medium">
 {c.file_number ? `${c.file_number} - ` : ""}{c.title}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
 {isLoadingDocuments ? (
 [1, 2, 3].map(i => <Card key={i} className="h-40 bg-muted/20 animate-pulse border-white/5" />)
 ) : documents && documents.length > 0 ? (
 documents.map((doc) => {
 const activeVersion = getActiveVersion(doc);
 const statusKey = activeVersion?.status || "PENDING";
 return (
 <Card key={doc.document_id || doc.id} className="group relative overflow-hidden hover:border-primary/50 transition-all bg-background/50 hover:bg-muted/30">
 <CardHeader className="flex flex-row items-center gap-4 pb-2 p-5">
 <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
 <FileText className="h-5 w-5" />
 </div>
 <div className="overflow-hidden flex-1">
 <CardTitle className="text-sm font-bold truncate" title={doc.document_type_display || doc.document_type}>
 {doc.document_type_display || doc.document_type}
 </CardTitle>
 <CardDescription className="truncate text-xs">{doc.description || "No description"}</CardDescription>
 </div>
 <Badge variant="outline" className={`text-[10px] uppercase tracking-widest shrink-0 ${STATUS_STYLES[statusKey] || ""}`}>
 {statusKey}
 </Badge>
 </CardHeader>
 <CardContent className="px-5 pb-5 pt-0 space-y-3">
 {/* Version info */}
 {activeVersion && (
 <div className="text-xs font-bold text-slate-300 flex justify-between items-center p-2 bg-black/10 rounded-md">
 <span className="truncate" title={activeVersion.file_name}>{activeVersion.file_name || "File"}</span>
 <span>{activeVersion.size_display || ""}</span>
 </div>
 )}

 {/* Action Buttons */}
 <div className="flex gap-2 pt-1">
 {activeVersion && (
 <Button
 size="sm"
 variant="ghost"
 className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs h-9"
 onClick={() => handleDownload(activeVersion.id, activeVersion.file_name)}
 >
 <Download className="mr-1.5 h-3.5 w-3.5" /> Download
 </Button>
 )}
 {!isDefendant && (
 <Button
 size="sm"
 variant="ghost"
 className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-xs h-9 px-3"
 onClick={() => setDeleteConfirmId(doc.document_id || doc.id)}
 >
 <Trash2 className="h-3.5 w-3.5" />
 </Button>
 )}
 </div>
 </CardContent>
 </Card>
 );
 })
 ) : (
 activeCaseId && !isLoadingDocuments ? (
 <div className="col-span-full py-12 text-center text-slate-300 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 bg-muted/10">
 <FileText className="h-8 w-8 opacity-20" />
 <p className="font-bold text-sm">No documents found for this case.</p>
 </div>
 ) : null
 )}

 {/* Upload Placeholder Card - only for citizens */}
 {activeCaseId && !isDefendant && (
 <Card 
 className="border-dashed flex flex-col items-center justify-center p-6 text-slate-300 hover:bg-muted/50 transition-colors cursor-pointer min-h-[140px] hover:border-primary/50 group" 
 onClick={() => {
 setUploadForm({...uploadForm, case_id: activeCaseId});
 setIsUploadOpen(true);
 }}
 >
 <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
 <Plus className="h-5 w-5" />
 </div>
 <p className="font-bold text-sm">Upload New Document</p>
 </Card>
 )}
 </div>

 {/* Delete Confirmation Dialog */}
 <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle className="flex items-center gap-2">
 <AlertTriangle className="h-5 w-5 text-destructive" />
 Delete Document
 </DialogTitle>
 <DialogDescription>
 Are you sure you want to delete this document? This action cannot be undone.
 </DialogDescription>
 </DialogHeader>
 <DialogFooter>
 <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
 <Button 
 variant="destructive" 
 onClick={() => deleteMutation.mutate(deleteConfirmId)}
 disabled={deleteMutation.isPending}
 >
 {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
 Delete
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
