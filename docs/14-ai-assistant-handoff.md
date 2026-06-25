# AI Assistant Handoff

## Summary

Source detail now has a source-scoped AI assistant panel. The existing summary review flow remains in the panel, and a new chat tab lets the owner ask questions grounded in the current source text.

The summary and chat surfaces intentionally do not write AI content into the article body. Saved summaries are only shown inside the assistant panel.

## User-Facing Behavior

- The owner sees one `AI 어시스턴트` launcher in the source detail side note.
- The assistant panel has two tabs:
  - `요약`: shows saved summary or summary draft review, with the existing apply flow.
  - `대화`: session-only chat against the current source raw text.
- Chat input behavior:
  - `Enter` sends the message.
  - `Shift+Enter` inserts a newline.
  - IME composition is respected so Korean input does not submit early.
- While the model is answering, the chat tab shows a compact animated AI mark with three loading dots.
- The same animated AI mark is also used while the summary draft is being generated.

## Backend/API

- Shared schemas:
  - `sourceChatMessageSchema`
  - `sourceChatRequestSchema`
  - `sourceChatResponseSchema`
- API route:
  - `POST /api/sources/:id/chat`
  - Requires authenticated and verified owner, same as source summarization.
  - Validates `message` and up to 8 history messages.
  - Returns `{ answer, mode }`.
- AI logic:
  - `chatWithText(rawText, message, history)` uses the same Ollama `/api/generate` path as summarization.
  - The prompt instructs the model to answer only from the source text and prior conversation.
  - `AI_MODE=demo` returns a labeled fixture.
  - `AI_MODE=disabled` returns `AI_DISABLED`.

## Web/Next

- Web API client:
  - `sourceApi.chat(id, input)`
  - Uses the same long timeout as summarization.
- Next route handler:
  - `apps/web/src/app/api/sources/[id]/chat/route.ts`
  - Proxies cookies and origin to the API server.
  - Uses a long timeout to avoid dev proxy socket resets during local LLM calls.
- UI state:
  - Chat history is React state only. It is not persisted to DB or localStorage.
  - The request sends the last 8 messages as context.
- UI components:
  - `AiThinkingIndicator` renders the shared loading motion for both summary generation and chat answering.
  - The source detail launcher currently displays `AI Assistant`.

## App Icon

- The app favicon was changed from `apps/web/src/app/icon.svg` to `apps/web/src/app/icon.png`.
- The PNG is a 1254 x 1254 generated app icon with a document/book/link/network motif.
- Next app router exposes it as `/icon.png` through the file convention.

## Validation

Commands run successfully:

```sh
pnpm --filter @sourcewiki/shared build
pnpm --filter @sourcewiki/api test
pnpm --filter @sourcewiki/api typecheck
pnpm --filter @sourcewiki/api lint
pnpm --filter @sourcewiki/web typecheck
pnpm --filter @sourcewiki/web lint
pnpm --filter @sourcewiki/web build
```

Note: full API tests needed elevated execution in this environment because sandboxed supertest could not listen on `0.0.0.0`.

Additional post-handoff validation:

```sh
pnpm --filter @sourcewiki/web typecheck
pnpm --filter @sourcewiki/web lint
pnpm --filter @sourcewiki/web build
```

## Follow-Up Notes

- Chat history is intentionally session-only. Persisting conversations would require a DB schema and source/user scoping policy.
- The model prompt is grounded but not citation-based. If source citations are needed, add chunking and quote/range metadata instead of sending only raw text.
- The current flow sends up to 60,000 characters of raw source text to the model, matching the summarizer limit.
