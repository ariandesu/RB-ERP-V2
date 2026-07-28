import React from 'react';
import { redirect } from 'next/navigation';
import { getCachedProfile } from '@/lib/db/profile';
import { getPurchaseOrdersAction } from '@/app/actions/po-actions';
import { getMaterialsAction } from '@/app/actions/material-actions';
import PurchaseOrdersClient from '@/components/purchase-orders-client';
import { UserProfile, PurchaseOrder, Material } from '@/types';

export const metadata = {
  title: 'Purchase Orders - Rosebally ERP',
  description: 'Manage procurement schedules, draft supplier quotation requests, track order status transitions, and audit raw material balances.',
};

export default async function PurchaseOrdersPage() {
  const { user, profile } = await getCachedProfile();

  if (!user) {
    redirect('/login');
  }

  if (!profile || profile.status === 'inactive') {
    redirect('/login?error=account_disabled');
  }

  if (!profile.purchase_orders_access) {
    redirect('/?error=unauthorized_module');
  }

  let initialPOs: PurchaseOrder[] = [];
  let initialMaterials: Material[] = [];

  try {
    const [fetchedPOs, fetchedMaterials] = await Promise.all([
      getPurchaseOrdersAction().catch(err => {
        console.error('Error fetching purchase orders:', err);
        return [] as PurchaseOrder[];
      }),
      getMaterialsAction().catch(err => {
        console.error('Error fetching materials master:', err);
        return [] as Material[];
      }),
    ]);
    initialPOs = fetchedPOs;
    initialMaterials = fetchedMaterials;
  } catch (error) {
    console.error('Unified purchase orders page data loading error:', error);
  }

  return (
    <PurchaseOrdersClient
      initialPOs={initialPOs}
      materials={initialMaterials}
      profile={profile as UserProfile}
    />
  );
}
