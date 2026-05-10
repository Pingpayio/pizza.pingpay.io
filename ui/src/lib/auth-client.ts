import {
  adminClient,
  anonymousClient,
} from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import type { ClientRuntimeConfig } from "@/app";
import { getHostUrl } from "@/app";

function createAuthClient(config?: Partial<ClientRuntimeConfig>) {
  return createBetterAuthClient({
    baseURL: getHostUrl(config),
    fetchOptions: { credentials: "include" },
    plugins: [
      adminClient(),
      anonymousClient(),
    ],
  });
}

let _authClient: ReturnType<typeof createAuthClient> | undefined;

export function getAuthClient(config?: Partial<ClientRuntimeConfig>) {
  if (config) {
    return createAuthClient(config);
  }
  if (_authClient === undefined) {
    _authClient = createAuthClient();
  }
  return _authClient;
}

export type AuthClient = ReturnType<typeof createAuthClient>;
export type SessionData = AuthClient["$Infer"]["Session"];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Passkey {
  id: string;
  name?: string;
  createdAt?: Date;
}
