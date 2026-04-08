"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers, adminCreateUser, adminUpdateUser, adminDeleteUser, fetchCategories } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserPlus, Trash2, Shield, Search, AlertCircle, Power, CheckSquare, Square } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/language-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function UserManagementPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newUser, setNewUser] = useState({ first_name: "", last_name: "", email: "", phone_number: "", role: "JUDGE", specialization_ids: [] });
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { t } = useLanguage();

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
        queryKey: ["users"],
        queryFn: () => fetchUsers(),
    });

    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: () => fetchCategories(),
    });

    const filteredUsers = users?.filter(u =>
        (u.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.role || "").toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

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
        setDeleteError("");
        setDeleteSubmitting(true);
        try {
            await adminDeleteUser(deleteTarget.id);
            setIsDeleteOpen(false);
            refetch();
        } catch (err) {
            setDeleteError(err.message || "Failed to delete user.");
        } finally {
            setDeleteSubmitting(false);
        }
    };

    const handleToggleActive = async (user) => {
        try {
            await adminUpdateUser(user.id, { is_active: !user.is_active });
            refetch();
        } catch (err) {
            console.error("Toggle active error:", err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t("userManagement")}</h1>
                    <p className="text-muted-foreground">{t("manageSystemAccess")}</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> {t("addUser")}
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t("searchUsers")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Avatar</TableHead>
                            <TableHead>{t("fullName")}</TableHead>
                            <TableHead>{t("email")}</TableHead>
                            <TableHead>{t("role")}</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Join Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">{t("loadingUsers")}</TableCell>
                            </TableRow>
                        ) : filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback>{user.first_name?.[0] || user.email?.[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">{user.full_name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                        {t("role" + user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()) || user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={user.is_active !== false ? "default" : "secondary"} className={user.is_active !== false ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>
                                        {user.is_active !== false ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell>{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "N/A"}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => {
                                                setRoleTarget(user);
                                                setSelectedRole(user.role);
                                                setRoleError("");
                                                setIsRoleOpen(true);
                                            }}>
                                                <Shield className="mr-2 h-4 w-4" /> {t("changeRole")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                                <Power className="mr-2 h-4 w-4" />
                                                {user.is_active !== false ? "Deactivate" : "Activate"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={() => {
                                                    setDeleteTarget(user);
                                                    setDeleteError("");
                                                    setIsDeleteOpen(true);
                                                }}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> {t("deleteUser")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Create User Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
                if (!isSubmitting) setIsCreateOpen(open);
                if (!open) {
                    setCreateError("");
                    setCreateSuccess("");
                }
            }}>
                <DialogContent>
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
