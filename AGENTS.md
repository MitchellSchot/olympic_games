<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Belgian province borders are a separate licensed geographic reference in public/data/geo with NIS identifiers; match them to existing province statistics without altering medal exports.
- All data comes from public/data; Act 1 exports are imported and validated through src/lib/data.ts so SSR, Rankings and validation use the same source and calculations without storage or authentication.
- Global filters live in root route search params (validateSearch in src/lib/app-state.tsx) so views are bookmarkable.
- Keep AppDataContext and Act1DataContext in separate non-component modules so live provider updates preserve context identity for mounted consumers.
- Real Acts 2 and 3 use browser-safe static imports and shared aggregation/validation in src/lib/real-acts.ts; separate NOC-to-ISO reference and atlas coverage keep IOC codes distinct from map identifiers.
- Belgium athlete-count exports use a separate browser-safe src/lib/act3-athlete.ts projection and validation so switching Belgium and Act 3 checks leaves other pages' legacy medal-credit calculations unchanged.
- World map rendering and coverage share feature matching in real-acts.ts and atlas/capital references in world-map-data.ts so validation counts the same shapes and fallback markers the UI renders, without modifying exports.
- Fixed fact cards use a browser-safe shared projection and validation in did-you-know-data.ts; explicitly whitelist athlete fields so cards and validation share the same privacy boundary without calculating export values.
