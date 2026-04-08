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
    Globe
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
        { key: "navSchedule", href: "/dashboard/client/schedule", icon: Calendar },
        // { key: "Documents", href: "/dashboard/client/documents", icon: Upload }, // Missing key
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
};


export function Sidebar({ className }) {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const [collapsed, setCollapsed] = useState(false);
    const { t } = useLanguage();

    if (!user) return null;

    // Map backend roles to sidebar menus
    const roleMap = {
        'CITIZEN': 'client',
        'DEFENDANT': 'client',
        'LAWYER': 'client',
        'JUDGE': 'judge',
        'CLERK': 'clerk',
        'ADMIN': 'admin'
    };
    
    // Fallback to lowercased role if mapping is missing
    const normalizedRole = roleMap[user.role?.toUpperCase()] || user.role?.toLowerCase() || "client";

    // Map keys to labels using 't'
    const menuItems = (menuKeys[normalizedRole] || []).map(item => ({
        ...item,
        label: t(item.key)
    }));

    const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 hidden md:flex flex-col",
                collapsed ? "w-[68px]" : "w-64",
                className
            )}
        >
            <SidebarContent
                user={user}
                logout={logout}
                collapsed={collapsed}
                roleLabel={roleLabel}
                menuItems={menuItems}
                pathname={pathname}
                menuRole={normalizedRole}
            />

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-sidebar-background border border-sidebar-border rounded-full flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors z-50 cursor-pointer"
            >
                {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
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
        <>
            {/* Logo */}
            <div className={`flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0 ${collapsed ? "justify-center" : ""}`}>
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary/20 shrink-0">
                    <Scale className="h-5 w-5 text-sidebar-primary" />
                </div>
                {!collapsed && (
                    <div className="animate-fade-in">
                        <h1 className="text-base font-bold text-white tracking-tight">JusticeHub</h1>
                        <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">{roleLabel} Portal</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onLinkClick}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                isActive
                                    ? "bg-sidebar-primary/20 text-sidebar-primary"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80")} />
                            {!collapsed && <span className="animate-fade-in">{item.label}</span>}
                            {isActive && !collapsed && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <Separator className="bg-sidebar-border" />

            {/* User section */}
            <div className="p-3 shrink-0">
                <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg", collapsed ? "justify-center" : "")}>
                    <Avatar className="h-8 w-8 border-2 border-sidebar-primary/30">
                        <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-bold">
                            {user.avatar}
                        </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                        <div className="flex-1 min-w-0 animate-fade-in">
                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                            <p className="text-[11px] text-sidebar-foreground/50 truncate">{user.email}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-sidebar-border shrink-0 space-y-2">
                <Link
                    href={`/dashboard/${menuRole}/settings`}
                    className={cn(
                        "flex items-center w-full p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors",
                        collapsed && "justify-center"
                    )}
                    onClick={onLinkClick}
                >
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="ml-3 truncate font-medium text-sm">{t("settingsTitle")}</span>}
                </Link>

                {/* Language Switcher */}
                <Button
                    variant="ghost"
                    className={cn("w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50", collapsed && "justify-center px-2")}
                    onClick={toggleLanguage}
                >
                    <Globe className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="ml-3 truncate">{language === 'en' ? 'Amharic' : 'English'}</span>}
                </Button>

                <Button
                    variant="ghost"
                    className={cn("w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50", collapsed && "justify-center px-2")}
                    onClick={() => {
                        logout();
                        window.location.href = "/";
                    }}
                >
                    <LogOut className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="ml-3 truncate">{t("logout")}</span>}
                </Button>
            </div>
        </>
    );
}
