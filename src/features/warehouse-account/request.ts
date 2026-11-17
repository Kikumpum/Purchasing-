import { z } from "zod";

export const warehouseRequestSchema = z.object({
  name: z.string().trim().min(2).max(120).refine((value) => !/\p{Cc}/u.test(value)),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});

export type WarehouseAccountRequestState =
  | { status: "idle" | "sent" }
  | { status: "invalid" | "unavailable" | "limited"; name: string; email: string };
