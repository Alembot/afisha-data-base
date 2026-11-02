# Compact event form / program features

This branch is an alternative to the Claude artifact UI. It is based on the existing static Afisha Data Base application. It does not replace or modify the main branch or the published Claude artifact.

## Runtime

The existing application signs in with Supabase email/password and uses its existing table permissions for ordinary fields. Program features must go through the scoped `program-features-admin` Edge Function. Never place a service-role key in this HTML, expose the service-only RPCs to authenticated/anonymous roles, or reuse a collector secret in the browser.

Bridge contract:

- POST through `sb.functions.invoke('program-features-admin', { body })` with the signed-in user's bearer token.
- Read body: `{ "action": "read", "event_id": "<events UUID>" }`.
- Save body: `{ "action": "save", "event_id": "<events UUID>", "program_features": ["<catalog code>"] }`.
- Successful read/save response: `{ "catalog": [{ "code", "name", "description", "is_active" }], "program_features": ["code"], "program_feature_details": [{ "code", "name", "is_active" }] }`.
- Save modifies program-feature relations only. It is separate from legacy form-field saves; failures after one part succeeds must be reported as partial saves, not atomic success.

The bridge is a separate deployment/security decision. Adding its source to this branch does not deploy it. Its server-side JWT verification and explicit approved-user allowlist must fail closed. Existing SQL RPC ACLs remain unchanged.

## Preview and validation

`preview.html`, when present, is an isolated, offline interactive demonstration using fixture data. It is not a live database admin application and cannot establish that authenticated read/save works. No preview changes persist to Supabase.

Automated tests use mocked DOM/network boundaries. Live authenticated read/save and deployed browser behavior require the approved bridge deployment and an authorized test session. See test output and branch handoff for what was actually run.

No automatic migration of genre or inferred program features is performed by the UI. Existing values are read as stored. Features are displayed by catalog name, saved by stable code, and not replaced with a selection count.

## Verified status (2026-11-02)

- `node test-ui.cjs`: 16 mocked UI regression scenarios passed.
- `node tests/program-features-admin.test.cjs`: 43 mocked authorization/input/CORS/read/save assertions passed.
- Inline JavaScript syntax checks: index.html and preview.html passed.
- Independent code review passed after fixes for in-flight polling, stale reads, session changes, and uncertain partial saves.
- Backend operator reports program-features-admin v1 deployed with the exact owner allowlist. The committed server policy is intentionally empty/fail-closed; it contains no owner identifiers and is not the private deployed policy.
- Browser visual verification and authenticated end-to-end read/save are not established by mocked tests. The local preview could not be reached by the remote browser.
- Allowed bridge origin is exactly `https://alembot.github.io`. Downloaded live HTML (`Origin: null`) is not supported. Do not weaken this to make a local file work.
- `preview.html` is an offline interactive demonstration, not the live application.
- The owner separately authorized publishing the live UI as the single new file `preview/program-features/index.html` in the main GitHub Pages source. This is not a merge of this branch, and the root application must remain byte-identical.
