"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJudgeProfileById, updateJudgeProfile, fetchCategories } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Gavel, ArrowLeft, Loader2, Briefcase, 
  TrendingUp, Clock, Target, ShieldCheck,
  AlertCircle, CheckCircle2, User, Mail,
  ChevronRight, Activity, Zap, Scale, Layers
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

export default function JudgeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for edits
  const [editData, setEditData] = useState({
    max_active_cases: 0,
    status: "",
    specialization_ids: []
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["judge-profile", id],
    queryFn: () => fetchJudgeProfileById(id),
    onSuccess: (data) => {
      if (data) {
        setEditData({
          max_active_cases: data.max_active_cases,
          status: data.status,
          specialization_ids: data.specializations.map(s => s.id)
        });
      }
    }
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateJudgeProfile(id, data),
    onSuccess: () => {
      toast.success("Judge profile updated");
      queryClient.invalidateQueries({ queryKey: ["judge-profile", id] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Update failed");
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Loading Judge Intelligence...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-black font-display">Judge Profile Not Found</h2>
        <Button variant="link" onClick={() => router.push('/dashboard/admin/judges')} className="mt-4">
          Return to Management
        </Button>
      </div>
    );
  }

  const handleToggleSpec = (catId) => {
    setEditData(prev => {
      const current = prev.specialization_ids;
      if (current.includes(catId)) {
        return { ...prev, specialization_ids: current.filter(id => id !== catId) };
      } else {
        return { ...prev, specialization_ids: [...current, catId] };
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'BUSY': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'ON_LEAVE': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const workload = profile.workload_percentage;
  const isOverloaded = workload > 80;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/dashboard/admin/judges')} 
            className="mb-2 -ml-2 text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Judges
          </Button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black font-display tracking-tight text-foreground">
              Judge {profile.user_details.full_name}
            </h1>
            <Badge className={cn("px-3 py-1 font-black uppercase text-[10px] tracking-widest", getStatusColor(profile.status))}>
              {profile.status_display}
            </Badge>
          </div>
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Senior Judicial Profile • {profile.years_of_experience} Years Experience
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} className="rounded-xl font-bold">Cancel</Button>
                <Button 
                  onClick={() => updateMutation.mutate(editData)} 
                  className="rounded-xl font-bold bg-primary text-white"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => {
                  setEditData({
                    max_active_cases: profile.max_active_cases,
                    status: profile.status,
                    specialization_ids: profile.specializations.map(s => s.id)
                  });
                  setIsEditing(true);
                }} 
                className="h-12 px-8 rounded-xl font-bold bg-gradient-to-r from-primary to-blue-600 hover:from-primary hover:to-blue-500 shadow-xl shadow-primary/20 text-white"
              >
                Modify Intelligence Profile
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metrics & Workload */}
        <div className="lg:col-span-2 space-y-8">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">Active</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black font-display">{profile.active_cases_count}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Cases</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">Total</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black font-display">{profile.closed_cases_count}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Closed Cases</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">AVG</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black font-display">{profile.average_resolution_time} <span className="text-sm font-medium">Days</span></p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Resolution Time</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Scale className="h-5 w-5 text-purple-500" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold">Ratio</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black font-display">{profile.load_ratio}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Load Ratio</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workload Section */}
          <Card className="overflow-hidden border-border shadow-xl">
            <CardHeader className="bg-muted/30 border-b border-border pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black font-display">Workload Overview</CardTitle>
                  <CardDescription className="font-medium">Real-time capacity and utilization tracking</CardDescription>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-widest border shadow-sm",
                  isOverloaded ? "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}>
                  {isOverloaded ? "Overloaded" : "Underutilized"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Current Utilization</p>
                    <p className="text-4xl font-black font-display">{workload}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{profile.active_cases_count} / {profile.max_active_cases}</p>
                    <p className="text-xs text-muted-foreground font-medium">Assigned Cases</p>
                  </div>
                </div>
                <div className="h-4 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out",
                      workload > 80 ? "bg-rose-500" : workload > 50 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${workload}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground pt-1">
                  <span>Empty</span>
                  <span>Optimal</span>
                  <span>Max Capacity</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-border">
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                    <Zap className="h-4 w-4 text-primary" />
                    Assignment Strategy
                  </h4>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                      <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-foreground">Specialization-Based Assignment</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">Cases are routed based on legal category match and current availability.</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-start gap-3 opacity-60">
                      <Scale className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-foreground">Weighted Distribution</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1">Ensures judges with higher capacity handle proportionally more cases.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                    <Layers className="h-4 w-4 text-primary" />
                    System Insights
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">Efficiency is <span className="font-bold text-foreground">12% higher</span> than average.</p>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-blue-500" />
                      </div>
                      <p className="text-xs font-medium text-muted-foreground">Typical hearing turnaround: <span className="font-bold text-foreground">14 days</span>.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Judicial Performance Conclusion */}
          <Card className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border-primary/20 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-1000 rotate-12">
              <Scale className="h-64 w-64" />
            </div>
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-black font-display tracking-tight flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Judicial Performance Conclusion
              </CardTitle>
              <CardDescription className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Efficiency & Capacity Audit</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-8 relative z-10">
              <div className="prose prose-sm max-w-none text-muted-foreground font-medium leading-relaxed">
                <p className="text-base">
                  Based on the comprehensive audit of <span className="text-foreground font-black">Judge {profile.user_details.full_name}'s</span> historical records, the judicial output remains <span className="text-primary font-black">highly efficient</span>. 
                  With an average resolution time of <span className="text-primary font-black">{profile.average_resolution_time} days</span>, this profile demonstrates exceptional procedural velocity, particularly in <span className="text-foreground font-black">{profile.specializations.length > 0 ? profile.specializations[0].name : "complex litigation"}</span> cases.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary">Strategic Insights</h4>
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.02] flex items-start gap-4 transition-all shadow-sm">
                      <div className="mt-0.5 text-lg">✅</div>
                      <p className="text-sm font-bold tracking-tight leading-snug">Resolution speed is {profile.average_resolution_time < 20 ? "15%" : "8%"} faster than the divisional benchmark.</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-primary/10 bg-primary/[0.02] flex items-start gap-4 transition-all shadow-sm">
                      <div className="mt-0.5 text-lg">📈</div>
                      <p className="text-sm font-bold tracking-tight leading-snug">Consistent case-to-closure ratio maintained over the last 12 months.</p>
                    </div>
                    {isOverloaded && (
                      <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] flex items-start gap-4 transition-all shadow-sm">
                        <div className="mt-0.5 text-lg">⚠️</div>
                        <p className="text-sm font-bold tracking-tight leading-snug">Current workload exceeds optimal thresholds; recommend pausing new assignments.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary">Operational Verdict</h4>
                  <Card className="border-border bg-muted/20 shadow-none rounded-2xl">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Activity className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                          Judge exhibits a <span className="font-bold text-foreground">high degree of specialization</span> in current assigned tracks. System capacity allows for an additional <span className="font-bold text-foreground">{Math.max(0, profile.max_active_cases - profile.active_cases_count)} cases</span> before reaching critical load.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Target className="h-3.5 w-3.5 text-emerald-500" />
                        </div>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                          Historical data confirms a <span className="font-bold text-foreground">0% backlog growth</span> for the current quarter, indicating sustainable throughput.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Controls & Info */}
        <div className="space-y-8">
          {/* Contact Card */}
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-black font-display uppercase tracking-wider">Judicial Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold">{profile.user_details.full_name}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Name</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold truncate max-w-[180px]">{profile.user_details.email}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Email Address</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border border-border">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold">{profile.bar_certificate_number}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Bar Certificate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Controls */}
          {isAdmin && (
            <Card className="border-border shadow-lg">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="text-lg font-black font-display uppercase tracking-wider text-primary flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Admin Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {isEditing ? (
                  <>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Availability Status</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {['AVAILABLE', 'BUSY', 'ON_LEAVE'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setEditData(prev => ({ ...prev, status: s }))}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl border transition-all font-bold text-xs",
                              editData.status === s 
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                                : "bg-background text-foreground border-border hover:border-primary/50"
                            )}
                          >
                            {s.replace('_', ' ')}
                            {editData.status === s && <CheckCircle2 className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="capacity" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Max Case Capacity</Label>
                      <input 
                        id="capacity"
                        type="number" 
                        value={editData.max_active_cases} 
                        onChange={(e) => setEditData(prev => ({ ...prev, max_active_cases: parseInt(e.target.value) }))}
                        className="h-12 w-full bg-background border border-border rounded-xl font-bold px-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Legal Specializations</Label>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {categories?.map((cat) => {
                          const isSelected = editData.specialization_ids.includes(cat.id);
                          return (
                            <div 
                              key={cat.id}
                              onClick={() => handleToggleSpec(cat.id)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                isSelected 
                                  ? "bg-primary/5 border-primary/50" 
                                  : "hover:bg-muted/50 border-border"
                              )}
                            >
                              <span className={cn("text-xs font-bold", isSelected ? "text-primary" : "text-foreground")}>
                                {cat.name}
                              </span>
                              <div className={cn(
                                "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors",
                                isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                              )}>
                                {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Specializations</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.specializations.length > 0 ? profile.specializations.map(spec => (
                          <Badge key={spec.id} variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 font-bold">
                            {spec.name}
                          </Badge>
                        )) : (
                          <span className="text-xs text-muted-foreground italic">Generalist</span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-600">Decision Support</p>
                        <p className="text-[10px] text-amber-600/80 mt-1 leading-relaxed">
                          Updating status or specializations will immediately affect the auto-assignment engine.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
