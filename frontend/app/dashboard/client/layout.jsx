import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Chatbot } from "@/components/client/chatbot";

export default function ClientLayout({ children }) {
    return (
        <DashboardLayout>
            {children}
            <Chatbot />
        </DashboardLayout>
    );
}
