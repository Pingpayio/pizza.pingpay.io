import { useRouter } from "@tanstack/react-router";
import type { ApiClient } from "./api";

export function useApiClient(): ApiClient {
  return useRouter().options.context.apiClient!;
}
