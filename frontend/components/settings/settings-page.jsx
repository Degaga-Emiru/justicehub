"use client";

import { useAuthStore } from "@/store/auth-store";
import { useLanguage } from "@/components/language-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

export function SettingsPage() {
    const { user } = useAuthStore();
    const { t, language, setLanguage } = useLanguage();
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = () => {
        setIsLoading(true);
        // Simulate save
        setTimeout(() => {
            setIsLoading(false);
            toast.success(t("msgSaved"));
        }, 800);
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary">{t("settingsTitle")}</h1>
                <p className="text-muted-foreground">{t("settingsSubtitle")}</p>
            </div>

            <div className="grid gap-6">
                {/* Profile Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("sectionProfile")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("lblFullName")}</Label>
                                <Input defaultValue={user.name} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("lblEmail")}</Label>
                                <Input defaultValue={user.email} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("lblRole")}</Label>
                                <Input defaultValue={user.role} className="capitalize" disabled />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Preferences Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("sectionPreferences")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("lblLanguage")}</Label>
                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="en">{t("langEnglish")}</SelectItem>
                                        <SelectItem value="am">{t("langAmharic")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("sectionNotifications")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="email-notif" className="flex flex-col space-y-1">
                                <span>{t("lblEmailNotif")}</span>
                                <span className="font-normal text-muted-foreground">{t("descEmailNotif")}</span>
                            </Label>
                            <Switch id="email-notif" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="sms-notif" className="flex flex-col space-y-1">
                                <span>{t("lblSmsNotif")}</span>
                                <span className="font-normal text-muted-foreground">{t("descSmsNotif")}</span>
                            </Label>
                            <Switch id="sms-notif" />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isLoading}>
                        <Save className="mr-2 h-4 w-4" />
                        {isLoading ? "Saving..." : t("btnSave")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
