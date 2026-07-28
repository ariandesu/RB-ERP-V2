import React from 'react';
import { redirect } from 'next/navigation';
import { getCachedProfile } from '@/lib/db/profile';
import SettingsClient from '@/components/settings-client';
import { UserProfile } from '@/types';

export const metadata = {
  title: 'ERP Global Settings - Rosebally ERP',
  description: 'Configure corporate print profiles, physical warehouse storage zones, low-stock threshold triggers, and API developer integrations.',
};

export default async function SettingsPage() {
  const { user, profile } = await getCachedProfile();

  if (!user) {
    redirect('/login');
  }

  if (!profile || profile.status === 'inactive') {
    redirect('/login?error=account_disabled');
  }

  if (!profile.settings_access) {
    redirect('/?error=unauthorized_module');
  }

  return (
    <SettingsClient
      profile={profile as UserProfile}
    />
  );
}
