"use client";

import { useAuthStore } from "@/store/auth-store";
import { useLanguage } from "@/components/language-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Save, Lock, Loader2, User, Camera } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changePassword, updateUserProfile, updateNotificationPreferences, uploadProfilePicture } from "@/lib/api";

export function SettingsPage() {
 const { user, setProfile } = useAuthStore();
 const { t, language, setLanguage } = useLanguage();
 const queryClient = useQueryClient();

 // Profile State
 const [profileData, setProfileData] = useState({
 first_name: "",
 last_name: "",
 phone_number: "",
 });

 // Password State
 const [passwordData, setPasswordData] = useState({
 old_password: "",
 new_password: "",
 confirm_password: "",
 });

 // Preferences State
 const [preferences, setPreferences] = useState({
 email_notifications: true,
 sms_notifications: false,
 });

 // Profile Picture State
 const fileInputRef = useRef(null);
 const [picturePreview, setPicturePreview] = useState(null);

 useEffect(() => {
 if (user) {
 // Split name if space exists, otherwise just put everything in first_name
 const nameParts = (user.name || "").split(" ");
 const firstName = nameParts[0] || "";
 const lastName = nameParts.slice(1).join(" ") || "";
 
 setProfileData({
 first_name: user?.first_name || firstName,
 last_name: user?.last_name || lastName,
 phone_number: user?.phone_number || "",
 });

 if (user.profile_picture) {
 setPicturePreview(user.profile_picture);
 }
 
 // Note: In a full app we would fetch the user's saved preferences from the backend
 // For now, we initialize from local state 
 }
 }, [user]);

 // Mutations
 const profileMutation = useMutation({
 mutationFn: updateUserProfile,
 onSuccess: (data) => {
 toast.success("Profile updated successfully");
 // Update auth store with new profile data
 setProfile(data);
 },
 onError: (err) => toast.error(err.message || "Failed to update profile"),
 });

 const passwordMutation = useMutation({
 mutationFn: changePassword,
 onSuccess: () => {
 toast.success("Password changed successfully");
 setPasswordData({ old_password: "", new_password: "", confirm_password: "" });
 },
 onError: (err) => toast.error(err.message || "Failed to change password"),
 });

 const preferenceMutation = useMutation({
 mutationFn: updateNotificationPreferences,
 onSuccess: () => {
 toast.success("Preferences saved successfully");
 },
 onError: (err) => toast.error(err.message || "Failed to save preferences"),
 });

 const pictureMutation = useMutation({
 mutationFn: uploadProfilePicture,
 onSuccess: (data) => {
 toast.success(data.message || "Profile picture updated!");
 if (data.profile_picture) {
 setPicturePreview(data.profile_picture);
 if (typeof setProfile === "function") {
 setProfile({ profile_picture: data.profile_picture });
 }
 }
 },
 onError: (err) => toast.error(err.message || "Failed to upload picture"),
 });

 const handlePictureChange = (e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 // Validate file type
 if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
 toast.error("Only JPG and PNG images are allowed.");
 return;
 }
 // Show local preview immediately
 setPicturePreview(URL.createObjectURL(file));
 pictureMutation.mutate(file);
 };

 const handleProfileSubmit = (e) => {
 e.preventDefault();
 profileMutation.mutate(profileData);
 };

 const handlePasswordSubmit = (e) => {
 e.preventDefault();
 if (passwordData.new_password !== passwordData.confirm_password) {
 toast.error("New passwords do not match");
 return;
 }
 passwordMutation.mutate({
 old_password: passwordData.old_password,
 new_password: passwordData.new_password,
 });
 };

 const handlePreferenceSave = () => {
 preferenceMutation.mutate({
 email_notifications: preferences.email_notifications,
 sms_notifications: preferences.sms_notifications,
 });
 };

 if (!user) return null;

 return (
 <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl">
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-primary">{t("settingsTitle")}</h1>
 <p className="text-muted-foreground">{t("settingsSubtitle")}</p>
 </div>

 <div className="grid gap-6">
 {/* Profile Picture Section */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Camera className="h-5 w-5 text-primary" />
 Profile Picture
 </CardTitle>
 <CardDescription>Upload a photo for your account (JPG or PNG only)</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-6">
 <div className="relative group">
 <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-primary/20 bg-muted/30 flex items-center justify-center">
 {picturePreview ? (
 <img src={picturePreview} alt="Profile" className="h-full w-full object-cover" />
 ) : (
 <User className="h-10 w-10 text-muted-foreground/40" />
 )}
 </div>
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
 >
 <Camera className="h-5 w-5 text-white" />
 </button>
 </div>
 <div className="space-y-2">
 <input
 ref={fileInputRef}
 type="file"
 accept=".jpg,.jpeg,.png"
 className="hidden"
 onChange={handlePictureChange}
 />
 <Button
 type="button"
 variant="outline"
 onClick={() => fileInputRef.current?.click()}
 disabled={pictureMutation.isPending}
 className="font-bold"
 >
 {pictureMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
 {pictureMutation.isPending ? "Uploading..." : "Change Photo"}
 </Button>
 <p className="text-xs text-muted-foreground">Max size: 2MB. JPG or PNG only.</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Profile Section */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <User className="h-5 w-5 text-primary" /> 
 {t("sectionProfile")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleProfileSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>First Name</Label>
 <Input 
 value={profileData.first_name} 
 onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} 
 />
 </div>
 <div className="space-y-2">
 <Label>Last Name</Label>
 <Input 
 value={profileData.last_name} 
 onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} 
 />
 </div>
 <div className="space-y-2">
 <Label>Phone Number</Label>
 <Input 
 type="tel"
 value={profileData.phone_number} 
 onChange={(e) => setProfileData({...profileData, phone_number: e.target.value})} 
 placeholder="+251..."
 />
 </div>
 <div className="space-y-2">
 <Label>{t("lblEmail")}</Label>
 <Input defaultValue={user.email} disabled className="bg-muted/50" />
 </div>
 <div className="space-y-2">
 <Label>{t("lblRole")}</Label>
 <Input defaultValue={user.role} className="capitalize bg-muted/50" disabled />
 </div>
 </div>
 <div className="flex justify-end pt-2">
 <Button type="submit" disabled={profileMutation.isPending}>
 {profileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
 {profileMutation.isPending ? "Saving..." : "Update Profile"}
 </Button>
 </div>
 </form>
 </CardContent>
 </Card>

 {/* Password Section */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <Lock className="h-5 w-5 text-primary" /> 
 Change Password
 </CardTitle>
 <CardDescription>Update your account password</CardDescription>
 </CardHeader>
 <CardContent>
 <form onSubmit={handlePasswordSubmit} className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Current Password</Label>
 <Input 
 type="password" 
 required
 value={passwordData.old_password} 
 onChange={(e) => setPasswordData({...passwordData, old_password: e.target.value})} 
 />
 </div>
 <div className="space-y-2 md:col-start-1">
 <Label>New Password</Label>
 <Input 
 type="password" 
 required
 value={passwordData.new_password} 
 onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} 
 />
 </div>
 <div className="space-y-2 group">
 <Label>Confirm New Password</Label>
 <Input 
 type="password" 
 required
 value={passwordData.confirm_password} 
 onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} 
 />
 </div>
 </div>
 <div className="flex justify-end pt-2">
 <Button type="submit" disabled={passwordMutation.isPending}>
 {passwordMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
 {passwordMutation.isPending ? "Updating..." : "Update Password"}
 </Button>
 </div>
 </form>
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
 <Switch 
 id="email-notif" 
 checked={preferences.email_notifications}
 onCheckedChange={(c) => setPreferences({...preferences, email_notifications: c})}
 />
 </div>
 <div className="flex items-center justify-between space-x-2">
 <Label htmlFor="sms-notif" className="flex flex-col space-y-1">
 <span>{t("lblSmsNotif")}</span>
 <span className="font-normal text-muted-foreground">{t("descSmsNotif")}</span>
 </Label>
 <Switch 
 id="sms-notif" 
 checked={preferences.sms_notifications}
 onCheckedChange={(c) => setPreferences({...preferences, sms_notifications: c})}
 />
 </div>
 <div className="flex justify-end pt-4 border-t">
 <Button onClick={handlePreferenceSave} variant="outline" disabled={preferenceMutation.isPending}>
 {preferenceMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
 {preferenceMutation.isPending ? "Saving..." : "Save Preferences"}
 </Button>
 </div>
 </CardContent>
 </Card>

 </div>
 </div>
 );
}
