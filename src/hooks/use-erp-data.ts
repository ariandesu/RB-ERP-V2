"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMaterialsAction,
  createMaterialAction,
  updateMaterialAction,
  deleteMaterialAction,
} from "@/app/actions/material-actions";
import {
  getInwardShipmentsAction,
  createInwardShipmentAction,
  deleteInwardShipmentAction,
} from "@/app/actions/inward-actions";
import {
  getOutwardShipmentsAction,
  createOutwardShipmentAction,
  deleteOutwardShipmentAction,
} from "@/app/actions/outward-actions";
import {
  getPurchaseOrdersAction,
  createPurchaseOrderAction,
  updatePurchaseOrderStatusAction,
  deletePurchaseOrderAction,
} from "@/app/actions/po-actions";
import type {
  Material,
  InwardShipment,
  OutwardShipment,
  PurchaseOrder,
} from "@/types";

// ============================================
// Materials Hooks
// ============================================
export function useMaterials(initialData: Material[]) {
  return useQuery({
    queryKey: ["materials"],
    queryFn: () => getMaterialsAction(),
    initialData,
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMaterialAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateMaterialAction>[1] }) =>
      updateMaterialAction(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMaterialAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

// ============================================
// Inward Hooks
// ============================================
export function useInwardShipments(initialData: InwardShipment[]) {
  return useQuery({
    queryKey: ["inward"],
    queryFn: () => getInwardShipmentsAction(),
    initialData,
  });
}

export function useCreateInward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createInwardShipmentAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inward"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export function useDeleteInward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteInwardShipmentAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inward"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

// ============================================
// Outward Hooks
// ============================================
export function useOutwardShipments(initialData: OutwardShipment[]) {
  return useQuery({
    queryKey: ["outward"],
    queryFn: () => getOutwardShipmentsAction(),
    initialData,
  });
}

export function useCreateOutward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOutwardShipmentAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outward"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

export function useDeleteOutward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteOutwardShipmentAction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outward"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });
}

// ============================================
// Purchase Order Hooks
// ============================================
export function usePurchaseOrders(initialData: PurchaseOrder[]) {
  return useQuery({
    queryKey: ["purchase-orders"],
    queryFn: () => getPurchaseOrdersAction(),
    initialData,
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPurchaseOrderAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useUpdatePOStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Parameters<typeof updatePurchaseOrderStatusAction>[1] }) =>
      updatePurchaseOrderStatusAction(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}

export function useDeletePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePurchaseOrderAction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-orders"] }),
  });
}
