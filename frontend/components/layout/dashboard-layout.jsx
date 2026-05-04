"use client";

import { Sidebar, SidebarContent } from "@/components/layout/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Search, Menu, X, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-provider";
import { NotificationBell } from "@/components/ui/notification-bell";

const roleMenus = {
 client: [
 { label: "Dashboard", href: "/dashboard/client", icon: null }, // Re-using roles logic or better pass it
 ],
 // ... we don't need to redefine if SidebarContent handles it based on user.
 // Actually SidebarContent needs menuItems. But Sidebar calculates it.
 // We should probably export roleMenus from Sidebar or move logic.
};

// We need roleMenus to be accessible or logic to be in SidebarContent.
// SidebarContent takes 'menuItems'.
// Let's modify Sidebar.jsx to export roleMenus? Or just duplicate for now/import if possible.
// Actually, Sidebar component handles 'menuItems' calculation.
// Since I can't easily export roleMenus without another edit, I will import it if I exported it, or just use <Sidebar className="flex" /> in a wrapper.

// Better approach: Re-use <Sidebar /> but formatted for mobile.
// But Sidebar has 'fixed' class. I added 'className' support to Sidebar!
// So I can use <Sidebar className="md:hidden z-50 ..." />?
// Sidebar has 'hidden md:flex'. If I pass 'flex', it overrides 'hidden'? ClassName merging order matters.
// 'cn' usually lets last wins.

export function DashboardLayout({ children }) {
 const { user, isAuthenticated, isInitialized, logout } = useAuthStore();
 const router = useRouter();
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const { t } = useLanguage();

 useEffect(() => {
 if (isInitialized && !isAuthenticated) {
 router.push("/");
 }
 }, [isAuthenticated, isInitialized, router]);

 const roleMap = {
 'CITIZEN': 'client',
 'DEFENDANT': 'defendant',
 'LAWYER': 'client',
 'JUDGE': 'judge',
 'CLERK': 'clerk',
 'ADMIN': 'admin',
 'REGISTRAR': 'clerk'
 };
 
 const normalizedRole = user?.role ? (roleMap[user.role.toUpperCase()] || user.role.toLowerCase()) : "client";

 if (!isInitialized || (!isAuthenticated && isInitialized) || !user) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
 <div className="absolute inset-0 bg-primary/5 -z-10 blur-[100px]"></div>
 <div className="flex flex-col items-center gap-6 animate-pulse">
 <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-primary/20 flex items-center justify-center">
 <img src="/logos.jpeg" alt="JusticeHub" className="h-full w-full object-cover" />
 </div>
 <p className="text-sm font-black text-primary uppercase tracking-[0.2em] font-display">{t("loading")}</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
 <Sidebar />

 {/* Mobile Sidebar Overlay */}
 {mobileMenuOpen && (
 <div className="fixed inset-0 z-50 md:hidden">
 <div
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-500"
 onClick={() => setMobileMenuOpen(false)}
 />
 <div className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] shadow-2xl animate-in slide-in-from-left duration-500">
 <MobileSidebarContent user={user} logout={logout} onClose={() => setMobileMenuOpen(false)} normalizedRole={normalizedRole} />
 </div>
 </div>
 )}

 {/* Main content area */}
 <div className="md:pl-72 transition-all duration-500 flex flex-col min-h-screen relative">
 {/* Background Decoration */}
 <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none"></div>

 {/* Top bar - Glass Effect */}
 <header className="sticky top-0 z-30 h-20 border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 flex items-center justify-between px-6 md:px-10">
 <div className="flex items-center gap-6 flex-1">
 <Button 
 variant="ghost" 
 size="icon" 
 className="md:hidden hover:bg-primary/10 hover:text-primary transition-all rounded-xl" 
 onClick={() => setMobileMenuOpen(true)}
 >
 <Menu className="h-6 w-6" />
 </Button>
 
 <div className="relative max-w-md w-full hidden sm:block group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#4A5568] group-focus-within:text-primary transition-colors opacity-100" />
 <Input
 placeholder={t("searchCasesDocs")}
 className="h-11 pl-11 bg-muted/30 border-border rounded-2xl focus-visible:ring-primary/20 focus-visible:bg-muted/50 transition-all font-bold text-sm text-[#1A202C]"
 />
 </div>
 </div>

 <div className="flex items-center gap-6">
 <NotificationBell />

 <div className="h-10 w-px bg-border/40 hidden sm:block" />

 <Link href={`/dashboard/${normalizedRole}/settings`} className="flex items-center gap-3 group cursor-pointer">
 <div className="text-right hidden sm:block">
 <p className="text-xs font-black text-[#1A202C] font-display uppercase tracking-wider group-hover:text-primary transition-colors opacity-100">{user.name}</p>
 <p className="text-[10px] font-black text-[#4A5568] uppercase tracking-widest leading-none mt-0.5 opacity-100">{user.role}</p>
 </div>
 {user.profile_picture ? (
 <div className="h-10 w-10 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-sm transform group-hover:scale-105 transition-transform">
 <img src={user.profile_picture} alt={user.name} className="h-full w-full object-cover" />
 </div>
 ) : (
 <Badge variant="outline" className="h-10 w-10 p-0 flex items-center justify-center rounded-2xl border-primary/20 bg-primary/5 text-primary text-xs font-black shadow-sm transform group-hover:scale-105 transition-transform">
 {user.name?.charAt(0) || "U"}
 </Badge>
 )}
 </Link>
 </div>
 </header>

 {/* Page content */}
 <main className="flex-1 p-6 md:p-10 lg:p-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
 {children}
 </main>

 <footer className="py-8 px-10 border-t border-border/40 text-center">
 <p className="text-[10px] font-black text-[#4A5568] uppercase tracking-[0.2em] font-display opacity-100">
 © 2026 JusticeHub. All rights reserved.
 </p>
 </footer>
 </div>
 </div>
 );
}

