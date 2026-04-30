"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, fetchCategories, adminToggleUserStatus, adminResetPassword, getAdminUsersExportUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserPlus, Trash2, Shield, Search, AlertCircle, Power, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function UserManagementPage() {
 const [searchTerm, setSearchTerm] = useState("");
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;
 const [isCreateOpen, setIsCreateOpen] = useState(false);
 const [newUser, setNewUser] = useState({ first_name: "", last_name: "", email: "", phone_number: "", role: "JUDGE", specialization_ids: [] });
 const [createError, setCreateError] = useState("");
 const [createSuccess, setCreateSuccess] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const { t } = useLanguage();
  const router = useRouter();

  // Role and status filter state
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

 // Change Role state
 const [isRoleOpen, setIsRoleOpen] = useState(false);
 const [roleTarget, setRoleTarget] = useState(null);
 const [selectedRole, setSelectedRole] = useState("");
 const [roleError, setRoleError] = useState("");
 const [roleSubmitting, setRoleSubmitting] = useState(false);

 // Delete User state
 const [isDeleteOpen, setIsDeleteOpen] = useState(false);
 const [deleteTarget, setDeleteTarget] = useState(null);
 const [deleteError, setDeleteError] = useState("");
 const [deleteSubmitting, setDeleteSubmitting] = useState(false);

 const { data: users, isLoading, refetch } = useQuery({
  queryKey: ["users", filterRole, filterStatus, searchTerm],
  queryFn: () => fetchUsers({
  role: filterRole !== "ALL" ? filterRole : "",
  status: filterStatus !== "ALL" ? filterStatus : "",
  search: searchTerm
  }),
 });

 const { data: categories } = useQuery({
  queryKey: ["categories"],
  queryFn: () => fetchCategories(),
 });

 const filteredUsers = users || [];

 const handleCreateUser = async () => {
 setCreateError("");
 setCreateSuccess("");

 const payload = { ...newUser };
 if (payload.role !== "JUDGE") {
 delete payload.specialization_ids;
 } else if (!payload.specialization_ids || payload.specialization_ids.length === 0) {
 setCreateError("Please select at least one specialization category for the Judge.");
 return;
 }

 setIsSubmitting(true);
 try {
 await adminCreateUser(payload);
 setCreateSuccess(`User created. They will receive an email to finish setup.`);
 setNewUser({ first_name: "", last_name: "", email: "", phone_number: "", role: "JUDGE", specialization_ids: [] });
 refetch();
 setTimeout(() => {
 setIsCreateOpen(false);
 setCreateSuccess("");
 }, 3000);
 } catch (err) {
 setCreateError(err.message || "An error occurred creating the user.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleChangeRole = async () => {
 setRoleError("");
 setRoleSubmitting(true);
 try {
 await adminUpdateUser(roleTarget.id, { role: selectedRole });
 setIsRoleOpen(false);
 refetch();
 } catch (err) {
 setRoleError(err.message || "Failed to change role.");
 } finally {
 setRoleSubmitting(false);
 }
 };

 const handleDeleteUser = async () => {
 if (!deleteTarget) return;
 
 // Safety check: Don't allow self-deletion if we could detect it
 // (Assuming we have user info from context, but for now just general safety)
 
 setDeleteError("");
 setDeleteSubmitting(true);
 try {
 await adminDeleteUser(deleteTarget.id);
 toast.success("User successfully deleted");
 setIsDeleteOpen(false);
 refetch();
 } catch (err) {
 console.error("Delete user error:", err);
 const msg = err.message || "";
 if (msg.includes("linked to official court records") || msg.includes("ProtectedError")) {
 setDeleteError("This user cannot be deleted because they are linked to active cases or judgments. Please deactivate their account instead.");
 } else {
 setDeleteError(msg || "Failed to delete user. Please try again.");
 }
 } finally {
 setDeleteSubmitting(false);
 }
 };

 const handleToggleActive = async (user) => {
 try {
 await adminToggleUserStatus(user.id, { 
 action: user.is_active ? 'deactivate' : 'activate',
 reason: 'Administrative action'
 });
 refetch();
 } catch (err) {
 console.error("Toggle active error:", err);
 }
 };

 const handleResetPassword = async (user) => {
 if (!window.confirm(`Force password reset for ${user.email}? They will receive an email with their new password.`)) return;
 try {
 await adminResetPassword(user.id, true);
 toast.success("Password reset successfully. Temp password sent via email.");
 } catch (err) {
 console.error("Reset password error:", err);
 toast.error("Failed to reset password: " + err.message);
 }
 };

 const handleExportCSV = () => {
  const filters = {
  role: filterRole !== "ALL" ? filterRole : "",
  status: filterStatus !== "ALL" ? filterStatus : "",
  search: searchTerm
  };
  const url = getAdminUsersExportUrl(filters);
  
  const token = localStorage.getItem('access_token');
  if (!token) {
  toast.error("Authentication required for export.");
  return;
  }
  
  toast.promise(
  fetch(url, {
   headers: {
   'Authorization': `Bearer ${token}`
   }
  })
  .then(res => {
   if (!res.ok) throw new Error("Export failed");
   return res.blob();
  })
  .then(blob => {
   const downloadUrl = window.URL.createObjectURL(blob);
   const link = document.createElement("a");
   link.href = downloadUrl;
   link.download = `justicehub_users_${new Date().toISOString().split('T')[0]}.csv`;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   window.URL.revokeObjectURL(downloadUrl);
  }),
  {
   loading: 'Preparing export...',
   success: 'Users exported successfully!',
   error: 'Failed to export users.'
  }
  );
 };

 const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
 const startIndex = (currentPage - 1) * itemsPerPage;
 const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

 return (
 <div className="space-y-10 animate-fade-up">
 {/* Header */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
 <div className="space-y-1">
 <h1 className="text-4xl font-black font-display tracking-tight text-foreground">{t("userManagement")}</h1>
 <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
 <Shield className="h-5 w-5 text-primary" />
 {t("manageSystemAccess")}
 </p>
 </div>
 <div className="flex gap-3">
 <Button 
 onClick={handleExportCSV}
 className="h-12 px-6 rounded-xl font-bold bg-muted/50 border border-border hover:bg-muted transition-all duration-300 text-foreground"
 >
 Export CSV
 </Button>
 <Button 
 onClick={() => setIsCreateOpen(true)}
 className="h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 text-white"
 >
 <UserPlus className="mr-2 h-4 w-4" /> {t("addUser")}
 </Button>
 <Button 
 onClick={() => router.push('/dashboard/admin/judges')}
 className="h-12 px-8 rounded-xl font-bold bg-white text-primary border-primary hover:bg-primary/5 shadow-xl transition-all duration-300"
 >
 <Shield className="mr-2 h-4 w-4" /> Manage Judges
 </Button>
 </div>
 </div>

 {/* Controls */}
 <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto items-center">
  <div className="relative w-full md:max-w-xs group">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
  <Input
  placeholder={t("searchUsers")}
  className="pl-11 h-12 bg-muted/30 border-border rounded-2xl bg-background shadow-sm border-border focus-visible:ring-primary/50 focus-visible:border-primary transition-all font-medium"
  value={searchTerm}
  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
  />
  </div>
  
  <Select value={filterRole} onValueChange={(val) => { setFilterRole(val); setCurrentPage(1); }}>
  <SelectTrigger className="h-12 w-full md:w-40 rounded-2xl border-border bg-background shadow-sm font-bold">
   <SelectValue placeholder="All Roles" />
  </SelectTrigger>
  <SelectContent>
   <SelectItem value="ALL">All Roles</SelectItem>
   <SelectItem value="ADMIN">Admins</SelectItem>
   <SelectItem value="JUDGE">Judges</SelectItem>
   <SelectItem value="REGISTRAR">Registrars</SelectItem>
   <SelectItem value="CLERK">Clerks</SelectItem>
   <SelectItem value="LAWYER">Lawyers</SelectItem>
   <SelectItem value="DEFENDANT">Defendants</SelectItem>
   <SelectItem value="CITIZEN">Citizens</SelectItem>
  </SelectContent>
  </Select>

  <Select value={filterStatus} onValueChange={(val) => { setFilterStatus(val); setCurrentPage(1); }}>
  <SelectTrigger className="h-12 w-full md:w-40 rounded-2xl border-border bg-background shadow-sm font-bold">
   <SelectValue placeholder="All Status" />
  </SelectTrigger>
  <SelectContent>
   <SelectItem value="ALL">All Status</SelectItem>
   <SelectItem value="active">Active</SelectItem>
   <SelectItem value="inactive">Inactive</SelectItem>
  </SelectContent>
  </Select>
  </div>
 <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/20 border border-border">
 <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Directory size:</span>
 <span className="text-sm font-black text-foreground">{filteredUsers.length}</span>
 </div>
 </div>

 {/* User Directory Table */}
 <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden">
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <Table>
 <TableHeader className="bg-muted/30">
 <TableRow className="border-border hover:bg-transparent">
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Identity</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Contact Detail</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Access Level</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Security State</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Timeline</TableHead>
 <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Actions</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center justify-center gap-4">
 <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
 <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">{t("loadingUsers")}</p>
 </div>
 </TableCell>
 </TableRow>
 ) : filteredUsers.length > 0 ? (
 paginatedUsers.map((user) => (
 <TableRow key={user.id} className="border-border hover:bg-muted/30 transition-colors group">
 <TableCell className="pl-8 py-6">
 <div className="flex items-center gap-4">
 <div className="relative">
 <Avatar className="h-12 w-12 rounded-2xl border-2 border-border group-hover:border-primary/50 transition-colors shadow-xl">
 <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 text-foreground font-black text-lg">
 {user.first_name?.[0] || user.email?.[0]?.toUpperCase()}
 </AvatarFallback>
 </Avatar>
 {user.is_active !== false && (
 <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background ring-1 ring-emerald-500/20" />
 )}
 </div>
 <div className="flex flex-col">
 <span className="font-black font-display text-base tracking-tight group-hover:text-primary transition-colors">{user.full_name}</span>
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID: #{user.id.slice(0, 8)}</span>
 </div>
 </div>
 </TableCell>
 <TableCell>
 <span className="text-sm font-medium text-muted-foreground">{user.email}</span>
 </TableCell>
 <TableCell>
 <Badge variant="outline" className="px-3 py-1 rounded-lg border-border bg-muted/30 font-black text-[10px] uppercase tracking-widest group-hover:bg-primary/10 group-hover:text-primary transition-all">
 {t("role" + user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) || user.role}
 </Badge>
 </TableCell>
 <TableCell>
 <div className="flex items-center gap-2">
 <div className={cn("h-2 w-2 rounded-full", user.is_active !== false ? "bg-emerald-500 shadow-lg shadow-emerald-500/50" : "bg-rose-500")} />
 <span className={cn("text-xs font-black uppercase tracking-tighter", user.is_active !== false ? "text-emerald-500" : "text-rose-500")}>
 {user.is_active !== false ? "Authorized" : "Revoked"}
 </span>
 </div>
 </TableCell>
 <TableCell>
 <span className="text-xs font-bold text-muted-foreground">{user.date_joined ? new Date(user.date_joined).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "—"}</span>
 </TableCell>
 <TableCell className="text-right pr-8">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
 <MoreHorizontal className="h-5 w-5" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="bg-card shadow-sm border-border border-border p-2 min-w-[200px]">
 <div className="px-3 py-2 border-b border-border mb-1">
 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Command Panel</p>
 </div>
 <DropdownMenuItem 
 className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-3 cursor-pointer transition-colors"
 onSelect={() => {
 setTimeout(() => {
 setRoleTarget(user);
 setSelectedRole(user.role);
 setRoleError("");
 setIsRoleOpen(true);
 }, 0);
 }}
 >
 <Shield className="h-4 w-4 text-blue-500" /> {t("changeRole")}
 </DropdownMenuItem>
 <DropdownMenuItem 
 className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-3 cursor-pointer transition-colors"
 onSelect={() => {
 setTimeout(() => {
 handleToggleActive(user);
 }, 0);
 }}
 >
 <Power className={cn("h-4 w-4", user.is_active !== false ? "text-rose-500" : "text-emerald-500")} />
 {user.is_active !== false ? "Suspend Access" : "Restore Access"}
 </DropdownMenuItem>
 <DropdownMenuItem 
 className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-3 cursor-pointer transition-colors"
 onSelect={() => {
 setTimeout(() => {
 handleResetPassword(user);
 }, 0);
 }}
 >
 <Shield className="h-4 w-4 text-amber-500" /> Force Password Reset
 </DropdownMenuItem>
 <DropdownMenuItem
 className="rounded-lg font-bold text-xs uppercase tracking-tight py-2.5 gap-3 cursor-pointer focus:bg-rose-500/10 focus:text-rose-500 transition-colors"
 onSelect={() => {
 setTimeout(() => {
 setDeleteTarget(user);
 setDeleteError("");
 setIsDeleteOpen(true);
 }, 0);
 }}
 >
 <Trash2 className="h-4 w-4 text-rose-500" /> {t("deleteUser")}
 </DropdownMenuItem>
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={6} className="py-32 text-center">
 <div className="flex flex-col items-center justify-center space-y-4">
 <div className="h-20 w-20 rounded-[2.5rem] bg-muted/10 flex items-center justify-center border border-border rotate-12 shadow-inner">
 <Search className="h-10 w-10 text-muted-foreground/20" />
 </div>
 <div className="space-y-1">
 <p className="text-xl font-black font-display text-foreground">No matches found</p>
 <p className="text-sm font-medium text-muted-foreground">Try adjusting your search criteria.</p>
 </div>
 </div>
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 {totalPages > 1 && (
 <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
 <span className="text-sm text-muted-foreground font-medium">
 Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
 </span>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 className="h-9 px-4 rounded-lg font-bold"
 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
 disabled={currentPage === 1}
 >
 <ChevronLeft className="h-4 w-4 mr-1" /> Previous
 </Button>
 <span className="text-sm font-bold px-4 text-foreground">
 Page {currentPage} of {totalPages}
 </span>
 <Button
 variant="outline"
 size="sm"
 className="h-9 px-4 rounded-lg font-bold"
 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
 disabled={currentPage === totalPages}
 >
 Next <ChevronRight className="h-4 w-4 ml-1" />
 </Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Create User Dialog */}
 <Dialog open={isCreateOpen} onOpenChange={(open) => {
 if (!isSubmitting) setIsCreateOpen(open);
 if (!open) {
 setCreateError("");
 setCreateSuccess("");
 }
 }}>
 <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto scrollbar-hide">
 <DialogHeader>
 <DialogTitle>{t("createNewUser")}</DialogTitle>
 <DialogDescription>{t("addNewUserSystem")}</DialogDescription>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 {createError && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>{createError}</AlertDescription>
 </Alert>
 )}
 {createSuccess && (
 <Alert className="bg-green-50 text-green-900 border-green-200">
 <AlertDescription>{createSuccess}</AlertDescription>
 </Alert>
 )}
 <div className="grid gap-2">
 <Label>Given Name</Label>
 <Input
 value={newUser.first_name}
 onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
 placeholder="Jane"
 disabled={isSubmitting || !!createSuccess}
 />
 </div>
 <div className="grid gap-2">
 <Label>Family Name</Label>
 <Input
 value={newUser.last_name}
 onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
 placeholder="Doe"
 disabled={isSubmitting || !!createSuccess}
 />
 </div>
 <div className="grid gap-2">
 <Label>{t("email")}</Label>
 <Input
 value={newUser.email}
 onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
 placeholder="jane@example.com"
 disabled={isSubmitting || !!createSuccess}
 />
 </div>
 <div className="grid gap-2">
 <Label>Phone Number</Label>
 <Input
 value={newUser.phone_number}
 onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
 placeholder="+1234567890"
 disabled={isSubmitting || !!createSuccess}
 />
 </div>
 <div className="grid gap-2">
 <Label>{t("role")}</Label>
 <Select
 value={newUser.role}
 onValueChange={(val) => setNewUser({ ...newUser, role: val })}
 disabled={isSubmitting || !!createSuccess}
 >
 <SelectTrigger>
 <SelectValue placeholder={t("selectRole")} />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="LAWYER">Lawyer</SelectItem>
 <SelectItem value="JUDGE">Judge</SelectItem>
 <SelectItem value="CLERK">Court Clerk</SelectItem>
 </SelectContent>
 </Select>
 </div>
 {newUser.role === "JUDGE" && (
 <div className="grid gap-2">
 <Label>Judge Specializations *</Label>
 <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
 {categories?.map((cat) => (
 <div key={cat.id} className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => {
 const current = newUser.specialization_ids || [];
 const updated = current.includes(cat.id)
 ? current.filter((id) => id !== cat.id)
 : [...current, cat.id];
 setNewUser({ ...newUser, specialization_ids: updated });
 }}
 className="text-muted-foreground hover:text-foreground flex items-center gap-2"
 disabled={isSubmitting || !!createSuccess}
 >
 {newUser.specialization_ids?.includes(cat.id) ? (
 <CheckSquare className="h-4 w-4 text-primary" />
 ) : (
 <Square className="h-4 w-4" />
 )}
 <span className="text-sm">{cat.name}</span>
 </button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>{t("cancelBtn")}</Button>
 <Button onClick={handleCreateUser} disabled={!newUser.first_name || !newUser.email || isSubmitting || !!createSuccess}>
 {isSubmitting ? "Creating..." : t("createAccountBtn")}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Change Role Dialog */}
 <Dialog open={isRoleOpen} onOpenChange={(open) => { if (!roleSubmitting) setIsRoleOpen(open); }}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Change User Role</DialogTitle>
 <DialogDescription>
 Update role for <strong>{roleTarget?.full_name || roleTarget?.email}</strong>
 </DialogDescription>
 </DialogHeader>
 <div className="grid gap-4 py-4">
 {roleError && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>{roleError}</AlertDescription>
 </Alert>
 )}
 <div className="grid gap-2">
 <Label>New Role</Label>
 <Select value={selectedRole} onValueChange={setSelectedRole} disabled={roleSubmitting}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="CITIZEN">Citizen</SelectItem>
 <SelectItem value="LAWYER">Lawyer</SelectItem>
 <SelectItem value="JUDGE">Judge</SelectItem>
 <SelectItem value="CLERK">Court Clerk</SelectItem>
 <SelectItem value="DEFENDANT">Defendant</SelectItem>
 <SelectItem value="ADMIN">System Admin</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsRoleOpen(false)} disabled={roleSubmitting}>Cancel</Button>
 <Button onClick={handleChangeRole} disabled={roleSubmitting || selectedRole === roleTarget?.role}>
 {roleSubmitting ? "Updating..." : "Update Role"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>

 {/* Delete User Dialog */}
 <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!deleteSubmitting) setIsDeleteOpen(open); }}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Delete User</DialogTitle>
 <DialogDescription>
 Are you sure you want to permanently delete <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>? This action cannot be undone.
 </DialogDescription>
 </DialogHeader>
 {deleteError && (
 <Alert variant="destructive">
 <AlertCircle className="h-4 w-4" />
 <AlertDescription>{deleteError}</AlertDescription>
 </Alert>
 )}
 <DialogFooter>
 <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleteSubmitting}>Cancel</Button>
 <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteSubmitting}>
 {deleteSubmitting ? "Deleting..." : "Delete User"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
