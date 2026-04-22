"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    LayoutDashboard,
    FileText,
    FolderOpen,
    Calendar,
    Upload,
    Search,
    Gavel,
    Settings,
    Users,
    BarChart3,
    ClipboardList,
    CreditCard,
    FilePlus,
    Scale,
    LogOut,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Globe,
    Bell
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";

// Moved roleMenus inside the component or a function to access 't'
// Alternatively, keep keys here and translate in render.
const menuKeys = {
    client: [
        { key: "navDashboard", href: "/dashboard/client", icon: LayoutDashboard },
        { key: "navRegister", href: "/dashboard/client/register-case", icon: FilePlus },
        { key: "navCases", href: "/dashboard/client/cases", icon: FileText },
        { key: "navDocuments", href: "/dashboard/client/documents", icon: FolderOpen },
        { key: "navSchedule", href: "/dashboard/client/schedule", icon: Calendar },
        { key: "navNotifications", href: "/dashboard/client/notifications", icon: Bell },
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
        { key: "navDashboard", href: "/dashboard/admin/overview", icon: LayoutDashboard },
        { key: "navUsers", href: "/dashboard/admin", icon: Users },
        { key: "navCases", href: "/dashboard/admin/cases", icon: FileText },
        { key: "navAuditLogs", href: "/dashboard/admin/audit-logs", icon: ClipboardList },
        { key: "navReports", href: "/dashboard/admin/reports", icon: BarChart3 },
    ],
    registrar: [
        { key: "navDashboard", href: "/dashboard/registrar", icon: LayoutDashboard },
        { key: "navCases", href: "/dashboard/registrar/cases", icon: FileText },
        { key: "navPayments", href: "/dashboard/registrar/payments", icon: CreditCard },
    ],
    defendant: [
        { key: "navDashboard", href: "/dashboard/defendant", icon: LayoutDashboard },
        { key: "navCases", href: "/dashboard/defendant/cases", icon: FileText },
        { key: "navDocuments", href: "/dashboard/defendant/documents", icon: FolderOpen },
        { key: "navSchedule", href: "/dashboard/defendant/schedule", icon: Calendar },
        { key: "navNotifications", href: "/dashboard/defendant/notifications", icon: Bell },
    ],
};


export function Sidebar({ className }) {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);
    const { t } = useLanguage();
    const [isHovered, setIsHovered] = useState(false);

    if (!user) return null;

    // Map backend roles to sidebar menus
    const roleMap = {
        'CITIZEN': 'client',
        'DEFENDANT': 'defendant',
        'LAWYER': 'client',
        'JUDGE': 'judge',
        'CLERK': 'clerk',
        'ADMIN': 'admin',
        'REGISTRAR': 'clerk'
    };
    // Differentiate settings paths by role
    const settingsRole = roleMap[user.role?.toUpperCase()] || user.role?.toLowerCase() || "client";
    
    const normalizedRole = roleMap[user.role?.toUpperCase()] || user.role?.toLowerCase() || "client";
    const menuItems = (menuKeys[normalizedRole] || []).map(item => ({
        ...item,
        label: t(item.key)
    }));
    const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    return (
        <aside
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "fixed left-0 top-0 z-40 h-screen transition-all duration-500 hidden md:flex flex-col bg-[#0f172a] text-white border-r border-white/5 shadow-2xl overflow-hidden",
                collapsed ? "w-[80px]" : "w-72",
                className
            )}
        >
            {/* Background Decorative Mesh */}
            <div className="absolute top-0 right-0 w-full h-[50%] bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none opacity-50"></div>

            <SidebarContent
                user={user}
                logout={logout}
                collapsed={collapsed}
                roleLabel={roleLabel}
                menuItems={menuItems}
                pathname={pathname}
                menuRole={settingsRole || normalizedRole}
            />

            {/* Collapse toggle - Enhanced */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className={cn(
                    "absolute -right-3 top-24 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 z-50 cursor-pointer transition-all duration-300 hover:scale-110",
                    isHovered ? "opacity-100" : "opacity-0"
                )}
            >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
        </aside>
    );
}

