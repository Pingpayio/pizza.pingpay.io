import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { type ClientRuntimeConfig, getAuthClient } from "@/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sessionQueryOptions } from "@/lib/session";

type SearchParams = {
  redirect?: string;
};

export const Route = createFileRoute("/_layout/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    const { queryClient } = context;
    const initialSession = context.session;
    const session =
      initialSession ??
      queryClient.getQueryData(sessionQueryOptions(initialSession, context.runtimeConfig).queryKey);

    if (session?.user) {
      const redirectTo = search.redirect?.startsWith("/") ? search.redirect : "/pizza";
      throw redirect({ to: redirectTo, search: {} });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { runtimeConfig } = Route.useRouteContext() as {
    runtimeConfig?: Partial<ClientRuntimeConfig>;
  };
  const auth = getAuthClient(runtimeConfig);
  const { data: session } = useQuery(sessionQueryOptions(undefined, runtimeConfig));
  const { redirect } = Route.useSearch();
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const queryClient = useQueryClient();

  const handleSuccess = async (message: string) => {
    const redirectTo = redirect?.startsWith("/") ? redirect : "/pizza";
    toast.success(message);
    const { data: freshSession } = await auth.getSession();
    if (freshSession) {
      queryClient.setQueryData(["session"], freshSession);
    }
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    navigate({ to: redirectTo, replace: true, search: {} });
  };

  const handleError = (error: { code?: string; message?: string } | Error) => {
    const message = "message" in error ? error.message : "Failed to sign in";
    toast.error(message || "Failed to sign in");
  };

  const handleAnonymous = async () => {
    setIsPending(true);
    try {
      await auth.signIn.anonymous({
        fetchOptions: {
          onSuccess: async () => {
            setIsPending(false);
            await handleSuccess("Started anonymous session");
          },
          onError: (ctx: { error?: { message?: string } }) => {
            setIsPending(false);
            handleError(new Error(ctx.error?.message || "Anonymous sign in failed"));
          },
        },
      });
    } catch {
      setIsPending(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setIsPending(true);
    try {
      await auth.signIn.email({
        email,
        password,
        fetchOptions: {
          onSuccess: async () => {
            setIsPending(false);
            await handleSuccess("Signed in successfully");
          },
          onError: (ctx: { error?: { message?: string } }) => {
            setIsPending(false);
            handleError(new Error(ctx.error?.message || "Sign in failed"));
          },
        },
      });
    } catch {
      setIsPending(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsPending(true);
    try {
      await auth.signUp.email({
        email,
        password,
        name: email.split("@")[0],
        fetchOptions: {
          onSuccess: async () => {
            setIsPending(false);
            await handleSuccess("Account created! Check your email to verify.");
          },
          onError: (ctx: { error?: { message?: string } }) => {
            setIsPending(false);
            handleError(new Error(ctx.error?.message || "Sign up failed"));
          },
        },
      });
    } catch {
      setIsPending(false);
    }
  };

  if (session?.user) {
    const redirectTo = redirect?.startsWith("/") ? redirect : "/pizza";
    return <Navigate to={redirectTo} replace search={{}} />;
  }

  return (
    <div className="min-h-[70vh] w-full flex items-start justify-center px-6 pt-[15vh] animate-fade-in">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <span className="text-4xl">🍕</span>
          <h1 className="text-2xl font-bold tracking-tight">Pizza POS Login</h1>
          <p className="text-sm text-muted-foreground">Sign in to start taking orders</p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleAnonymous} disabled={isPending} className="w-full">
            {isPending ? "starting..." : "continue anonymously"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
            />
            <Button
              onClick={isSignUp ? handleEmailSignUp : handleEmailSignIn}
              disabled={isPending}
              className="w-full"
              variant="outline"
            >
              {isPending
                ? isSignUp
                  ? "creating..."
                  : "signing in..."
                : isSignUp
                  ? "create account"
                  : "sign in"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isPending}
              className="w-full"
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
