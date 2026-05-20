import { ORPCError } from "every-plugin/orpc";

interface PingPayConfig {
  apiUrl: string;
  apiKey: string;
}

interface CheckoutSessionResponse {
  session: {
    sessionId: string;
    status: string;
    amount: { assetId: string; amount: string; decimals?: number };
    recipient: { address: string };
    createdAt: string;
    expiresAt?: string;
    [key: string]: unknown;
  };
  sessionUrl: string;
}

interface GetSessionResponse {
  session: CheckoutSessionResponse["session"];
  config: {
    availableMethods: string[];
    suggestedAsset: unknown;
    tokens: unknown[];
    [key: string]: unknown;
  };
}

interface QuoteResponse {
  quote: {
    depositAddress?: string;
    amountIn: string;
    amountInFormatted: string;
    amountInUsd?: string;
    amountOut: string;
    amountOutFormatted: string;
    amountOutUsd?: string;
    pricingRateDisplay?: string;
    feeDisplay?: string;
    deadline?: string;
    warning?: { code: string; message: string; minAmount?: string };
    quoteRequest?: { originAsset: string; destinationAsset: string };
  };
  feeBreakdown?: {
    lines: Array<{
      type: string;
      label: string;
      recipient: string;
      bps: number;
      amount: string;
      amountFormatted: string;
      amountUsd?: string;
    }>;
    total: {
      assetId: string;
      decimals: number;
      amount: string;
      amountFormatted: string;
      amountUsd?: string;
    };
  };
}

interface PreparePaymentResponse {
  depositAddress?: string;
  payment?: {
    paymentId?: string;
    status?: string;
    depositAddress?: string;
    [key: string]: unknown;
  };
  quote?: QuoteResponse["quote"];
  feeBreakdown?: QuoteResponse["feeBreakdown"];
  transfer?: {
    kind: string;
    to: string;
    amount?: string;
    amountYocto?: string;
    contractId?: string;
    attachStorageDeposit?: boolean;
  };
}

interface PaymentStatusResponse {
  status: string;
  updatedAt?: string;
}

function createPingPayService(config: PingPayConfig) {
  const { apiUrl, apiKey } = config;

  async function pingpayFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${apiUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          ...options.headers,
        },
      });
    } catch (cause) {
      throw new ORPCError("CONNECTION_ERROR", {
        message: `PingPay unreachable: ${cause instanceof Error ? cause.message : String(cause)}`,
        data: {
          errorCode: "PINGPAY_NETWORK_ERROR",
          host: apiUrl,
          suggestion: "Check your internet connection or PingPay service availability",
        },
        cause: cause instanceof Error ? cause : undefined,
      });
    }
    if (!response.ok) {
      const body = (await response
        .json()
        .catch(() => ({ message: `PingPay HTTP ${response.status}` }))) as { message?: string };
      throw new ORPCError("CONNECTION_ERROR", {
        message: body.message || `PingPay HTTP ${response.status}`,
        data: {
          errorCode: `PINGPAY_HTTP_${response.status}`,
          host: apiUrl,
          suggestion:
            response.status === 401 || response.status === 403
              ? "Check PINGPAY_API_KEY in .env"
              : "PingPay service may be temporarily unavailable",
        },
      });
    }
    return response;
  }

  async function createCheckoutSession(input: {
    amount: string;
    asset: { chain: string; symbol: string };
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<CheckoutSessionResponse> {
    const response = await pingpayFetch("/checkout/sessions", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.json() as Promise<CheckoutSessionResponse>;
  }

  async function getSession(sessionId: string): Promise<GetSessionResponse> {
    const response = await pingpayFetch(`/checkout/sessions/${sessionId}`);
    return response.json() as Promise<GetSessionResponse>;
  }

  async function getQuote(input: {
    sessionId: string;
    payerAsset: {
      amount: string;
      asset: { chain: string; symbol: string; contractAddress?: string };
    };
  }): Promise<QuoteResponse> {
    const response = await pingpayFetch("/payments/quote", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
    return response.json() as Promise<QuoteResponse>;
  }

  async function preparePayment(input: {
    sessionId: string;
    payerAsset: {
      amount: string;
      asset: { chain: string; symbol: string; contractAddress?: string };
    };
    payer: { address: string };
    idempotencyKey: string;
    paymentMethod: string;
  }): Promise<PreparePaymentResponse> {
    const response = await pingpayFetch("/payments/prepare", {
      method: "POST",
      body: JSON.stringify({ input }),
    });
    return response.json() as Promise<PreparePaymentResponse>;
  }

  async function getPaymentStatus(depositAddress: string): Promise<PaymentStatusResponse> {
    const response = await pingpayFetch(
      `/payments/status?depositAddress=${encodeURIComponent(depositAddress)}`,
    );
    return response.json() as Promise<PaymentStatusResponse>;
  }

  function streamPaymentStatus(depositAddress: string): Promise<ReadableStream<Uint8Array>> {
    const url = `${apiUrl}/payments/status/subscribe?depositAddress=${encodeURIComponent(depositAddress)}`;
    return fetch(url, {
      headers: {
        Accept: "text/event-stream",
        "x-api-key": apiKey,
      },
    }).then((response) => {
      if (!response.ok)
        throw new ORPCError("CONNECTION_ERROR", {
          message: `PingPay SSE HTTP ${response.status}`,
          data: { errorCode: `PINGPAY_SSE_HTTP_${response.status}`, host: apiUrl },
        });
      if (!response.body)
        throw new ORPCError("CONNECTION_ERROR", {
          message: "No response body for SSE stream",
          data: { errorCode: "PINGPAY_SSE_NO_BODY", host: apiUrl },
        });
      return response.body;
    });
  }

  return {
    createCheckoutSession,
    getSession,
    getQuote,
    preparePayment,
    getPaymentStatus,
    streamPaymentStatus,
  };
}

export { createPingPayService };
