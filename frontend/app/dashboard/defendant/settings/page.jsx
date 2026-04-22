"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchProfile, updateProfile } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Shield, Loader2, Save, CheckCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function DefendantSettingsPage() {
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
    });

    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: fetchProfile,
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                first_name: profile.first_name || "",
                last_name: profile.last_name || "",
                email: profile.email || "",
                phone_number: profile.phone_number || "",
            });
        }
    }, [profile]);

    const updateMutation = useMutation({
        mutationFn: (data) => updateProfile(data),
        onSuccess: () => {
            alert("Security Profile Updated");
        },
        onError: (err) => alert(err.message || "Update failed")
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest text-center">Syncing Security Profile...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-up max-w-2xl mx-auto pb-20">
            <div>
                <h1 className="text-3xl font-black font-display tracking-tight text-white mb-2">Account Settings</h1>
                <p className="text-muted-foreground font-medium">Manage your verified security profile and contact preferences.</p>
            </div>

            <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                            <Shield className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black font-display">Verified Identity</CardTitle>
                            <CardDescription>Authentication details provided during summons.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <Separator className="bg-white/5 mx-8" />
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">First Name</Label>
                                <Input 
                                    className="bg-white/5 border-white/10 rounded-xl h-12"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</Label>
                                <Input 
                                    className="bg-white/5 border-white/10 rounded-xl h-12"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Official Email Address</Label>
                            <Input 
                                type="email"
                                className="bg-white/5 border-white/10 rounded-xl h-12 opacity-50 cursor-not-allowed"
                                value={formData.email}
                                disabled
                            />
                            <p className="text-[10px] text-muted-foreground italic px-1">Email verification is locked to your summoned record.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verified Contact Number</Label>
                            <Input 
                                className="bg-white/5 border-white/10 rounded-xl h-12"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                            />
                        </div>

                        <div className="pt-4">
                            <Button 
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="w-full rounded-xl font-bold bg-primary hover:bg-primary/90 h-12 shadow-lg shadow-primary/20"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" /> Save Security Profile
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="glass-card border-rose-500/10 bg-rose-500/5 shadow-2xl overflow-hidden">
                <CardHeader className="p-8">
                    <CardTitle className="text-xl font-black text-rose-500">Security Warning</CardTitle>
                    <CardDescription className="text-rose-400 opacity-70">Changes to your contact information may require additional verification or court notification.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
