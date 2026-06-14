## Goal
Add escrow + a complete rental lifecycle on top of the existing booking flow: funds are held by SpotVault until the rental ends, auto-released unless disputed, with in-app extension requests and automatic 2x overdue charges.

## 1. Stripe model — Destination charges with delayed transfer
Keep the existing Checkout session, but switch it from a plain charge to a Connect "separate charges and transfers" model:
- `payment_intent_data.transfer_group = booking_<id>` and `on_behalf_of = provider_stripe_account` (when provider has Connect)
- NO `transfer_data` on the session → money lands in SpotVault's Stripe balance (escrow)
- A new `release-booking-payout` edge function creates a `stripe.transfers.create({ amount, destination: provider_account, transfer_group })` when escrow is released
- Refund path (already exists for cancellation) untouched

Providers without completed Connect onboarding can still be booked; their funds stay in SpotVault until they finish onboarding, then the release function transfers.

## 2. Database changes (one migration)
New columns on `bookings`:
- `escrow_status` text — `held` | `released` | `refunded` | `disputed`
- `auto_release_at` timestamptz — set to `end_date + 24h` on confirm
- `released_at` timestamptz, `released_transfer_id` text
- `overdue_charges_total` numeric default 0
- `last_overdue_charge_at` timestamptz
- `completed_by_provider_at`, `completed_by_seeker_at` timestamptz (kept for audit, but not gating release)
- `dispute_opened_at`, `dispute_reason` text

New table `booking_extensions`:
- `booking_id`, `requested_by` (seeker), `extra_hours` int, `extra_amount` numeric, `status` (`pending`|`accepted`|`declined`|`paid`), `stripe_session_id`, `new_end_date`, timestamps
- RLS: seeker + provider of the parent booking can read; seeker inserts; provider updates status

New table `overdue_charges`:
- `booking_id`, `charge_date`, `units`, `rate`, `amount`, `payment_intent_id`, `status`
- RLS: read by seeker/provider of booking; service_role manages

All tables: GRANTs + RLS + service_role full access, per project conventions.

## 3. Edge functions (new)
- `release-booking-payout` — invoked by cron + manual. For each booking where `escrow_status='held'` and `auto_release_at <= now()` and no dispute → transfer 90% to provider's Connect account, mark `released`. Idempotent.
- `request-extension` — seeker creates a pending row, notifies provider via existing messages.
- `respond-extension` — provider accepts/declines; on accept creates a new Checkout session (one-off charge, same transfer_group) and returns URL.
- `charge-overdue` — cron: for any booking where `end_date < now()`, escrow still `held`, no pickup confirmation, charge `2x daily_rate` per overdue day via `paymentIntents.create({ off_session: true, customer })` using the saved payment method from the original Checkout (`setup_future_usage: 'off_session'` added to original session). Logs to `overdue_charges`.
- `complete-rental` — provider or seeker hits Complete; just stamps the timestamp. Release still driven by `auto_release_at`, but provider Complete + no overdue can fast-forward `auto_release_at` to now.
- `open-dispute` — seeker can flip `escrow_status='disputed'`, freezes auto-release, notifies admin.

Existing `stripe-webhook` extended to:
- Save `payment_method` from `checkout.session.completed` onto the booking for off-session overdue charges
- Handle `charge.dispute.created` → set `escrow_status='disputed'`

## 4. Cron (pg_cron + pg_net)
- Every 15 min: invoke `release-booking-payout`
- Every hour: invoke `charge-overdue`
Inserted via the insert tool (contains project URL + anon key), not migration.

## 5. Frontend
**Dashboard – Seeker bookings**
- New "Complete & Pickup" button (when `now >= start_date`)
- "Request more time" button → modal (hours + computed price) → Stripe Checkout
- Banner if overdue showing accrued 2x charges
- "Open dispute" link in 24h release window

**Dashboard – Provider bookings**
- "Accept / Decline" buttons on pending extension requests
- "Mark Complete" + "Customer didn't pick up" actions
- Status badge: Held / Released / Disputed / Overdue
- After auto-release, show transfer ID

**Messages**
- Auto-post system messages on extension request, accept, complete, overdue charge.

## 6. Bug fix for current "Payment error"
The `create-booking-payment` function is already fixed and returning 200 in tests. The on-screen error is from a stale state; user should hard-refresh. As part of this change the function is updated to add `payment_intent_data.setup_future_usage='off_session'` + `transfer_group` so the new escrow flow works end-to-end.

## Technical notes
- Platform fee = 10% kept as today, applied at transfer time (`amount = total - 10%`).
- Auto-release window = 24h after `end_date`. Adjustable via constant.
- Overdue rate = `2 * daily_rate` per started day, capped at 7 days then forced complete + admin alert.
- All Stripe calls use API `2025-08-27.basil`.
- Edge functions all use service-role admin client (per existing pattern that fixed the listing lookup).

## Out of scope (call out, not building)
- Actually dispatching a tow truck — UI surfaces the action and contact info only.
- SMS/voice calling — the "contact provider by message or call" uses existing in-app messaging + the provider's phone field if present.

Approve and I'll ship in this order: migration → edge functions → cron → UI.