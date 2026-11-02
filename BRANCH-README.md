# Afisha Data Base — current top-navigation UI

This revision is based on the owner's current Claude artifact export, NOT the older sidebar application in the repository root. The root production application is unchanged. The separately authorized Pages preview is `preview/program-features/index.html`.

## Preserved application

The actual top navigation, dashboards, event/place registries and cards, selection screen, robot screen, reference/rule editors, source management, instructions, and existing layout are retained. Program features appear next to genre as a compact multiselect and show selected names. Language, age, Luxe, both prices and showcase controls remain separate. No record is populated from a mockup.

## Protected runtime

The browser uses the existing public Supabase anon configuration for sign-in. All administrative operations go through `afisha-admin` with `{op, args}` and the signed-in user's JWT. The server uses an explicit owner allowlist and typed operation validators. There is no client SQL execution, arbitrary RPC forwarding, service key, Claude MCP/db dependency, or private Google Docs URL in the public source.

Static internal configuration and document links are supplied only by the authenticated bootstrap operation. These server-private assets and deployed owner policy are deliberately NOT included in this public repository.

Destructive operations and robot launches require an actual user confirmation and a top-level `confirm: true` request. The supported origin is `https://alembot.github.io`; local downloaded live HTML is not supported. Do not weaken CORS or RPC grants to work around this.

Generative Claude assistance is explicitly unavailable outside Claude. Deterministic record search is retained; edits use the normal forms.

## Validation

- `node test-features.cjs`: 15 correct-source mocked scenarios passed.
- `node test-transport.cjs`: 18 transport assertions passed.
- `node test-public-source.cjs`: public-source sanitation and current-version structural checks passed.
- 9 original top-navigation/registry/queue views were additionally rendered with isolated DOM mocks and the authorized server-private configuration; that private fixture is not published.
- Inline JavaScript syntax check passed.
- Independent source/contract review passed.

These checks do not claim an authenticated browser or production-write end-to-end pass. The owner must use their normal account to view protected data. The older standalone sidebar demo has been removed from this branch to avoid confusion.
