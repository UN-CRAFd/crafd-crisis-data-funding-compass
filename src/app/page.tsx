import CrisisDataDashboardWrapper from '@/components/CrisisDataDashboardWrapper';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function Home() {
    async function logout() {
        'use server';
        (await cookies()).delete('site_auth');
        redirect('/login');
    }

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CrisisDataDashboardWrapper
                logoutButton={
                    <form action={logout}>
                        <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="bg-slate-50/50 border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </form>
                }
            />
        </Suspense>
    );
}
