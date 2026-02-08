// Re-export Prisma Client
export { PrismaClient } from "@prisma/client";

// Re-export all types from Prisma
export type {
  Role,
  User,
  Product,
  Inventory,
  Vendor,
  Shipment,
  ShipmentItem,
  Customer,
  Order,
  OrderItem,
  Currency,
  Account,
  Transaction,
} from "@prisma/client";

// Re-export enums
export {
  ShipmentStatus,
  AnomalyStatus,
  OrderStatus,
  OrderSource,
  TransactionType,
} from "@prisma/client";

// Singleton pattern for Prisma Client
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
