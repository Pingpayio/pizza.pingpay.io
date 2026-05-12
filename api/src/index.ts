import { eq } from "drizzle-orm";
import { createPlugin } from "every-plugin";
import { Effect } from "every-plugin/effect";
import { ORPCError } from "every-plugin/orpc";
import { z } from "every-plugin/zod";
import { contract } from "./contract";
import { loadMigrations } from "./db/load-migrations";
import { migrate } from "./db/migrator";
import { pizzaOrders } from "./db/schema";
import type { PluginsClient } from "./plugins-client.gen";
import { verifyAndParseWebhook } from "./services/pingpay-webhook";
import { createPingPayService } from "./services/pizza";

export interface AuthContext {
  userId: string;
  user: {
    id: string;
    role?: string;
    email?: string;
    name?: string;
  };
  organizationId?: string;
  reqHeaders?: Headers;
  getRawBody?: () => Promise<string>;
}

function generatePizzaOrderId(): string {
  return `po_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default createPlugin.withPlugins<PluginsClient>()({
  variables: z.object({}),

  secrets: z.object({
    API_DATABASE_URL: z.string().default("pglite:.bos/api/:memory:"),
    PINGPAY_API_URL: z.string().default("https://pay.pingpay.io/api"),
    PINGPAY_API_KEY: z.string().default(""),
    PINGPAY_WEBHOOK_SECRET: z.string().default(""),
    HOST_URL: z.string().default(""),
  }),

  context: z.object({
    userId: z.string().optional(),
    user: z
      .object({
        id: z.string(),
        role: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
      })
      .optional(),
    organizationId: z.string().optional(),
    reqHeaders: z.custom<Headers>().optional(),
    getRawBody: z.custom<() => Promise<string>>().optional(),
  }),

  contract,

  initialize: (config, plugins) =>
    Effect.promise(async () => {
      let driver;
      try {
        const { createDatabaseDriver } = await import("./db/index");
        driver = await createDatabaseDriver(config.secrets.API_DATABASE_URL);
      } catch (cause) {
        console.error("[API] FATAL: Database driver creation failed:", cause);
        throw cause;
      }

      try {
        const migrations = await loadMigrations();
        await migrate(driver.db, migrations);
        console.log("[API] Migrations applied");
      } catch (cause) {
        console.error("[API] FATAL: Migration failed:", cause);
        throw cause;
      }

      const { auth, ...restPlugins } = plugins;
      console.log("[API] Services Initialized");
      console.log("[API] Auth client available:", Boolean(auth));
      console.log("[API] Plugins available:", Object.keys(restPlugins).join(", ") || "none");

      let pizzaService;
      try {
        pizzaService = createPingPayService({
          apiUrl: config.secrets.PINGPAY_API_URL,
          apiKey: config.secrets.PINGPAY_API_KEY,
        });
      } catch (cause) {
        console.error("[API] FATAL: PingPay service creation failed:", cause);
        throw cause;
      }

      return {
        auth,
        plugins: restPlugins,
        db: driver.db,
        driver,
        pizzaService,
        webhookSecret: config.secrets.PINGPAY_WEBHOOK_SECRET,
        hostUrl: config.secrets.HOST_URL || process.env.BETTER_AUTH_URL || "",
      };
    }),

  shutdown: (services) =>
    Effect.promise(async () => {
      console.log("[API] Shutdown");
      try {
        await (services as any).driver?.close?.();
      } catch (cause) {
        console.error("[API] Shutdown error:", cause);
      }
    }),

  createRouter: (services, builder) => {
    const requireAuth = builder.middleware(async ({ context, next }) => {
      if (!context.user || !context.userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication required",
          data: {
            authType: "session",
            hint: "Sign in with NEAR, passkey, email, phone, or anonymous",
          },
        });
      }
      return next({
        context: {
          userId: context.userId,
          user: context.user,
          organizationId: context.organizationId,
          reqHeaders: context.reqHeaders,
          getRawBody: context.getRawBody,
        } as AuthContext,
      });
    });

    return {
      ping: builder.ping.handler(async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
      })),

      authHealth: builder.authHealth.use(requireAuth).handler(async () => ({
        status: "ok",
        emailConfigured: !!process.env.EMAIL_PROVIDER,
        smsConfigured: !!process.env.SMS_PROVIDER,
      })),

      createPizzaOrder: builder.createPizzaOrder
        .use(requireAuth)
        .handler(async ({ input, context }) => {
          const orderId = generatePizzaOrderId();
          const hostUrl =
            services.hostUrl ||
            new URL(
              context.reqHeaders?.get("x-forwarded-host")
                ? `${context.reqHeaders.get("x-forwarded-proto") || "http"}://${context.reqHeaders.get("x-forwarded-host")}`
                : context.reqHeaders?.get("host")
                  ? `${context.reqHeaders.get("x-forwarded-proto") || "http"}://${context.reqHeaders.get("host")}`
                  : "http://localhost:3000",
            ).origin;

          let pingpayResult: Awaited<
            ReturnType<typeof services.pizzaService.createCheckoutSession>
          >;
          try {
            pingpayResult = await services.pizzaService.createCheckoutSession({
              amount: input.amount,
              asset: { chain: "NEAR", symbol: "USDC" },
              metadata: { orderId, source: "pizza-demo", name: input.name },
            });
          } catch (error) {
            console.error("[API] PingPay createCheckoutSession failed:", error);
            if (error instanceof ORPCError) throw error;
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: error instanceof Error ? error.message : String(error),
            });
          }

          try {
            await services.db.insert(pizzaOrders).values({
              id: orderId,
              userId: context.userId,
              name: input.name,
              amount: input.amount,
              checkoutSessionId: pingpayResult.session.sessionId,
              status: "CREATED",
            });
          } catch (error) {
            console.error("[API] DB insert failed in createPizzaOrder:", error);
            throw new ORPCError("INTERNAL_SERVER_ERROR", {
              message: error instanceof Error ? error.message : "Failed to save order",
            });
          }

          const qrUrl = `${hostUrl}/pizza/${orderId}`;

          return { orderId, qrUrl };
        }),

      getPizzaOrder: builder.getPizzaOrder.handler(async ({ input, errors }) => {
        let order;
        try {
          [order] = await services.db
            .select()
            .from(pizzaOrders)
            .where(eq(pizzaOrders.id, input.orderId))
            .limit(1);
        } catch (error) {
          console.error("[API] DB select failed in getPizzaOrder:", error);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : "Database error loading order",
          });
        }

        if (!order) {
          throw errors.NOT_FOUND({
            message: "Order not found",
            data: { resource: "order", resourceId: input.orderId },
          });
        }

        let session = null;
        let config = {
          availableMethods: ["deposit"] as string[],
          suggestedAsset: null as unknown,
          tokens: [] as unknown[],
        };

        if (order.checkoutSessionId) {
          try {
            const sessionData = await services.pizzaService.getSession(order.checkoutSessionId);
            session = sessionData.session;
            config = sessionData.config || config;
          } catch (error) {
            console.error("[API] PingPay getSession failed:", error);
          }
        }

        return {
          order: {
            id: order.id,
            name: order.name,
            amount: order.amount,
            assetChain: order.assetChain,
            assetSymbol: order.assetSymbol,
            status: order.status,
            depositAddress: order.depositAddress || undefined,
            createdAt:
              order.createdAt instanceof Date
                ? order.createdAt.toISOString()
                : String(order.createdAt),
          },
          session,
          config,
        };
      }),

      quotePizzaPayment: builder.quotePizzaPayment.handler(async ({ input, errors }) => {
        let order;
        try {
          [order] = await services.db
            .select()
            .from(pizzaOrders)
            .where(eq(pizzaOrders.id, input.orderId))
            .limit(1);
        } catch (error) {
          console.error("[API] DB select failed in quotePizzaPayment:", error);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : "Database error loading order",
          });
        }

        if (!order) {
          throw errors.NOT_FOUND({
            message: "Order not found",
            data: { resource: "order", resourceId: input.orderId },
          });
        }

        if (!order.checkoutSessionId) {
          throw errors.BAD_REQUEST({
            message: "Order has no checkout session",
            data: { invalidFields: ["checkoutSessionId"] },
          });
        }

        let quoteResult: Awaited<ReturnType<typeof services.pizzaService.getQuote>>;
        try {
          quoteResult = await services.pizzaService.getQuote({
            sessionId: order.checkoutSessionId,
            payerAsset: {
              amount: order.amount,
              asset: { chain: input.payerAsset.chain, symbol: input.payerAsset.symbol },
            },
          });
        } catch (error) {
          console.error("[API] PingPay getQuote failed:", error);
          if (error instanceof ORPCError) throw error;
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        return {
          quote: quoteResult.quote,
          feeBreakdown: quoteResult.feeBreakdown,
        };
      }),

      preparePizzaPayment: builder.preparePizzaPayment.handler(async ({ input, errors }) => {
        let order;
        try {
          [order] = await services.db
            .select()
            .from(pizzaOrders)
            .where(eq(pizzaOrders.id, input.orderId))
            .limit(1);
        } catch (error) {
          console.error("[API] DB select failed in preparePizzaPayment:", error);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : "Database error loading order",
          });
        }

        if (!order) {
          throw errors.NOT_FOUND({
            message: "Order not found",
            data: { resource: "order", resourceId: input.orderId },
          });
        }

        if (!order.checkoutSessionId) {
          throw errors.BAD_REQUEST({
            message: "Order has no checkout session",
            data: { invalidFields: ["checkoutSessionId"] },
          });
        }

        if (order.depositAddress) {
          return {
            depositAddress: order.depositAddress,
            amountToDeposit: order.amount,
            amountToDepositFormatted: "",
          };
        }

        const idempotencyKey = `session:${order.checkoutSessionId}`;

        let prepareResult: Awaited<ReturnType<typeof services.pizzaService.preparePayment>>;
        try {
          prepareResult = await services.pizzaService.preparePayment({
            sessionId: order.checkoutSessionId,
            payerAsset: {
              amount: order.amount,
              asset: { chain: input.payerAsset.chain, symbol: input.payerAsset.symbol },
            },
            payer: { address: "PLACEHOLDER" },
            idempotencyKey,
            paymentMethod: "DEPOSIT",
          });
        } catch (error) {
          console.error("[API] PingPay preparePayment failed:", error);
          if (error instanceof ORPCError) throw error;
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        const depositAddress =
          prepareResult.depositAddress || prepareResult.payment?.depositAddress || "";
        const amountToDeposit = prepareResult.quote?.amountIn || order.amount;
        const amountToDepositFormatted = prepareResult.quote?.amountInFormatted || "";

        try {
          await services.db
            .update(pizzaOrders)
            .set({
              depositAddress,
              paymentId: prepareResult.payment?.paymentId,
              status: "PENDING",
            })
            .where(eq(pizzaOrders.id, input.orderId));
        } catch (error) {
          console.error("[API] DB update failed in preparePizzaPayment:", error);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : "Failed to save payment",
          });
        }

        return {
          depositAddress,
          amountToDeposit,
          amountToDepositFormatted,
          quote: prepareResult.quote,
          feeBreakdown: prepareResult.feeBreakdown,
          transfer: prepareResult.transfer,
        };
      }),

      notifyPizzaDeposit: builder.notifyPizzaDeposit.handler(async ({ input, errors }) => {
        let order;
        try {
          [order] = await services.db
            .select()
            .from(pizzaOrders)
            .where(eq(pizzaOrders.id, input.orderId))
            .limit(1);
        } catch (error) {
          console.error("[API] DB select failed in notifyPizzaDeposit:", error);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : "Database error loading order",
          });
        }

        if (!order) {
          throw errors.NOT_FOUND({
            message: "Order not found",
            data: { resource: "order", resourceId: input.orderId },
          });
        }

        if (!order.depositAddress) {
          throw errors.BAD_REQUEST({
            message: "No deposit address — prepare payment first",
            data: { invalidFields: ["depositAddress"] },
          });
        }

        let pingpayStatus;
        try {
          pingpayStatus = await services.pizzaService.getPaymentStatus(order.depositAddress);
        } catch (error) {
          console.error("[API] PingPay getPaymentStatus failed:", error);
          if (error instanceof ORPCError) throw error;
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        if (pingpayStatus.status === "SUCCESS" && order.status !== "PAID") {
          try {
            await services.db
              .update(pizzaOrders)
              .set({ status: "PAID", paidAt: new Date() })
              .where(eq(pizzaOrders.id, input.orderId));
          } catch (error) {
            console.error("[API] DB update failed in notifyPizzaDeposit:", error);
          }
          return { status: "PAID", updatedAt: new Date().toISOString() };
        }

        return {
          status: pingpayStatus.status || order.status,
          updatedAt: pingpayStatus.updatedAt,
        };
      }),

      subscribePizzaOrder: builder.subscribePizzaOrder.handler(async function* ({ input, errors }) {
        let order;
        try {
          [order] = await services.db
            .select()
            .from(pizzaOrders)
            .where(eq(pizzaOrders.id, input.orderId))
            .limit(1);
        } catch (error) {
          console.error("[API] DB select failed in subscribePizzaOrder:", error);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : "Database error loading order",
          });
        }

        if (!order?.depositAddress) {
          throw errors.BAD_REQUEST({
            message: "No deposit address for this order",
            data: { invalidFields: ["depositAddress"] },
          });
        }

        let stream: ReadableStream<Uint8Array>;
        try {
          stream = await services.pizzaService.streamPaymentStatus(order.depositAddress);
        } catch (error) {
          console.error("[API] streamPaymentStatus failed:", error);
          if (error instanceof ORPCError) throw error;
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : String(error),
          });
        }

        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) return;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                let event;
                try {
                  const raw = JSON.parse(line.slice(6));
                  event = raw.json || raw;
                } catch {
                  continue;
                }

                yield {
                  status: event.status,
                  updatedAt: event.updatedAt,
                };

                if (event.status === "SUCCESS") {
                  try {
                    await services.db
                      .update(pizzaOrders)
                      .set({ status: "PAID", paidAt: new Date() })
                      .where(eq(pizzaOrders.id, input.orderId));
                  } catch (error) {
                    console.error("[API] DB update failed in subscribePizzaOrder:", error);
                  }
                  return;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }),

      getPizzaOrderStatus: builder.getPizzaOrderStatus.handler(async ({ input, errors }) => {
        let order;
        try {
          [order] = await services.db
            .select()
            .from(pizzaOrders)
            .where(eq(pizzaOrders.id, input.orderId))
            .limit(1);
        } catch (error) {
          console.error("[API] DB select failed in getPizzaOrderStatus:", error);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: error instanceof Error ? error.message : "Database error loading order",
          });
        }

        if (!order) {
          throw errors.NOT_FOUND({
            message: "Order not found",
            data: { resource: "order", resourceId: input.orderId },
          });
        }

        if (order.status === "PAID") {
          return {
            status: order.status,
            updatedAt: order.paidAt instanceof Date ? order.paidAt.toISOString() : undefined,
          };
        }

        if (order.checkoutSessionId) {
          try {
            const sessionData = await services.pizzaService.getSession(order.checkoutSessionId);
            if (sessionData.session.status === "COMPLETED" && order.status !== "PAID") {
              try {
                await services.db
                  .update(pizzaOrders)
                  .set({ status: "PAID", paidAt: new Date() })
                  .where(eq(pizzaOrders.id, input.orderId));
              } catch (error) {
                console.error(
                  "[API] DB update failed in getPizzaOrderStatus (session COMPLETED):",
                  error,
                );
              }
              return { status: "PAID", updatedAt: new Date().toISOString() };
            }
            if (order.depositAddress) {
              try {
                const pingpayStatus = await services.pizzaService.getPaymentStatus(
                  order.depositAddress,
                );
                if (pingpayStatus.status === "SUCCESS" && order.status !== "PAID") {
                  try {
                    await services.db
                      .update(pizzaOrders)
                      .set({ status: "PAID", paidAt: new Date() })
                      .where(eq(pizzaOrders.id, input.orderId));
                  } catch (error) {
                    console.error(
                      "[API] DB update failed in getPizzaOrderStatus (pingpay SUCCESS):",
                      error,
                    );
                  }
                  return { status: "PAID", updatedAt: new Date().toISOString() };
                }
                return {
                  status: pingpayStatus.status || order.status,
                  updatedAt: pingpayStatus.updatedAt,
                };
              } catch (error) {
                console.error("[API] PingPay getPaymentStatus failed:", error);
              }
            }
          } catch (error) {
            console.error("[API] PingPay getSession failed:", error);
          }
        }

        return {
          status: order.status,
          updatedAt: order.paidAt instanceof Date ? order.paidAt.toISOString() : undefined,
        };
      }),

      pingpayWebhook: builder.pingpayWebhook.handler(async ({ input, context, errors }) => {
        const signature = context.reqHeaders?.get("x-ping-signature") || "";
        const timestamp = context.reqHeaders?.get("x-ping-timestamp") || "";
        const body = (await context.getRawBody?.()) ?? JSON.stringify(input as unknown);

        console.log("[PingPay Webhook] Processing webhook");

        let webhookResult: ReturnType<typeof verifyAndParseWebhook>;
        try {
          webhookResult = verifyAndParseWebhook(body, signature, timestamp, services.webhookSecret);
        } catch (error) {
          console.error("[PingPay Webhook] Verification failed:", error);
          throw errors.BAD_REQUEST({
            message: error instanceof Error ? error.message : "Webhook verification failed",
            data: {},
          });
        }

        const { eventType, orderId, sessionId } = webhookResult;

        let order: typeof pizzaOrders.$inferSelect | null = null;

        if (orderId) {
          try {
            const [found] = await services.db
              .select()
              .from(pizzaOrders)
              .where(eq(pizzaOrders.id, orderId))
              .limit(1);
            order = found ?? null;
          } catch (error) {
            console.error("[PingPay Webhook] DB select by orderId failed:", error);
          }
        }

        if (!order && sessionId) {
          try {
            const [found] = await services.db
              .select()
              .from(pizzaOrders)
              .where(eq(pizzaOrders.checkoutSessionId, sessionId))
              .limit(1);
            order = found ?? null;
          } catch (error) {
            console.error("[PingPay Webhook] DB select by sessionId failed:", error);
          }
        }

        if (!order) {
          console.warn("[PingPay Webhook] Order not found, acknowledging", { orderId, sessionId });
          return { received: true };
        }

        console.log("[PingPay Webhook] Order found", {
          orderId: order.id,
          currentStatus: order.status,
          eventType,
        });

        switch (eventType) {
          case "payment.pending": {
            if (order.status === "CREATED") {
              try {
                await services.db
                  .update(pizzaOrders)
                  .set({ status: "PENDING" })
                  .where(eq(pizzaOrders.id, order.id));
                console.log("[PingPay Webhook] Updated order to PENDING", { orderId: order.id });
              } catch (error) {
                console.error("[PingPay Webhook] DB update to PENDING failed:", error);
              }
            }
            break;
          }

          case "payment.success":
          case "checkout.session.completed": {
            if (order.status === "PAID") {
              console.log("[PingPay Webhook] Order already paid, skipping", { orderId: order.id });
              return { received: true };
            }

            try {
              await services.db
                .update(pizzaOrders)
                .set({ status: "PAID", paidAt: new Date() })
                .where(eq(pizzaOrders.id, order.id));
              console.log("[PingPay Webhook] Updated order to PAID", { orderId: order.id });
            } catch (error) {
              console.error("[PingPay Webhook] DB update to PAID failed:", error);
            }
            break;
          }

          case "payment.failed":
          case "payment.abandoned": {
            try {
              await services.db
                .update(pizzaOrders)
                .set({ status: "FAILED" })
                .where(eq(pizzaOrders.id, order.id));
              console.log("[PingPay Webhook] Updated order to FAILED", { orderId: order.id });
            } catch (error) {
              console.error("[PingPay Webhook] DB update to FAILED failed:", error);
            }
            break;
          }

          case "checkout.session.expired": {
            if (order.status !== "PAID") {
              try {
                await services.db
                  .update(pizzaOrders)
                  .set({ status: "EXPIRED" })
                  .where(eq(pizzaOrders.id, order.id));
                console.log("[PingPay Webhook] Updated order to EXPIRED", { orderId: order.id });
              } catch (error) {
                console.error("[PingPay Webhook] DB update to EXPIRED failed:", error);
              }
            }
            break;
          }

          default:
            console.warn("[PingPay Webhook] Unknown event type", { eventType });
        }

        return { received: true };
      }),
    };
  },
});
