import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AdminLayout({ children }) {
    return (
        <DashboardLayout>
            {children}
        </DashboardLayout>
    );
}
