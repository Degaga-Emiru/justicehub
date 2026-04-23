"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllJudgeProfiles, fetchUsers, fetchCategories, createJudgeProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Shield, UserPlus, Loader2, Gavel, Mail, Briefcase, ArrowLeft, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ManageJudgesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState("");
    const [specializations, setSpecializations] = useState([]);
    const [maxCases, setMaxCases] = useState(10);
    const [experience, setExperience] = useState(0);
    const [barNumber, setBarNumber] = useState("");
    
    const queryClient = useQueryClient();
    const router = useRouter();

    const { data: judgeProfiles, isLoading: profilesLoading } = useQuery({
        queryKey: ["judge-profiles"],
        queryFn: () => fetchAllJudgeProfiles(),
    });

    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ["admin-users-judges"],
        queryFn: () => fetchUsers({ role: "JUDGE" }),
    });

    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: () => fetchCategories(),
    });

    const createProfileMutation = useMutation({
        mutationFn: createJudgeProfile,
        onSuccess: () => {
            toast.success("Judge profile created successfully");
            queryClient.invalidateQueries({ queryKey: ["judge-profiles"] });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to create judge profile");
        }
    });

    const resetForm = () => {
        setSelectedUser("");
        setSpecializations([]);
        setMaxCases(10);
        setExperience(0);
        setBarNumber("");
    };

    const handleCreateProfile = (e) => {
        e.preventDefault();
        if (!selectedUser) {
            toast.error("Please select a user");
            return;
        }
        if (specializations.length === 0) {
            toast.error("Please select at least one specialization");
            return;
        }

        createProfileMutation.mutate({
            user: selectedUser,
            specialization_ids: specializations,
            max_active_cases: maxCases,
            years_of_experience: experience,
            bar_certificate_number: barNumber
        });
    };

    const filteredProfiles = (judgeProfiles || []).filter(p => 
        (p.user_details?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.user_details?.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter users who are judges but don't have a profile yet
    const profileUserIds = new Set((judgeProfiles || []).map(p => {
        // Handle both ID and object formats for safety
        const userId = typeof p.user === 'object' ? p.user?.id : p.user;
        return userId?.toString();
    }).filter(Boolean));

    const potentialJudges = (users || []).filter(u => {
        const isJudge = u.role?.toUpperCase() === "JUDGE";
        const hasNoProfile = !profileUserIds.has(u.id?.toString());
        return isJudge && hasNoProfile;
    });

    return (
        <div className="space-y-8 animate-fade-up">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-1">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push('/dashboard/admin/users')} 
                        className="mb-2 -ml-2 text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-bold"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to User Management
                    </Button>
                    <h1 className="text-4xl font-black font-display tracking-tight text-foreground">Judge Management</h1>
                    <p className="text-muted-foreground font-medium text-lg leading-relaxed flex items-center gap-2">
                        <Gavel className="h-5 w-5 text-primary" />
                        Configure judge profiles and specializations.
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 text-white">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black font-display">Create Judge Profile</DialogTitle>
                            <DialogDescription>Link professional details to a judge account.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateProfile} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="user" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Select Judge User</Label>
                                <select 
                                    id="user" 
                                    value={selectedUser} 
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="flex h-12 w-full items-center justify-between rounded-xl border border-white/20 bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                                    required
                                    disabled={usersLoading || profilesLoading}
                                >
                                    {usersLoading || profilesLoading ? (
                                        <option>Loading users...</option>
                                    ) : potentialJudges.length === 0 ? (
                                        <option value="">No eligible judges found</option>
                                    ) : (
                                        <>
                                            <option value="">Select a user...</option>
                                            {potentialJudges.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
                                            ))}
                                        </>
                                    )}
                                </select>
                                {potentialJudges.length === 0 && !usersLoading && !profilesLoading && (
                                    <p className="text-[10px] text-rose-400 font-medium px-1">
                                        All users with the JUDGE role already have active profiles.
                                    </p>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="maxCases" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Max Active Cases</Label>
                                    <Input id="maxCases" type="number" value={maxCases} onChange={(e) => setMaxCases(parseInt(e.target.value))} className="h-12 bg-background/50 border-white/20 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="experience" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Years Experience</Label>
                                    <Input id="experience" type="number" value={experience} onChange={(e) => setExperience(parseInt(e.target.value))} className="h-12 bg-background/50 border-white/20 rounded-xl" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="barNumber" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Bar Certificate Number</Label>
                                <Input id="barNumber" value={barNumber} onChange={(e) => setBarNumber(e.target.value)} placeholder="BAR12345" className="h-12 bg-background/50 border-white/20 rounded-xl" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Specializations *</Label>
                                <div className="border border-white/20 rounded-xl p-4 max-h-40 overflow-y-auto space-y-2 bg-background/50">
                                    {categories?.map((cat) => (
                                        <div key={cat.id} className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSpecializations(prev => 
                                                        prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                                                    );
                                                }}
                                                className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                                            >
                                                {specializations.includes(cat.id) ? (
                                                    <CheckSquare className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <Square className="h-4 w-4" />
                                                )}
                                                <span className="text-sm font-medium">{cat.name}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-12 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 text-white" disabled={createProfileMutation.isPending}>
                                {createProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Profile
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Search judges..."
                        className="pl-11 h-12 bg-muted/30 border-white/5 rounded-2xl glass focus-visible:ring-primary/50 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="glass-card border-white/5 shadow-2xl overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Judge</TableHead>
                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Specializations</TableHead>
                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-center">Workload</TableHead>
                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Experience</TableHead>
                                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {profilesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-32 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronizing Judge Records...</p>
                                    </TableCell>
                                </TableRow>
                            ) : filteredProfiles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-32 text-center">
                                        <Gavel className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                        <p className="text-xl font-black font-display">No Judge Profiles Found</p>
                                        <p className="text-sm text-muted-foreground mt-2">Initialize judge profiles to enable case assignments.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProfiles.map((profile) => (
                                    <TableRow key={profile.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                        <TableCell className="pl-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center font-black text-primary text-xl shadow-lg border border-primary/10">
                                                    {profile.user_details?.first_name?.charAt(0) || "J"}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black font-display text-base group-hover:text-primary transition-colors">
                                                        Judge {profile.user_details?.first_name} {profile.user_details?.last_name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-medium">{profile.user_details?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1.5 max-w-[250px]">
                                                {profile.specializations?.map(spec => (
                                                    <Badge key={spec.id} variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-black uppercase px-2">
                                                        {spec.name}
                                                    </Badge>
                                                )) || <span className="text-xs italic text-muted-foreground">Generalist</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <Badge variant={profile.can_take_more ? "secondary" : "destructive"} className="font-mono text-xs">
                                                    {profile.active_cases_count} / {profile.max_active_cases}
                                                </Badge>
                                                <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-primary" 
                                                        style={{ width: `${Math.min(100, (profile.active_cases_count / profile.max_active_cases) * 100)}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-bold text-foreground">{profile.years_of_experience} Years</span>
                                            <p className="text-[10px] text-muted-foreground font-medium">{profile.bar_certificate_number}</p>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <Badge variant="outline" className={profile.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase" : "bg-rose-500/10 text-rose-500 border-rose-500/20 text-[9px] font-black uppercase"}>
                                                {profile.is_active ? "Verified" : "Suspended"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
