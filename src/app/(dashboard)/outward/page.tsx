import React from 'react';
import { redirect } from 'next/navigation';
import { getCachedProfile } from '@/lib/db/profile';
import { getOutwardShipmentsAction } from '@/app/actions/outward-actions';
import { getMaterialsAction } from '@/app/actions/material-actions';
import OutwardClient from '@/components/outward-client';
import { UserProfile, OutwardShipment, Material } from '@/types';

export const metadata = {
  title: 'Goods Outward - Rosebally ERP',
  description: 'Log and dispatch raw material rolls and accessory variants, verify dye-lots, check safety stock limits, and manage shipment accounts.',
};

export default async function OutwardPage() {
  const { user, profile } = await getCachedProfile();

  if (!user) {
    redirect('/login');
  }

  if (!profile || profile.status === 'inactive') {
    redirect('/login?error=account_disabled');
  }

  if (!profile.goods_outward_access) {
    redirect('/?error=unauthorized_module');
  }

  let initialShipments: OutwardShipment[] = [];
  let initialMaterials: Material[] = [];

  try {
    const [fetchedShipments, fetchedMaterials] = await Promise.all([
      getOutwardShipmentsAction().catch(err => {
        console.error('Error fetching goods outward history:', err);
        return [] as OutwardShipment[];
      }),
      getMaterialsAction().catch(err => {
        console.error('Error fetching materials master:', err);
        return [] as Material[];
      }),
    ]);
    initialShipments = fetchedShipments;
    initialMaterials = fetchedMaterials;
  } catch (error) {
    console.error('Unified outward page data loading error:', error);
  }

  return (
    <OutwardClient
      initialShipments={initialShipments}
      materials={initialMaterials}
      profile={profile as UserProfile}
    />
  );
}
