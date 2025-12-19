import MethodologyPage from '@/components/MethodologyPage';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function Methodology() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <MethodologyPage />
        </Suspense>
    );
}
