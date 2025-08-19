# Stripe Webhook Setup Instructions

## Overview
Your VideoHub platform now includes a comprehensive Stripe webhook system to handle payment events reliably. This ensures that payments are properly recorded in your database even if users close their browser during the payment process.

## Webhook URL
Your webhook endpoint is available at:
```
https://your-replit-domain.replit.app/api/webhooks/stripe
```

## Stripe Dashboard Setup

### 1. Access Stripe Dashboard
- Log into your Stripe Dashboard
- Navigate to **Developers** → **Webhooks**

### 2. Add Webhook Endpoint
- Click **"Add endpoint"**
- Enter your webhook URL: `https://your-domain/api/webhooks/stripe`
- Select **"Listen to events on your account"**

### 3. Select Events to Monitor
Choose these essential events for payment processing:
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment was canceled
- `payment_intent.requires_action` - 3DS authentication required
- `charge.dispute.created` - Customer disputed payment
- `invoice.payment_succeeded` - For future subscription support

### 4. Configure Webhook Secret
- After creating the webhook, copy the **Signing Secret**
- Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## What the Webhook Handles

### ✅ Payment Success (`payment_intent.succeeded`)
- Updates payment status in database
- Creates purchase record for user
- Updates video purchase count and revenue
- Updates user purchase metrics
- Prevents duplicate purchases

### ❌ Payment Failures (`payment_intent.payment_failed`)
- Logs payment failure with error details
- Updates payment status for troubleshooting

### 🔐 3DS Authentication (`payment_intent.requires_action`)
- Tracks when 3DS authentication is required
- Helps with payment flow debugging

### 🛡️ Disputes (`charge.dispute.created`)
- Logs payment disputes for manual review
- Stores dispute details and evidence requirements

## Database Tables Created

### `webhook_events`
Logs all webhook events to prevent duplicate processing:
- `stripe_event_id` - Unique Stripe event ID
- `event_type` - Type of event (payment_intent.succeeded, etc.)
- `processed` - Whether event was successfully handled
- `event_data` - Full event data for debugging

### `payment_disputes`
Tracks payment disputes:
- `stripe_dispute_id` - Stripe dispute ID
- `charge_id` - Associated charge
- `amount` - Disputed amount
- `reason` - Dispute reason
- `status` - Current dispute status

### Enhanced `stripe_payments` Table
Added fields for webhook data:
- `requires_action` - Tracks 3DS requirements
- `failure_code` - Payment failure codes
- `failure_message` - Detailed failure messages

## Security Features
- Webhook signature verification using Stripe's signing secret
- Request method validation (POST only)
- CORS headers for security
- Detailed logging for troubleshooting
- Duplicate event prevention

## Testing Your Webhook

### 1. Stripe CLI (Recommended)
```bash
# Install Stripe CLI
# Forward events to your local development
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

### 2. Test Cards for 3DS
Use these test cards to verify 3DS handling:
- `4000 0084 0000 1280` - Requires 3DS authentication
- `4000 0000 0000 3220` - 3DS authentication fails
- `4242 4242 4242 4242` - Standard successful payment

### 3. Monitor Webhook Logs
Check your server logs and the webhook_events table to verify events are being processed.

## Troubleshooting

### Webhook Not Receiving Events
1. Verify the webhook URL is correct and accessible
2. Check that your Replit domain is publicly accessible
3. Ensure the webhook endpoint returns 200 status codes

### Signature Verification Errors
1. Verify the webhook secret is correctly set
2. Check that the raw POST body is being used (not parsed JSON)
3. Ensure the Stripe-Signature header is being passed correctly

### Database Errors
1. Check that all required tables exist
2. Verify database connection in webhook script
3. Check error logs for specific SQL errors

## Production Considerations
1. Set up proper logging and monitoring
2. Consider webhook retry logic for failed processing
3. Implement webhook event archiving for old events
4. Monitor webhook performance and response times
5. Set up alerts for webhook failures

Your payment system is now enterprise-ready with reliable webhook processing!