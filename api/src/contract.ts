import { BAD_REQUEST, CONNECTION_ERROR, NOT_FOUND, UNAUTHORIZED } from "every-plugin/errors";
import { eventIterator, oc } from "every-plugin/orpc";
import { z } from "every-plugin/zod";

const quoteSchema = z.object({
  amountIn: z.string(),
  amountInFormatted: z.string(),
  amountInUsd: z.string().optional(),
  amountOut: z.string(),
  amountOutFormatted: z.string(),
  amountOutUsd: z.string().optional(),
  pricingRateDisplay: z.string().optional(),
  feeDisplay: z.string().optional(),
  deadline: z.string().optional(),
  warning: z
    .object({ code: z.string(), message: z.string(), minAmount: z.string().optional() })
    .optional(),
});

const feeBreakdownSchema = z.object({
  lines: z.array(
    z.object({
      type: z.string(),
      label: z.string(),
      recipient: z.string(),
      bps: z.number(),
      amount: z.string(),
      amountFormatted: z.string(),
      amountUsd: z.string().optional(),
    }),
  ),
  total: z.object({
    assetId: z.string(),
    decimals: z.number(),
    amount: z.string(),
    amountFormatted: z.string(),
    amountUsd: z.string().optional(),
  }),
});

export const contract = oc.router({
  ping: oc.route({ method: "GET", path: "/ping" }).output(
    z.object({
      status: z.literal("ok"),
      timestamp: z.iso.datetime(),
    }),
  ),

  authHealth: oc
    .route({ method: "GET", path: "/auth/health" })
    .output(
      z.object({
        status: z.string(),
        emailConfigured: z.boolean(),
        smsConfigured: z.boolean(),
      }),
    )
    .errors({ UNAUTHORIZED }),

  createPizzaOrder: oc
    .route({ method: "POST", path: "/pizza/orders" })
    .input(z.object({ name: z.string().min(1), amount: z.string().regex(/^\d+$/) }))
    .output(
      z.object({
        orderId: z.string(),
        qrUrl: z.string(),
      }),
    )
    .errors({ UNAUTHORIZED, BAD_REQUEST, CONNECTION_ERROR }),

  getPizzaOrder: oc
    .route({ method: "GET", path: "/pizza/orders/{orderId}" })
    .input(z.object({ orderId: z.string() }))
    .output(
      z.object({
        order: z.object({
          id: z.string(),
          name: z.string(),
          amount: z.string(),
          assetChain: z.string(),
          assetSymbol: z.string(),
          status: z.string(),
          depositAddress: z.string().optional(),
          createdAt: z.string(),
        }),
        session: z.unknown(),
        config: z.object({
          availableMethods: z.array(z.string()),
          suggestedAsset: z.unknown(),
          tokens: z.array(z.unknown()),
        }),
      }),
    )
    .errors({ NOT_FOUND, CONNECTION_ERROR }),

  quotePizzaPayment: oc
    .route({ method: "POST", path: "/pizza/orders/{orderId}/quote" })
    .input(
      z.object({
        orderId: z.string(),
        payerAsset: z.object({
          chain: z.string(),
          symbol: z.string(),
        }),
      }),
    )
    .output(
      z.object({
        quote: quoteSchema,
        feeBreakdown: feeBreakdownSchema.optional(),
      }),
    )
    .errors({ BAD_REQUEST, NOT_FOUND, CONNECTION_ERROR }),

  preparePizzaPayment: oc
    .route({ method: "POST", path: "/pizza/orders/{orderId}/prepare" })
    .input(
      z.object({
        orderId: z.string(),
        payerAsset: z.object({
          chain: z.string(),
          symbol: z.string(),
        }),
      }),
    )
    .output(
      z.object({
        depositAddress: z.string(),
        amountToDeposit: z.string(),
        amountToDepositFormatted: z.string(),
        quote: quoteSchema.optional(),
        feeBreakdown: feeBreakdownSchema.optional(),
        transfer: z.unknown().optional(),
      }),
    )
    .errors({ BAD_REQUEST, NOT_FOUND, CONNECTION_ERROR }),

  notifyPizzaDeposit: oc
    .route({ method: "POST", path: "/pizza/orders/{orderId}/notify" })
    .input(z.object({ orderId: z.string() }))
    .output(
      z.object({
        status: z.string(),
        updatedAt: z.string().optional(),
      }),
    )
    .errors({ NOT_FOUND, BAD_REQUEST, CONNECTION_ERROR }),

  subscribePizzaOrder: oc
    .route({ method: "GET", path: "/pizza/orders/{orderId}/stream" })
    .input(z.object({ orderId: z.string() }))
    .output(eventIterator(z.object({ status: z.string(), updatedAt: z.string().optional() })))
    .errors({ BAD_REQUEST }),

  getPizzaOrderStatus: oc
    .route({ method: "GET", path: "/pizza/orders/{orderId}/status" })
    .input(z.object({ orderId: z.string() }))
    .output(
      z.object({
        status: z.string(),
        updatedAt: z.string().optional(),
      }),
    )
    .errors({ NOT_FOUND, CONNECTION_ERROR }),

  pingpayWebhook: oc
    .route({ method: "POST", path: "/webhooks/ping" })
    .input(z.unknown())
    .output(z.object({ received: z.boolean() }))
    .errors({ BAD_REQUEST }),
});

export type ContractType = typeof contract;
