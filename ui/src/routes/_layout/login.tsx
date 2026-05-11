import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Navigate, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BillyBadge, isBillysBirthday, PizzaBackground } from "@/components";
import { sessionQueryKey, sessionQueryOptions, useAuthClient } from "@/lib/auth";

function safeRedirectTo(path?: string) {
  return path?.startsWith("/") ? path : "/pizza";
}

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
      queryClient.getQueryData(sessionQueryOptions(context.authClient, initialSession).queryKey);

    if (session?.user) {
      throw redirect({ to: safeRedirectTo(search.redirect), search: {} });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuthClient();
  const { data: session } = useQuery(sessionQueryOptions(auth));
  const { redirect } = Route.useSearch();
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const queryClient = useQueryClient();

  const handleSuccess = async (message: string) => {
    const redirectTo = safeRedirectTo(redirect);
    toast.success(message);
    const { data: freshSession } = await auth.getSession();
    if (freshSession) {
      queryClient.setQueryData(sessionQueryKey, freshSession);
    }
    await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      void handleEmailSignUp();
    } else {
      void handleEmailSignIn();
    }
  };

  if (session?.user) {
    return <Navigate to={safeRedirectTo(redirect)} replace search={{}} />;
  }

  const birthday = isBillysBirthday();

  return (
    <div
      className="fixed inset-0 flex flex-col animate-fade-in"
      style={{ background: "linear-gradient(160deg, #c0392b 0%, #922b21 60%, #7b241c 100%)" }}
    >
      <PizzaBackground />
      <BillyBadge />

      <div
        className="relative z-10 flex flex-col items-center h-full overflow-y-auto overscroll-contain pb-safe px-5"
        style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div className="flex flex-col items-center w-full max-w-sm min-h-full justify-center gap-8 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-7xl" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}>
              🍕
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="pizza-label text-white/55">Tortorices on Grand Ave</p>
              <h1
                className="text-5xl font-semibold text-white pizza-display"
                style={{ textShadow: "rgba(0,0,0,0.25) 2px 2px 0, rgba(0,0,0,0.12) 4px 4px 10px" }}
              >
                Pizza Pay
              </h1>
              {birthday && (
                <p
                  className="text-white/60 text-sm mt-1"
                  style={{ fontFamily: "IBM Plex Sans, sans-serif", fontStyle: "italic" }}
                >
                  happy birthday Billy 🎂
                </p>
              )}
            </div>
          </div>

          <div
            className="pizza-card w-full p-6 flex flex-col gap-4"
            style={{ background: "#fffde7" }}
          >
            <button
              type="button"
              onClick={handleAnonymous}
              disabled={isPending}
              className="pizza-btn pizza-btn-primary w-full py-4 text-white"
              style={{ background: "#c0392b" }}
            >
              {isPending ? "opening register..." : "open up shop"}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-black/12" />
              <span className="pizza-label text-black/35">or sign in</span>
              <div className="flex-1 h-px bg-black/12" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                autoComplete="email"
                inputMode="email"
                enterKeyHint="next"
                className="pizza-input w-full px-4 py-3 bg-white text-black placeholder-black/30"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                enterKeyHint="done"
                className="pizza-input w-full px-4 py-3 bg-white text-black placeholder-black/30"
              />
              <button
                type="submit"
                disabled={isPending}
                className="pizza-btn w-full py-3.5 text-white"
                style={{ background: "#1a1a1a" }}
              >
                {isPending
                  ? isSignUp
                    ? "creating account..."
                    : "signing in..."
                  : isSignUp
                    ? "create account"
                    : "sign in"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={isPending}
              className="text-xs text-black/40 hover:text-black/70 transition-colors underline underline-offset-2"
              style={{ fontFamily: "IBM Plex Sans, sans-serif" }}
            >
              {isSignUp ? "already have an account? sign in" : "need an account? sign up"}
            </button>
          </div>

          <div className="flex items-center gap-2 opacity-65">
            <span className="pizza-label text-white/55">powered by</span>
            <img
              src="https://onramp.pingpay.io/ping-pay-logo.png"
              alt="PingPay"
              className="pingpay-logo"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
