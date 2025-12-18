import { GoogleAnalytics } from '@next/third-parties/google';

import ErrorBoundary from "@/components/ErrorBoundary";
import { TipsProvider } from "@/contexts/TipsContext";
import { GeneralContributionsProvider } from "@/contexts/GeneralContributionsContext";
import type { Metadata } from "next";
// import { Suspense } from "react";
import "./globals.css";
// Onboarding tour (client-side) - currently deactivated
// import OnboardingTour from '@/components/OnboardingTour';


export const metadata: Metadata = {
    title: "Crisis Data Funding Compass",
    description: "Dashboard for exploring crisis data funding and provider organizations",
    icons: {
        icon: "https://images.squarespace-cdn.com/content/v1/60df58f306c9b647835feb69/0ff64a86-21ab-4e14-82c8-17030f69be1f/favicon.ico?format=100w",
    },
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
                    <TipsProvider>
                        <GeneralContributionsProvider>
                            {children}
                            {/* <Suspense fallback={null}>
                                <OnboardingTour />
                            </Suspense> */}
                        </GeneralContributionsProvider>
                    </TipsProvider>
                </ErrorBoundary>


            </body>
            {isProduction && <GoogleAnalytics gaId="G-GECPTVLE68" />}

        </html>
    )
}
