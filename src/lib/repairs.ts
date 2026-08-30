import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";

export type RepairStatus =
  | "RECEPCION"
  | "DIAGNOSTICO"
  | "COTIZACION"
  | "APROBACION"
  | "REPARACION"
  | "PRUEBAS"
  | "READY";

export type RepairPriority = "NORMAL" | "ALTA" | "URGENTE";

export const REPAIR_FLOW: RepairStatus[] = [
  "RECEPCION",
  "DIAGNOSTICO",
  "COTIZACION",
  "APROBACION",
  "REPARACION",
  "PRUEBAS",
  "READY",
];

export const STATUS_LABEL: Record<RepairStatus, string> = {
  RECEPCION: "Recepción",
  DIAGNOSTICO: "Diagnóstico",
  COTIZACION: "Cotización",
  APROBACION: "Aprobación",
  REPARACION: "Reparación",
  PRUEBAS: "Pruebas",
  READY: "Lista para entrega",
};

export const STATUS_HINT: Record<RepairStatus, string> = {
  RECEPCION: "Equipo recibido y registrado en recepción.",
  DIAGNOSTICO: "El técnico revisa el equipo y determina la falla.",
  COTIZACION: "Se define el costo de la reparación.",
  APROBACION: "Esperando que el cliente apruebe la cotización.",
  REPARACION: "Trabajo técnico en curso.",
  PRUEBAS: "Verificación de calidad antes de entregar.",
  READY: "Lista para que el cliente la retire.",
};

export const STATUS_CLASS: Record<RepairStatus, string> = {
  RECEPCION: "bg-muted text-muted-foreground",
  DIAGNOSTICO: "bg-info/12 text-info",
  COTIZACION: "bg-warning/15 text-warning-foreground",
  APROBACION: "bg-accent/15 text-accent-foreground",
  REPARACION: "bg-primary/12 text-primary",
  PRUEBAS: "bg-info/12 text-info",
  READY: "bg-success/12 text-success",
};

/** Permiso necesario para mover una orden HACIA cada estado. */
export const STATUS_PERMISSION: Record<RepairStatus, string> = {
  RECEPCION: "repairs.change_status",
  DIAGNOSTICO: "diagnostics.create",
  COTIZACION: "quotes.create",
  APROBACION: "quotes.approve",
  REPARACION: "repairs.change_status",
  PRUEBAS: "repairs.change_status",
  READY: "repairs.change_status",
};

export const PRIORITY_LABEL: Record<RepairPriority, string> = {
  NORMAL: "Normal",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export function nextStatus(status: RepairStatus): RepairStatus | null {
  const i = REPAIR_FLOW.indexOf(status);
  return i >= 0 && i < REPAIR_FLOW.length - 1 ? (REPAIR_FLOW[i + 1] as RepairStatus) : null;
}

export function prevStatus(status: RepairStatus): RepairStatus | null {
  const i = REPAIR_FLOW.indexOf(status);
  return i > 0 ? (REPAIR_FLOW[i - 1] as RepairStatus) : null;
}

export function canMoveTo(permissions: string[], status: RepairStatus) {
  return permissions.includes(STATUS_PERMISSION[status]);
}

export type CustomerLite = { id: string; full_name: string; phone: string | null };
export type DeviceLite = { id: string; brand: string; model: string; imei: string | null };

export type RepairOrder = {
  id: string;
  folio: number;
  public_code: string;
  status: RepairStatus;
  priority: RepairPriority;
  reported_issue: string;
  diagnosis: string | null;
  work_notes: string | null;
  quoted_amount: number | null;
  approved_at: string | null;
  promised_at: string | null;
  ready_at: string | null;
  created_at: string;
  customer: CustomerLite | null;
  device: DeviceLite | null;
};

export type StatusHistoryRow = {
  id: string;
  from_status: RepairStatus | null;
  to_status: RepairStatus;
  note: string | null;
  created_at: string;
};

const ORDER_SELECT = `
  id, folio, public_code, status, priority, reported_issue, diagnosis, work_notes,
  quoted_amount, approved_at, promised_at, ready_at, created_at,
  customer:customers ( id, full_name, phone ),
  device:devices ( id, brand, model, imei )
`;

export function useRepairOrders(tenantId: string) {
  return useQuery({
    queryKey: ["repair-orders", tenantId],
    queryFn: async (): Promise<RepairOrder[]> => {
      const { data, error } = await supabase
        .from("repair_orders")
        .select(ORDER_SELECT)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RepairOrder[];
    },
  });
}

export function useRepairOrder(tenantId: string, orderId: string) {
  return useQuery({
    queryKey: ["repair-order", orderId],
    queryFn: async (): Promise<{ order: RepairOrder; history: StatusHistoryRow[] }> => {
      const { data, error } = await supabase
        .from("repair_orders")
        .select(ORDER_SELECT)
        .eq("tenant_id", tenantId)
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Orden no encontrada");

      const { data: history, error: histError } = await supabase
        .from("repair_status_history")
        .select("id, from_status, to_status, note, created_at")
        .eq("repair_order_id", orderId)
        .order("created_at", { ascending: false });
      if (histError) throw histError;

      return {
        order: data as unknown as RepairOrder,
        history: (history ?? []) as unknown as StatusHistoryRow[],
      };
    },
  });
}

export type NewOrderInput = {
  tenantId: string;
  branchId: string | null;
  customerName: string;
  customerPhone: string;
  brand: string;
  model: string;
  imei: string;
  unlockCode: string;
  reportedIssue: string;
  priority: RepairPriority;
};

export function useCreateRepairOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewOrderInput) => {
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .insert({
          tenant_id: input.tenantId,
          branch_id: input.branchId,
          full_name: input.customerName.trim(),
          phone: input.customerPhone.trim() || null,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      const { data: device, error: dErr } = await supabase
        .from("devices")
        .insert({
          tenant_id: input.tenantId,
          customer_id: customer.id,
          brand: input.brand.trim(),
          model: input.model.trim(),
          imei: input.imei.trim() || null,
          unlock_code: input.unlockCode.trim() || null,
        })
        .select("id")
        .single();
      if (dErr) throw dErr;

      const { data: order, error: oErr } = await supabase
        .from("repair_orders")
        .insert({
          tenant_id: input.tenantId,
          branch_id: input.branchId,
          customer_id: customer.id,
          device_id: device.id,
          reported_issue: input.reportedIssue.trim(),
          priority: input.priority,
          folio: 0,
          public_code: "",
        })
        .select("id, folio")
        .single();
      if (oErr) throw oErr;
      return order;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["repair-orders"] });
    },
  });
}

export function useUpdateRepairOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"repair_orders">) => {
      const { error } = await supabase.from("repair_orders").update(patch).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["repair-order", orderId] });
      void qc.invalidateQueries({ queryKey: ["repair-orders"] });
    },
  });
}
