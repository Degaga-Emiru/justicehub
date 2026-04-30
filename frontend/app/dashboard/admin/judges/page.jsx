"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllJudgeProfiles, fetchUsers, fetchCategories, updateJudgeProfile } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Shield, UserPlus, Loader2, Gavel, Mail, Briefcase, ArrowLeft, CheckSquare, Square, TrendingUp, Activity, Scale } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ManageJudgesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
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

  const updateProfileMutation = useMutation({
    mutationFn: (data) => updateJudgeProfile(selectedProfileId, data),
    onSuccess: () => {
      toast.success("Judge profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["judge-profiles"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update judge profile");
    }
  });

  const resetForm = () => {
    setSelectedProfileId("");
    setSpecializations([]);
    setMaxCases(10);
    setExperience(0);
    setBarNumber("");
  };

  const handleProfileSelect = (e) => {
    const profileId = e.target.value;
    setSelectedProfileId(profileId);
    if (profileId && judgeProfiles) {
      const profile = judgeProfiles.find(p => p.id === profileId);
      if (profile) {
        setMaxCases(profile.max_active_cases || 10);
        setExperience(profile.years_of_experience || 0);
        setBarNumber(profile.bar_certificate_number || "");
        setSpecializations(profile.specializations || []);
      }
    } else {
      resetForm();
    }
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    if (!selectedProfileId) {
      toast.error("Please select a judge");
      return;
    }

    updateProfileMutation.mutate({
      max_active_cases: maxCases,
      years_of_experience: experience,
      bar_certificate_number: barNumber
    });
  };

  const filteredProfiles = (judgeProfiles || []).filter(p => 
    (p.user_details?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.user_details?.email || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            Configure judge profiles and monitor system workload.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Gavel className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black font-display">{judgeProfiles?.length || 0}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Judges</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-black font-display">
                  {judgeProfiles?.filter(p => p.status === 'AVAILABLE').length || 0}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Available Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-black font-display">
                  {Math.round((judgeProfiles?.reduce((acc, p) => acc + (p.workload_percentage || 0), 0) || 0) / (judgeProfiles?.length || 1))}%
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Load</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Scale className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-black font-display">
                  {judgeProfiles?.reduce((acc, p) => acc + (p.active_cases_count || 0), 0) || 0}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search judges..."
            className="pl-11 h-12 bg-muted/30 border-border rounded-2xl bg-background shadow-sm border-border focus-visible:ring-primary/50 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="bg-card shadow-sm border-border border-border shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30 border-b border-border py-6 px-8">
          <CardTitle className="text-xl font-black font-display uppercase tracking-wider flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Judge Workload Table
          </CardTitle>
          <CardDescription className="font-medium italic">Click on any judge to view intelligence insights and detailed workload metrics.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground pl-8">Judge</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-center">Active Cases</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-center">Capacity</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-center">Load %</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground">Specializations</TableHead>
                <TableHead className="py-5 font-black uppercase text-[10px] tracking-widest text-muted-foreground text-right pr-8">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profilesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-32 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synchronizing Judge Records...</p>
                  </TableCell>
                </TableRow>
              ) : filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-32 text-center">
                    <Gavel className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-xl font-black font-display">No Judge Profiles Found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => (
                  <TableRow 
                    key={profile.id} 
                    className="border-border hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/dashboard/admin/judges/${profile.id}`)}
                  >
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
                    <TableCell className="text-center">
                      <span className="font-bold text-base">{profile.active_cases_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-muted-foreground">{profile.max_active_cases}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className={cn(
                          "text-xs font-black px-2 py-0.5 rounded-lg",
                          profile.workload_percentage > 80 ? "bg-rose-500/10 text-rose-500" : 
                          profile.workload_percentage > 50 ? "bg-amber-500/10 text-amber-500" : 
                          "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {profile.workload_percentage}%
                        </span>
                        <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-500",
                              profile.workload_percentage > 80 ? "bg-rose-500" : 
                              profile.workload_percentage > 50 ? "bg-amber-500" : 
                              "bg-emerald-500"
                            )}
                            style={{ width: `${profile.workload_percentage}%` }} 
                          />
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
                    <TableCell className="text-right pr-8">
                      <Badge className={cn(
                        "text-[9px] font-black uppercase px-3 py-1 border-none",
                        profile.status === 'AVAILABLE' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                        profile.status === 'BUSY' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" :
                        "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                      )}>
                        {profile.status_display}
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