export function SidebarContent({ user, logout, collapsed, roleLabel, menuItems, pathname, onLinkClick, menuRole }) {
    const { t, language, setLanguage } = useLanguage();

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'am' : 'en');
    };

    return (
        <div className="flex flex-col h-full relative z-10">
            {/* Logo Section */}
            <div className={cn(
                "flex items-center gap-4 px-6 h-24 shrink-0 transition-all duration-300",
                collapsed ? "justify-center px-2" : ""
            )}>
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20 shrink-0 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                    <Scale className="h-6 w-6 text-white" />
                </div>
                {!collapsed && (
                    <div className="animate-in fade-in slide-in-from-left-2 duration-500">
                        <h1 className="text-xl font-black font-display tracking-tight text-white leading-tight">JusticeHub</h1>
                        <p className="text-[10px] font-black text-primary/80 uppercase tracking-[0.2em]">{roleLabel} Portal</p>
                    </div>
                )}
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto no-scrollbar">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onLinkClick}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 relative group",
                                isActive
                                    ? "bg-gradient-to-r from-primary/20 to-transparent text-primary"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {/* Active Indicator Bar */}
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-gradient-to-b from-primary to-blue-600 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                            )}
                            
                            <Icon className={cn(
                                "h-5 w-5 shrink-0 transition-all duration-300", 
                                isActive ? "text-primary scale-110" : "text-slate-500 group-hover:text-white group-hover:scale-110"
                            )} />
                            
                            {!collapsed && (
                                <span className={cn(
                                    "truncate font-display tracking-wide animate-in fade-in duration-500",
                                    isActive ? "font-black" : "font-medium"
                                )}>
                                    {item.label}
                                </span>
                            )}

                            {isActive && !collapsed && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-6 py-4">
                <Separator className="bg-white/5 px-4" />
            </div>

            {/* User Profile Section */}
            <div className="px-4 py-2 shrink-0">
                <div className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-3xl bg-white/5 border border-white/5 transition-all duration-300 hover:bg-white/10",
                    collapsed ? "justify-center px-2" : ""
                )}>
                    <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-lg shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-blue-700 text-white text-xs font-black">
                            {user.first_name?.charAt(0) || user.full_name?.charAt(0) || user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                        <div className="flex-1 min-w-0 animate-in fade-in duration-500">
                            <p className="text-sm font-black text-white truncate font-display">{user.full_name || user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim()}</p>
                            <p className="text-[11px] text-slate-400 truncate tracking-tight">{user.email}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Actions Section */}
            <div className="p-4 pt-4 space-y-1 shrink-0">
                <Link
                    href={`/dashboard/${menuRole}/settings`}
                    className={cn(
                        "flex items-center w-full p-3 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300 group",
                        collapsed && "justify-center"
                    )}
                    onClick={onLinkClick}
                >
                    <Settings className="h-4 w-4 shrink-0 group-hover:rotate-45 transition-transform duration-500" />
                    {!collapsed && <span className="ml-3 truncate font-bold text-xs uppercase tracking-[0.1em] font-display">{t("settingsTitle")}</span>}
                </Link>

                <Button
                    variant="ghost"
                    className={cn("w-full justify-start text-slate-400 hover:text-white hover:bg-white/5 px-4", collapsed && "justify-center")}
                    onClick={toggleLanguage}
                >
                    <Globe className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="ml-3 truncate font-bold text-xs uppercase tracking-[0.1em] font-display">{language === 'en' ? 'Amharic' : 'English'}</span>}
                </Button>

                <Button
                    variant="ghost"
                    className={cn("w-full justify-start text-rose-400 hover:text-rose-100 hover:bg-rose-500/10 px-4", collapsed && "justify-center")}
                    onClick={() => {
                        logout();
                        window.location.href = "/";
                    }}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="ml-3 truncate font-bold text-xs uppercase tracking-[0.1em] font-display">{t("logout")}</span>}
                </Button>
            </div>
        </div>
    );
}
