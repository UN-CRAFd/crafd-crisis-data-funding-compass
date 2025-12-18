import MethodologyPage from '@/components/MethodologyPage';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Methodology() {
    return (
        <MethodologyPage />
    );
}
