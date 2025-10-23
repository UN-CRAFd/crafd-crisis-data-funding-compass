import { GoogleAnalytics } from '@next/third-parties/google'

import ErrorBoundary from "@/components/ErrorBoundary";
import type { Metadata } from "next";
// import { Suspense } from "react";
import "./globals.css";
// Onboarding tour (client-side) - currently deactivated
// import OnboardingTour from '@/components/OnboardingTour';


export const metadata: Metadata = {
    title: "Crisis Data Funding Compass",
    description: "Dashboard for exploring crisis data funding and provider organizations",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="font-sans antialiased">
                <ErrorBoundary>
                    {children}
                    {/* <Suspense fallback={null}>
                        <OnboardingTour />
                    </Suspense> */}
                </ErrorBoundary>


            </body>
            <GoogleAnalytics gaId="G-2TYZQHBWML" />

        </html>
    )
}
