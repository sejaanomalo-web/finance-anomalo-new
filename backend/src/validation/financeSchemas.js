import { z } from 'zod';

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalText = z.string().trim().max(5000).optional().nullable();

const statusSchema = z
  .enum(['pending', 'paid', 'overdue', 'Pendente', 'Pago', 'Realizado', 'Em Atraso'])
  .optional();

const baseReceivableSchema = z.object({
  orgId: uuid,
  clientId: uuid.optional().nullable(),
  description: z.string().trim().min(1).max(255),
  amount: z.coerce.number().finite().nonnegative(),
  dueDate: isoDate,
  expectedDate: isoDate.optional().nullable(),
  issueDate: isoDate.optional().nullable(),
  externalReference: z.string().trim().max(150).optional().nullable(),
  paymentMethod: z.string().trim().max(100).optional().nullable(),
  categoryId: uuid.optional().nullable(),
  platformId: uuid.optional().nullable(),
  notes: optionalText,
  status: statusSchema,
});

const basePayableSchema = z.object({
  orgId: uuid,
  description: z.string().trim().min(1).max(255),
  amount: z.coerce.number().finite().nonnegative(),
  dueDate: isoDate,
  issueDate: isoDate.optional().nullable(),
  supplierName: z.string().trim().max(255).optional().nullable(),
  paymentMethod: z.string().trim().max(100).optional().nullable(),
  categoryId: uuid.optional().nullable(),
  platformId: uuid.optional().nullable(),
  notes: optionalText,
  status: statusSchema,
});

export const listQuerySchema = z.object({
  orgId: uuid,
  status: z.string().optional(),
  categoryId: uuid.optional(),
  paymentMethod: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).max(100000).optional(),
});

export const receivableCreateSchema = baseReceivableSchema;

export const receivableUpdateSchema = baseReceivableSchema.partial().extend({
  orgId: uuid,
});

export const receivableDeleteSchema = z.object({
  orgId: uuid,
});

export const payableCreateSchema = basePayableSchema;

export const payableUpdateSchema = basePayableSchema.partial().extend({
  orgId: uuid,
});

export const payableDeleteSchema = z.object({
  orgId: uuid,
});

export const cashFlowQuerySchema = z.object({
  orgId: uuid,
  startDate: isoDate,
  endDate: isoDate,
});

export const topClientsQuerySchema = z.object({
  orgId: uuid,
  startDate: isoDate,
  endDate: isoDate,
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export function parseWithSchema(schema, input) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    return { success: false, details };
  }

  return { success: true, data: parsed.data };
}
