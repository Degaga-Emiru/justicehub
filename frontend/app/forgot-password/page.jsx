"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthContainer } from "@/components/auth/auth-container";

export default function ForgotPasswordPage() {
    return (
        <AuthContainer>
            <AuthForm type="forgot-password" />
        </AuthContainer>
    );
}