// Mobile sidebar logic integration
import { usePathname as usePathnameHook } from "next/navigation";
import {
 LayoutDashboard, FileText, Calendar, Gavel, Users, BarChart3, ClipboardList, CreditCard, FilePlus, Layers
} from "lucide-react";

const mobileRoleMenus = {
 client: [
 { key: "navDashboard", href: "/dashboard/client", icon: LayoutDashboard },
 { key: "navRegister", href: "/dashboard/client/register-case", icon: FilePlus },
 { key: "navCases", href: "/dashboard/client/cases", icon: FileText },
 { key: "navSchedule", href: "/dashboard/client/schedule", icon: Calendar },
 ],
 judge: [
 { key: "navDashboard", href: "/dashboard/judge", icon: LayoutDashboard },
 { key: "navSearch", href: "/dashboard/judge/search", icon: Search },
 { key: "navDecisions", href: "/dashboard/judge/decisions", icon: Gavel },
 ],
 clerk: [
 { key: "navDashboard", href: "/dashboard/clerk", icon: ClipboardList },
 { key: "navPayments", href: "/dashboard/clerk/payments", icon: CreditCard },
 { key: "navFiles", href: "/dashboard/clerk/file-creation", icon: FilePlus },
 ],
 admin: [
 { key: "navDashboard", href: "/dashboard/admin", icon: LayoutDashboard },
 { key: "navUsers", href: "/dashboard/admin/users", icon: Users },
 { key: "navCases", href: "/dashboard/admin/cases", icon: FileText },
 { key: "navCategories", href: "/dashboard/admin/categories", icon: Layers },
 { key: "navReports", href: "/dashboard/admin/reports", icon: BarChart3 },
 ],
 defendant: [
 { key: "navDashboard", href: "/dashboard/defendant", icon: LayoutDashboard },
 { key: "navCases", href: "/dashboard/defendant/cases", icon: FileText },
 { key: "navSchedule", href: "/dashboard/defendant/schedule", icon: Calendar },
 ],
};

function MobileSidebarContent({ user, logout, onClose }) {
 const { t } = useLanguage();
 const pathname = usePathnameHook();
 
 const roleMap = {
 'CITIZEN': 'client',
 'DEFENDANT': 'defendant',
 'LAWYER': 'client',
 'JUDGE': 'judge',
 'CLERK': 'clerk',
 'ADMIN': 'admin',
 'REGISTRAR': 'clerk'
 };
 
 const normalizedRole = roleMap[user.role?.toUpperCase()] || user.role?.toLowerCase() || "client";
 const menuItems = (mobileRoleMenus[normalizedRole] || []).map(item => ({
 ...item,
 label: t(item.key)
 }));
 const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

 return (
 <div className="flex flex-col h-full bg-[#0f172a] relative overflow-hidden">
 {/* Background Decorative Mesh */}
 <div className="absolute top-0 right-0 w-full h-[50%] bg-primary/10 rounded-full blur-[80px] -z-10 pointer-events-none opacity-50"></div>
 
 <div className="absolute top-6 right-6 z-50 md:hidden">
 <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white hover:bg-muted/30 rounded-xl transition-all" onClick={onClose}>
 <X className="h-6 w-6" />
 </Button>
 </div>
 
 <SidebarContent
 user={user}
 logout={logout}
 collapsed={false}
 roleLabel={roleLabel}
 menuItems={menuItems}
 pathname={pathname}
 onLinkClick={onClose}
 menuRole={normalizedRole}
 />
 </div>
 );
}
