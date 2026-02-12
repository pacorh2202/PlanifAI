# RevenueCat Webhook Function

Handles subscription updates from RevenueCat and updates the `profiles` table in Supabase.

## Setup

1.  **Set Secrets**:
    ```bash
    supabase secrets set REVENUECAT_WEBHOOK_SECRET="your_secret_here"
    ```
    (Generate a strong secret and put it in RevenueCat dashboard too).

2.  **Deploy**:
    ```bash
    supabase functions deploy revenuecat-webhook
    ```

3.  **Local Testing**:
    Run `test.sh` to simulate a webhook event.
    ```bash
    ./test.sh
    ```

## Logic
-   Maps `premium` entitlement -> `premium` tier.
-   Maps `pro` entitlement -> `pro` tier.
-   Everything else -> `free`.
