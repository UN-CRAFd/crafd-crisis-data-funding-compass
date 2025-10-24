import { GoogleAnalytics } from '@next/third-parties/google';

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
    // Only track analytics in production, not in preview/dev deployments
    const isProduction = process.env.VERCEL_ENV === 'production';

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
            {isProduction && <GoogleAnalytics gaId="G-GECPTVLE68" />}

        </html>
    )
}
