import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ClientRuntimeConfig, getAuthClient } from "@/app";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sessionQueryOptions } from "@/lib/session";

export function UserNav({ runtimeConfig }: { runtimeConfig?: Partial<ClientRuntimeConfig> }) {
  const auth = getAuthClient(runtimeConfig);
  const { data: session } = useQuery(sessionQueryOptions(undefined, runtimeConfig));
  const user = session?.user;

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await auth.signOut();
    },
    onSuccess: () => {
      if (typeof window !== "undefined") {
        window.location.assign("/pizza");
      }
    },
    onError: (error: Error) => {
      console.error("Sign out error:", error);
    },
  });

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to="/login">connect</Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-6 h-6 rounded-full bg-foreground transition-all duration-200 ease-out hover:shadow-lg hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          title="menu"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">signed in as</p>
            <p className="truncate text-sm font-normal">{user.email || user.id}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/pizza">pizza pos</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            signOutMutation.mutate();
          }}
          disabled={signOutMutation.isPending}
        >
          {signOutMutation.isPending ? "signing out..." : "sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
