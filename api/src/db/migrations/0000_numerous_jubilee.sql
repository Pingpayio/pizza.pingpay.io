CREATE TABLE "pizza_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"amount" text NOT NULL,
	"asset_chain" text DEFAULT 'ETH' NOT NULL,
	"asset_symbol" text DEFAULT 'USDC' NOT NULL,
	"status" text DEFAULT 'CREATED' NOT NULL,
	"checkout_session_id" text,
	"deposit_address" text,
	"payment_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
