#!/bin/bash

# Configuration
FUNCTION_URL="http://localhost:54321/functions/v1/revenuecat-webhook"
SECRET="test_secret"

# Mock Event
PAYLOAD='{
  "event": {
    "type": "INITIAL_PURCHASE",
    "app_user_id": "test_user_id",
    "entitlement_ids": ["premium"],
    "product_id": "monthly_subscription"
  }
}'

# Execute
curl -i --location "$FUNCTION_URL" \
  --header "Content-Type: application/json" \
  --header "Authorization: $SECRET" \
  --data "$PAYLOAD"
