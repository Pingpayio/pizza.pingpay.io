import * as crypto from "node:crypto";
import { z } from "every-plugin/zod";

const PingWebhookPayloadSchema = z.object({
  type: z.enum([
    "payment.pending",
    "payment.success",
    "payment.failed",
    "payment.abandoned",
    "checkout.session.completed",
    "checkout.session.expired",
  ]),
  sessionId: z.string().optional(),
  metadata: z
    .object({
      orderId: z.string().optional(),
    })
    .optional(),
  data: z
    .object({
      sessionId: z.string().optional(),
      paymentId: z.string().optional(),
      status: z.string().optional(),
      amount: z.string().optional(),
      assetId: z.string().optional(),
      payerAddress: z.string().optional(),
      recipientAddress: z.string().optional(),
      merchantId: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

export type PingWebhookPayload = z.infer<typeof PingWebhookPayloadSchema>;

export interface PingWebhookResult {
  eventType: string;
  orderId?: string;
  sessionId?: string;
}

function verifySignature(
  payload: string,
  timestamp: string,
  signature: string,
  webhookSecret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  if (signature.length !== expected.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function verifyAndParseWebhook(
  body: string,
  signature: string,
  timestamp: string,
  webhookSecret?: string,
): PingWebhookResult {
  if (webhookSecret) {
    const valid = verifySignature(body, timestamp, signature, webhookSecret);
    if (!valid) {
      throw new Error("Invalid webhook signature");
    }
  } else {
    console.warn(
      "[PingPay Webhook] No webhook secret configured — skipping signature verification",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (e) {
    throw new Error(`Invalid webhook JSON: ${(e as Error).message}`);
  }

  const parseResult = PingWebhookPayloadSchema.safeParse(parsed);
  if (!parseResult.success) {
    throw new Error(`Invalid webhook payload: ${parseResult.error.message}`);
  }

  const payload = parseResult.data;
  const sessionId = payload.sessionId ?? payload.data?.sessionId;
  const orderId =
    payload.metadata?.orderId ?? (payload.data?.metadata?.orderId as string | undefined);

  console.log(
    `[PingPay Webhook] Received event: ${payload.type}, sessionId: ${sessionId}, orderId: ${orderId}`,
  );

  return { eventType: payload.type, orderId, sessionId };
}
