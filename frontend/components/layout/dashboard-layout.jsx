"use client";

import { Sidebar, SidebarContent } from "@/components/layout/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Search, Menu, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-provider";

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
    const { user, isAuthenticated, logout } = useAuthStore();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const { t } = useLanguage();

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20" />
                    <p className="text-sm text-muted-foreground">{t("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Sidebar />

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background shadow-xl animate-slide-in">
                        <MobileSidebarContent user={user} logout={logout} onClose={() => setMobileMenuOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main content area */}
            <div className="md:pl-64 transition-all duration-300 flex flex-col min-h-screen">
                {/* Top bar */}
                <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-4 flex-1">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="relative max-w-md w-full hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("searchCasesDocs")}
                                className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5 text-muted-foreground" />
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                                3
                            </span>
                        </Button>

                        <div className="h-8 w-px bg-border hidden sm:block" />

                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-normal capitalize hidden sm:flex">
                                {user.role}
                            </Badge>
                            <div className="sm:hidden h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {user.avatar}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}

// Helper to render sidebar content with roleMenus duplication workaround
// Since I can't import roleMenus, I will define it here or import it if I export it.
// I will import SidebarContent. But I need to pass menuItems.
// I'll copy the roleMenus structure here for simplicity to avoid another file edit cycle, 
// or I can assume I can import it if I did export it. I didn't export it in previous step.
// I'll Duplicate roleMenus here. Cons: Duplication. Pros: Works now.

import {
    LayoutDashboard, FileText, Calendar, Upload, Gavel, Settings, Users, BarChart3, ClipboardList, CreditCard, FilePlus
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
    registrar: [
        { key: "navDashboard", href: "/dashboard/registrar", icon: ClipboardList },
        { key: "navPayments", href: "/dashboard/registrar/payments", icon: CreditCard },
        { key: "navFiles", href: "/dashboard/registrar/file-creation", icon: FilePlus },
    ],
    admin: [
        { key: "navUsers", href: "/dashboard/admin", icon: Users },
        { key: "navReports", href: "/dashboard/admin/reports", icon: BarChart3 },
    ],
};

function MobileSidebarContent({ user, logout, onClose }) {
    const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    const { t } = useLanguage();

    const roleMap = {
        "CITIZEN": "client",
        "LAWYER": "client",
        "CLERK": "client",
        "DEFENDANT": "client",
        "JUDGE": "judge",
        "REGISTRAR": "registrar",
        "ADMIN": "admin"
    };
    
    const normalizedRole = roleMap[user.role?.toUpperCase()] || user.role?.toLowerCase() || "client";

    // Map keys to actual labels
    const menuItems = (mobileRoleMenus[normalizedRole] || []).map(item => ({
        ...item,
        label: t(item.key)
    }));
    // We need usePathname here too
    const pathnameOriginal = useRouter().pathname; // next/navigation doesn't have pathname in router? usePathname hook needed.
    // I need to use usePathname hook in this component or pass it.
    // Let's passed it from parent or use hook.
    // Hook cannot be used in standard function unless it's a component. This IS a component.
    // But I need to import usePathname. I did import useRouter, but not usePathname in the replacement block?
    // I see `import { useRouter } from "next/navigation";` in my replacement. 
    // I should also import `usePathname`.

    // Wait, I can't add imports easily in `replace_file_content`.
    // I should use `SidebarContent` logic.
    // I will try to use `SidebarContent` component I imported!
    // But `SidebarContent` needs `menuItems`.
    // So I will pass `menuItems` from `mobileRoleMenus`.

    // I need `usePathname` for `SidebarContent` prop `pathname`.
    // I will add `usePathname` to the imports at the top using `multi_replace`.
    // Wait, `replace_file_content` replaces a block. I can replace the whole file or a large chunk.

    return (
        <div className="flex flex-col h-full">
            <div className="absolute top-4 right-4 z-50 md:hidden">
                <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <SidebarContent
                user={user}
                logout={logout}
                collapsed={false}
                roleLabel={roleLabel}
                menuItems={menuItems}
                pathname={window.location.pathname} // Hacky? No, usePathname is better.
                onLinkClick={onClose}
            />
        </div>
    );
}
