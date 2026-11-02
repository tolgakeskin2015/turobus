# Tatilliyoruz + eBalayı: Separate Sales & Contact Center Workspaces

Status: implementation specification; integrations are NOT live.

## Architecture
- Two independent tenants: `tatilliyoruz` and `ebalayi`.
- Every customer, conversation, lead, quote, reservation link, task, agent assignment and integration credential must carry `tenant_id`.
- Enforce tenant access on the server and database (RLS where available); never rely on frontend filters.
- Cross-brand aggregate reporting only for authorized platform administrators. No customer details in aggregate dashboards.
- Separate branding, templates, working hours, phone numbers, Instagram accounts and WhatsApp Business accounts.
- Audit access and changes. Apply Turkish KVKK retention, consent and recording-notice requirements.

## Functional scope
1. Unified inbox for Instagram DM, WhatsApp and website chat, per tenant.
2. Lead CRM: customer profile, channel, stage, notes, owner, tasks, callbacks, activity timeline.
3. Quotes: packages, prices, validity, follow-up reminders, reservation conversion.
4. Call center: inbound/outbound integration, queue, missed calls, recordings subject to legal notices.
5. AI assistant: brand-specific knowledge base, package suggestions, handoff to human; never invent prices or availability.
6. Reporting: lead sources, first response, conversion, agent workload and missed follow-ups.
7. Admin settings: roles, channel credentials, message templates and consent controls.

## Suggested implementation order
- Phase 1: tenant-aware CRM and access tests, then brand-specific inbox UI.
- Phase 2: WhatsApp Business Platform and Instagram Messaging API after Meta account authorization and webhooks.
- Phase 3: telephony provider, recordings and call analytics.
- Phase 4: AI assisted replies, quote generation and approval flows.

## Acceptance tests
- A Tatilliyoruz agent cannot read or search eBalayı records via API, database or export.
- eBalayı messages cannot appear in Tatilliyoruz inbox or notifications.
- Admin may view aggregate counts but brand-specific customer detail only with explicit role permission.
- Failed integration credentials do not leak data or silently drop messages; retries are idempotent.
- AI does not send an unapproved price or booking confirmation.
- All outgoing marketing messages respect opt-in/opt-out and applicable law.

## Dependencies / not yet connected
Meta WhatsApp Business and Instagram permissions, telephony provider, deployment environment and database migrations. These must be configured and verified before claiming any channel is operational.
