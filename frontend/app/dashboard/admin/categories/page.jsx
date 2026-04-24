"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchCategories, createCategory, fetchAvailableJudges } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Layers, Search, Loader2, Plus, Eye, ArrowLeft, Gavel, Mail, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AdminCategoriesPage() {
 const [searchTerm, setSearchTerm] = useState("");
 const [isCreateOpen, setIsCreateOpen] = useState(false);
 const [selectedCategory, setSelectedCategory] = useState(null);
 const queryClient = useQueryClient();

 // Fetch Categories
 const { data: categories, isLoading } = useQuery({
 queryKey: ["admin-categories"],
 queryFn: () => fetchCategories(),
 });

 // Create Category Mutation
 const createCategoryMutation = useMutation({
 mutationFn: createCategory,
 onSuccess: () => {
 toast.success("Case category created successfully");
 queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
 setIsCreateOpen(false);
 },
 onError: (error) => {
 toast.error(error.message || "Failed to create category");
 }
 });

 const filteredCategories = (categories || []).filter(c => 
 (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
 (c.code || "").toLowerCase().includes(searchTerm.toLowerCase())
 );

 const handleCreateCategory = (e) => {
 e.preventDefault();
 const formData = new FormData(e.target);
 createCategoryMutation.mutate({
 name: formData.get("name"),
 code: formData.get("code"),
 description: formData.get("description"),
 fee: parseFloat(formData.get("fee")) || 0,
 is_active: formData.get("is_active") === "on"
 });
 };

 if (selectedCategory) {
 return (
 <CategoryJudgesPanel 
 category={selectedCategory} 
 onClose={() => setSelectedCategory(null)} 
 />
 );
 }

 return (
 <div className="space-y-8 animate-fade-up">
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Case Categories</h1>
 <p className="text-slate-300 font-medium text-lg leading-relaxed flex items-center gap-2">
 <Layers className="h-5 w-5 text-primary" />
 Manage case classifications and view assigned judges.
 </p>
 </div>
 <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
 <DialogTrigger asChild>
 <Button className="h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 text-white">
 <Plus className="mr-2 h-4 w-4" />
 Create Category
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-[425px]">
 <DialogHeader>
 <DialogTitle className="text-xl font-black font-display">Create New Category</DialogTitle>
 </DialogHeader>
 <form onSubmit={handleCreateCategory} className="space-y-4 mt-4">
 <div className="space-y-2">
 <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-300">Category Name</Label>
 <Input id="name" name="name" required placeholder="e.g., Civil Law" className="h-12 bg-background/50 border-white/20 rounded-xl" />
 </div>
 <div className="space-y-2">
 <Label htmlFor="code" className="text-xs font-black uppercase tracking-widest text-slate-300">Category Code</Label>
 <Input id="code" name="code" required placeholder="e.g., CVL" className="h-12 bg-background/50 border-white/20 rounded-xl" />
 </div>
 <div className="space-y-2">
 <Label htmlFor="fee" className="text-xs font-black uppercase tracking-widest text-slate-300">Filing Fee (ETB)</Label>
 <Input id="fee" name="fee" type="number" step="0.01" defaultValue="0" className="h-12 bg-background/50 border-white/20 rounded-xl" />
 </div>
 <div className="space-y-2">
 <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-slate-300">Description</Label>
 <Textarea id="description" name="description" placeholder="Brief description..." className="bg-background/50 border-white/20 rounded-xl" />
 </div>
 <div className="flex items-center gap-2">
 <input type="checkbox" id="is_active" name="is_active" defaultChecked className="rounded border-gray-300" />
 <Label htmlFor="is_active">Active</Label>
 </div>
 <Button type="submit" className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 text-white" disabled={createCategoryMutation.isPending}>
 {createCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
 Create Category
 </Button>
 </form>
 </DialogContent>
 </Dialog>
 </div>

 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1 max-w-sm group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
 <Input
 placeholder="Search categories..."
 className="pl-11 h-12 bg-muted/30 border-white/5 rounded-2xl glass focus-visible:ring-primary/50 font-medium"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 </div>

 <div className="rounded-2xl border border-white/5 bg-card/30 glass overflow-hidden shadow-2xl">
 <Table>
 <TableHeader className="bg-white/5">
 <TableRow className="border-white/5 hover:bg-transparent">
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300 pl-8">Code</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300">Name</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300">Description</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300">Fee</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300">Status</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-slate-300 text-right pr-8">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center justify-center gap-4">
 <Loader2 className="h-8 w-8 animate-spin text-primary" />
 <p className="text-sm font-black uppercase tracking-widest text-slate-300">Loading categories...</p>
 </div>
 </TableCell>
 </TableRow>
 ) : filteredCategories.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center justify-center space-y-4">
 <div className="h-20 w-20 rounded-[2rem] bg-muted/10 flex items-center justify-center -rotate-6 border border-white/5 shadow-inner">
 <Layers className="h-10 w-10 text-slate-300/20" />
 </div>
 <p className="text-xl font-black font-display text-foreground">No Categories</p>
 <p className="text-sm font-medium text-slate-300">Create your first case category to get started.</p>
 </div>
 </TableCell>
 </TableRow>
 ) : (
 filteredCategories.map((category) => (
 <TableRow key={category.id} className="border-white/5 hover:bg-white/5 transition-colors group">
 <TableCell className="pl-8">
 <Badge variant="outline" className="font-mono bg-primary/5 text-primary border-primary/20 px-2.5 py-0.5 text-[10px] font-black">{category.code}</Badge>
 </TableCell>
 <TableCell className="font-bold text-sm font-display group-hover:text-primary transition-colors">{category.name}</TableCell>
 <TableCell className="text-sm text-slate-300 max-w-[250px] truncate">
 {category.description || "—"}
 </TableCell>
 <TableCell className="text-sm font-bold font-mono">
 {category.fee ? `${parseFloat(category.fee).toLocaleString()} ETB` : "Free"}
 </TableCell>
 <TableCell>
 <Badge variant="outline" className={category.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase" : "bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px] font-black uppercase"}>
 {category.is_active ? "Active" : "Inactive"}
 </Badge>
 </TableCell>
 <TableCell className="text-right pr-8">
 <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs border-white/10 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all gap-2" onClick={() => setSelectedCategory(category)}>
 <Eye className="h-3.5 w-3.5" />
 View Judges
 </Button>
 </TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>

 <p className="text-xs text-slate-300 font-medium">
 Showing {filteredCategories.length} categor{filteredCategories.length !== 1 ? "ies" : "y"}.
 </p>
 </div>
 );
}

function CategoryJudgesPanel({ category, onClose }) {
 const router = useRouter();
 const { data: judges, isLoading: isJudgesLoading } = useQuery({
 queryKey: ["category-judges", category?.id],
 queryFn: () => fetchAvailableJudges(category.id),
 enabled: !!category,
 });

 return (
 <div className="space-y-8 animate-fade-up">
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <Button 
 variant="ghost" 
 size="sm" 
 onClick={onClose} 
 className="mb-2 -ml-2 text-slate-300 hover:text-primary transition-colors flex items-center gap-2 font-bold"
 >
 <ArrowLeft className="h-4 w-4" />
 Back to Categories
 </Button>
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground flex items-center gap-3">
 <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
 <Briefcase className="h-6 w-6" />
 </div>
 {category?.name}
 </h1>
 <p className="text-slate-300 font-medium text-lg leading-relaxed flex items-center gap-2 mt-2">
 Category Code: <span className="font-mono text-primary font-bold">{category?.code}</span>
 {category?.fee ? <span className="ml-3">• Fee: <span className="font-bold text-foreground">{parseFloat(category.fee).toLocaleString()} ETB</span></span> : null}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button 
 variant="outline" 
 onClick={() => router.push('/dashboard/admin/judges')}
 className="h-12 px-6 rounded-xl font-bold bg-muted/50 border border-white/5 hover:bg-muted transition-all duration-300 text-foreground"
 >
 Manage All Judges
 </Button>
 </div>
 </div>

 <div className="rounded-2xl border border-white/5 bg-card/30 glass overflow-hidden shadow-2xl p-8">
 <div className="flex justify-between items-center mb-6">
 <h3 className="font-black font-display tracking-tight text-xl flex items-center gap-2">
 <Gavel className="h-6 w-6 text-primary" />
 Assigned Judges
 </h3>
 <Badge variant="outline" className="font-mono text-sm bg-muted/30 border-white/10 px-3 py-1">
 {judges?.length || 0} Total
 </Badge>
 </div>

 {isJudgesLoading ? (
 <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl bg-muted/10">
 <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
 <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">Loading judges...</p>
 </div>
 ) : judges?.length === 0 ? (
 <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-2xl bg-muted/10 text-center">
 <div className="h-16 w-16 rounded-[1.5rem] bg-muted/20 flex items-center justify-center mb-4 border border-white/5">
 <Gavel className="h-8 w-8 text-slate-300/30" />
 </div>
 <p className="text-base font-black font-display text-foreground">No Judges Assigned</p>
 <p className="text-sm font-medium text-slate-300 mt-1 mb-4">
 No judges are currently specialized in this category.
 </p>
 <Button 
 onClick={() => router.push('/dashboard/admin/judges')}
 className="rounded-xl font-bold bg-primary text-white"
 >
 Configure Judge Profiles
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {judges?.map((judge) => {
 const currentCases = judge.active_cases_count ?? judge.caseload ?? 0;
 const maxCases = judge.max_active_cases ?? judge.max_cases ?? 10;
 const isAtCapacity = currentCases >= maxCases;

 return (
 <div key={judge.id} className="p-6 border border-white/5 rounded-3xl bg-white/5 hover:border-primary/20 hover:bg-white/10 transition-all flex flex-col gap-6 group shadow-lg">
 <div className="flex items-start justify-between gap-4">
 <div className="flex items-start gap-5 min-w-0">
 <div className="h-16 w-16 rounded-[1.25rem] bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner border border-primary/10">
 <span className="font-black text-primary text-2xl">
 {judge.user_details?.first_name?.charAt(0) || "J"}
 </span>
 </div>
 <div className="min-w-0 space-y-1">
 <h4 className="font-black font-display text-xl leading-tight group-hover:text-primary transition-colors truncate text-foreground">
 Judge {judge.user_details?.first_name} {judge.user_details?.last_name}
 </h4>
 <div className="flex items-center gap-2 text-slate-400">
 <Mail className="h-3.5 w-3.5 shrink-0" />
 <p className="text-sm font-medium truncate">{judge.user_details?.email}</p>
 </div>
 </div>
 </div>
 </div>
 
 <div className="flex items-center justify-between pt-5 border-t border-white/5">
 <div className="space-y-1.5">
 <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Workload</p>
 <div className="flex items-baseline gap-1">
 <span className="text-xl font-black font-mono text-foreground">{currentCases}</span>
 <span className="text-sm text-slate-500 font-bold">/</span>
 <span className="text-sm text-slate-400 font-mono font-bold">{maxCases} Cases</span>
 </div>
 </div>
 <Badge variant="outline" className={`px-3 py-1 font-bold text-xs uppercase tracking-wider ${isAtCapacity ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}>
 {isAtCapacity ? "At Capacity" : "Available"}
 </Badge>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}
