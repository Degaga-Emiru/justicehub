"use client";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthContainer } from "@/components/auth/auth-container";

export default function SignupPage() {
    return (
        <AuthContainer>
            <AuthForm type="signup" />
        </AuthContainer>
    );
}
