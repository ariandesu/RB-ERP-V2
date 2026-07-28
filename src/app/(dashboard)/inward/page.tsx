import React from 'react';
import { redirect } from 'next/navigation';
import { getCachedProfile } from '@/lib/db/profile';
import { getInwardShipmentsAction } from '@/app/actions/inward-actions';
import { getMaterialsAction } from '@/app/actions/material-actions';
import InwardClient from '@/components/inward-client';
import { UserProfile, InwardShipment, Material } from '@/types';

export const metadata = {
  title: 'Goods Inward - Rosebally ERP',
  description: 'Log supplier fabric roll shipments, record dye lot batches, and manage incoming material inventory.',
};

export default async function InwardPage() {
  const { user, profile } = await getCachedProfile();

  if (!user) {
    redirect('/login');
  }

  if (!profile || profile.status === 'inactive') {
    redirect('/login?error=account_disabled');
  }

  if (!profile.goods_inward_access) {
    redirect('/?error=unauthorized_module');
  }

  let initialShipments: InwardShipment[] = [];
  let initialMaterials: Material[] = [];

  try {
    // Run both fetches in parallel
    const [fetchedShipments, fetchedMaterials] = await Promise.all([
      getInwardShipmentsAction().catch(err => {
        console.error('Error fetching goods inward history in server component:', err);
        return [] as InwardShipment[];
      }),
      getMaterialsAction().catch(err => {
        console.error('Error fetching materials master in server component:', err);
        return [] as Material[];
      }),
    ]);
    initialShipments = fetchedShipments;
    initialMaterials = fetchedMaterials;
  } catch (error) {
    console.error('Unified inward page data loading error:', error);
  }

  return (
    <InwardClient
      initialShipments={initialShipments}
      materials={initialMaterials}
      profile={profile as UserProfile}
    />
  );
}
