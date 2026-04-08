import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
            <AuthForm type="signup" />
        </div>
    );
}
