# Search providers

OperaGrid supports pluggable keyword search across workspace content
(workspaces, projects, tasks, channels, files, calendar events). Pick
a provider by setting `SEARCH_PROVIDER` in your `.env`.

Keyword search is separate from operagrid's existing Qdrant-backed
semantic / vector search — the two coexist. Use `SearchProviderService`
(this module) for keyword queries and `SemanticSearchService` (from
`modules/search`) for embedding-based similarity.

```
SEARCH_PROVIDER=pg-trgm   # zero-infra default
```

## Comparison

| Provider | Free tier | Infra | Indexing | Typo tolerance | Facets | Best for |
|---|---|---|---|---|---|---|
| **pg-trgm** *(default)* | ♾️ | none (uses existing Postgres) | no-op (Postgres is source of truth) | good (trigram) | no | dev + small prod |
| **meilisearch** | ♾️ self-hosted | docker | batch upsert | excellent | ✅ | recommended for prod |
| **typesense** | ♾️ self-hosted | docker | JSONL import | excellent | ✅ | simpler schema than Meilisearch |
| **none** | — | — | — | — | — | keyword search disabled (semantic via Qdrant still works) |

For semantic / vector search, use the existing `modules/search`
(`SemanticSearchService` + Qdrant). That path is not affected by
`SEARCH_PROVIDER`.

## Which should I pick?

- **"I just want workspace search to work"** → `pg-trgm` (zero infra,
  works against existing Postgres, no separate index to maintain)
- **Production with typo tolerance and faceting** → `meilisearch`
- **Alternative to Meilisearch with simpler schema config** → `typesense`
- **Semantic / "find things similar to X" search** → keep using the
  existing `SemanticSearchService` (Qdrant) under `modules/search/`

## Per-provider setup

### pg-trgm (default)

No setup beyond what you already have. On first search, the provider:

1. Runs `CREATE EXTENSION IF NOT EXISTS pg_trgm` (idempotent)
2. Creates GIN indexes on each configured collection's search
   columns for fast trigram similarity lookup (workspaces/name+
   description, tasks/title+description, etc.)
3. Searches use `col % $query` (trigram match) OR `col ILIKE '%query%'`
   (substring match), scored by `similarity(name, $query)`

```
SEARCH_PROVIDER=pg-trgm
```

**Permissions**: if the app's Postgres user doesn't have
`CREATE EXTENSION` privilege, the provider logs a warning once and
falls back to plain `ILIKE`. Run this as a superuser to enable the
fast path:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

**Indexing**: no-op. The moment a row is committed to Postgres it's
searchable. No separate reindex step on schema changes.

**Not suitable for**: semantic/vector search, faceted search on
arbitrary fields. Graduate to Meilisearch / Typesense / Qdrant when
you need those.

**Security**: filter field names are matched against
`^[a-zA-Z_][a-zA-Z0-9_]*$` before being interpolated into SQL.
Attempts to inject via `{"name; DROP TABLE...": 1}` are logged and
dropped. Values are always bound via pg parameters.

### meilisearch

Run via `docker compose --profile meilisearch up -d` (once install
PR #27 lands) or any `getmeili/meilisearch` image.

```
SEARCH_PROVIDER=meilisearch
MEILI_URL=http://localhost:7700
MEILI_MASTER_KEY=your-master-key
```

Meilisearch "indexes" map 1:1 to our "collections" concept. The
provider translates our filter shape to Meili's string filter syntax:

```js
{ category: 'shoes', status: 'active' }
// → "category = 'shoes' AND status = 'active'"

{ price: { gte: 10, lte: 100 } }
// → "price >= 10 AND price <= 100"
```

**Faceting**: pass `facets: ['category', 'brand']` in the query;
Meilisearch returns counts in the response.

**Reindexing**: `reindex()` deletes all documents in the index and
re-uploads from the source iterator in batches of 1000.

### typesense

Run via `docker compose --profile typesense up -d` or any
`typesense/typesense` image.

```
SEARCH_PROVIDER=typesense
TYPESENSE_URL=http://localhost:8108
TYPESENSE_API_KEY=your-api-key
```

Typesense requires an explicit schema per collection. The provider's
default `reindex()` deletes the collection and recreates it with a
minimal `id: string, .*: auto` schema. For production, create the
collection yourself with properly typed fields (`price: float`,
`created_at: int64`, etc.) before calling `indexBatch()`.

**Filters**: translated to Typesense's `field:=value` syntax:

```js
{ category: 'shoes' }
// → "category:=`shoes`"

{ price: { gte: 10, lte: 100 } }
// → "price:>=10 && price:<=100"
```

Typesense uses backticks around string values to allow spaces.

### qdrant / weaviate / elasticsearch (planned)

These are listed in the factory as valid `SEARCH_PROVIDER` values but
currently log a warning and fall back to `none`. Follow-up PRs will
implement them, tracked under issue #22. Picking one now is a no-op
rather than a silent bug — you'll get a clear warning at startup.

### none (default if unset)

Every method throws `SearchProviderNotConfiguredError`. The startup
log prints which env var to set.

## Migration for existing operagrid callers

Modules that currently run ad-hoc `ILIKE '%q%'` queries over workspace
content should inject `SearchProviderService` and call
`search(collection, { q })` instead. Trigram similarity gives better
relevance than raw ILIKE, and the GIN index makes it fast enough for
the dashboard autocomplete path. The existing semantic search path
(`SemanticSearchService` / Qdrant) is untouched and still handles
embedding-similarity queries.

## Adding a new provider

1. Implement `SearchProvider` in
   `backend/src/modules/search-provider/providers/<name>.provider.ts`
2. Add a case to `createSearchProvider()` in `providers/index.ts`
3. Document env vars in this file and in `.env.example`
4. Add smoke-test coverage in
   `backend/scripts/smoke-test-search-providers.ts`
