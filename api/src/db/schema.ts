import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const pizzaOrders = pgTable("pizza_orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  amount: text("amount").notNull(),
  assetChain: text("asset_chain").notNull().default("ETH"),
  assetSymbol: text("asset_symbol").notNull().default("USDC"),
  status: text("status").notNull().default("CREATED"),
  checkoutSessionId: text("checkout_session_id"),
  depositAddress: text("deposit_address"),
  paymentId: text("payment_id"),
  paidAt: timestamp("paid_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});
