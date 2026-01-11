import { Context, Effect, Layer } from "effect";
import Stripe from "stripe";

export interface StripeServiceInterface {
  readonly createCheckoutSession: (userId: string, amountCredits: number) => Effect.Effect<{ url: string }, Error>;
  readonly handleWebhook: (payload: string, signature: string) => Effect.Effect<{ userId: string; amountCredits: number }, Error>;
}

export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  StripeServiceInterface
>() {}

function makeStripeService(
  apiKey: string,
  webhookSecret: string,
  appUrl: string
): StripeServiceInterface {
  const stripe = new Stripe(apiKey, {
    apiVersion: "2025-01-27.acacia" as any,
  });

  return {
    createCheckoutSession: (userId, amountCredits) =>
      Effect.tryPromise({
        try: async () => {
          // 100 credits = £1.00
          const amountPence = amountCredits; 
          
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
              {
                price_data: {
                  currency: "gbp",
                  product_data: {
                    name: "Shipbox Credits",
                    description: `${amountCredits} compute credits`,
                  },
                  unit_amount: amountPence,
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            success_url: `${appUrl}/billing?success=true`,
            cancel_url: `${appUrl}/billing?canceled=true`,
            metadata: {
              userId,
              amountCredits: amountCredits.toString(),
            },
          });

          if (!session.url) throw new Error("Failed to create checkout session URL");
          return { url: session.url };
        },
        catch: (error) => new Error(`Stripe error: ${error}`),
      }),

    handleWebhook: (payload, signature) =>
      Effect.tryPromise({
        try: async () => {
          const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

          if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = session.metadata?.userId;
            const amountCredits = session.metadata?.amountCredits;

            if (!userId || !amountCredits) {
              throw new Error("Missing metadata in Stripe session");
            }

            return {
              userId,
              amountCredits: parseInt(amountCredits),
            };
          }

          throw new Error(`Unhandled event type: ${event.type}`);
        },
        catch: (error) => new Error(`Webhook error: ${error}`),
      }),
  };
}

export function makeStripeServiceLayer(
  apiKey: string,
  webhookSecret: string,
  appUrl: string
): Layer.Layer<StripeService> {
  return Layer.succeed(StripeService, makeStripeService(apiKey, webhookSecret, appUrl));
}
