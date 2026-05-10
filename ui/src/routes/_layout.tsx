import { createFileRoute, Outlet } from "@tanstack/react-router";
import { sessionQueryOptions } from "@/lib/session";

export const Route = createFileRoute("/_layout")({
  beforeLoad: async ({ context }) => {
    const { queryClient } = context;
    const session = await queryClient.ensureQueryData(
      sessionQueryOptions(context.session, context.runtimeConfig),
    );

    return {
      assetsUrl: context.assetsUrl || "",
      runtimeConfig: context.runtimeConfig,
      session,
    };
  },
  component: Layout,
});

function Layout() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      <main className="flex-1 w-full min-h-0 overflow-auto scroll-smooth">
        <Outlet />
      </main>
    </div>
  );
}
