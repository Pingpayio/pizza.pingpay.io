import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getAppName } from "@/app";
import { useClientValue } from "@/hooks/use-client";
import { sessionQueryOptions } from "@/lib/session";
import { ThemeToggle } from "../components/theme-toggle";
import { UserNav } from "../components/user-nav";

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
  const appName = useClientValue(() => getAppName(), "app");
  const { session, runtimeConfig } = Route.useRouteContext();
  const isAuthenticated = !!session?.user;

  return (
    <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
      {isAuthenticated && (
        <header className="shrink-0 bg-card/50 border-b border-border animate-fade-in">
          <div className="flex items-center justify-between px-4 sm:px-6 h-12">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono min-w-0">
              <span>{appName}</span>
              <span>/</span>
              <span className="truncate">pizza</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserNav runtimeConfig={runtimeConfig} />
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 w-full min-h-0 overflow-auto scroll-smooth">
        <Outlet />
      </main>
    </div>
  );
}
