# Source Adapters

Use this when adding a new cinema schedule website or a new cinema from an existing website.

## Read first

- `CONTEXT.md` for domain vocabulary.
- `docs/adr/0009-source-adapters-and-conservative-movie-identity.md` for the adapter decision.
- `src/lib/planning-window.ts` for Planning Window and Selected Day policy.
- `src/lib/schedule-model.ts` for the universal object contract.
- `src/lib/schedules.ts` for the adapter facade.
- `src/lib/toho-adapter.ts`, `src/lib/smt-adapter.ts`, and
  `src/lib/tjoy-adapter.ts` as implementation examples.
- The relevant Next.js docs under `node_modules/next/dist/docs/` before changing caching or data-fetching behavior.

## Adapter boundary

Each adapter returns the same app-level objects:

- `PlanningDay[]`
- `ScheduleResult`
- `MovieCard`
- `Showtime`

Construct every `MovieCard` through `createMovieCard` from
`schedule-model.ts`. The constructor owns source-neutral Movie Identity,
reader-facing title, card-level Language Presentation, and Published Showtime
ordering. Adapters supply already-parsed universal fields and keep provider
parsing behind their seam.

Parse provider calendars into source availability records containing only
`date` and `selectable`, then pass them to `createPlanningWindow`. The Planning
Window module owns Tokyo Day labels and the fixed today-plus-six-days range. A
date omitted by a successful Schedule Source response is not selectable; if the
calendar request fails entirely, call
`createPlanningWindow(undefined, new Date())` at the adapter orchestration seam
to preserve the fallback Planning Window while keeping the core clock explicit.

Keep provider-specific details inside the adapter:

- raw provider ids
- request URLs and URL conventions
- raw response shapes
- source-specific availability/status codes
- parsing quirks
- source-specific date formats

Do not add source-specific fields to the universal model unless the UI or aggregators can use them for every source.

## Ticketing links

Do not add ticket purchase or booking links to source adapters or the universal
schedule model. Tokyo Movie Times is for understanding Tokyo Cinema Screening options;
ticketing target sites are Japanese-language, source-specific purchase flows and
are intentionally out of scope.

## Availability

Map raw source statuses to `ShowtimeAvailability` for app logic:

- `available`
- `limited`
- `soldOut`
- `notSelling`
- `unknown`

Also preserve the reader-facing source label in `availabilityLabel`, for example `A · Plenty` or `◎余裕あり`.

## Showtime end times

Do not invent fake end times. If a Schedule Source publishes an explicit end
time, use it. If it publishes a runtime, adapters may compute an end time from
the Published Showtime start. If neither is available, return a missing end time
and let the UI omit the end-time label.

## Movie identity

Adapters should call `createMovieCard` from `schedule-model.ts`; it computes the
final Movie Identity. An adapter may call `movieIdentityId` earlier only when it
needs the same identity as a grouping key before the final Movie Card exists, as
the SMT adapter currently does.

The current rule intentionally favors avoiding false merges:

- normalize the English label
- remove source markers such as `Sub/`, `Dub/`, premium formats, and compact sequel spacing
- include runtime when available, but cross-cinema aggregation may tolerate
  small runtime differences for the same normalized English label
- merge variants such as subtitled, dubbed, premium format, and special events only when the base film identity is clear
- fallback unmatched non-English films to a source-scoped id

Do not trust provider movie ids for cross-source matching.

## Adding a cinema from an existing source

1. Confirm the provider website and theater identifiers from the live source.
2. Add the cinema to `CINEMA_CONFIG_REFERENCES` in `src/lib/cinemas.ts`.
3. Keep `name` user-facing and source-clear, for example `Hibiya Toho` or `Shinjuku Piccadilly`.
4. Set the private adapter config fields required by that adapter.
5. Verify the single-cinema page for at least one date with real showtimes.
6. Verify `/movies` if the cinema has English-watchable films for that date.

## Adding a new source

1. Create `src/lib/<source>-adapter.ts`.
2. Implement `getPlanningDays(config)` and `getSchedule(config, selectedDate)`.
3. Return only universal model objects from `schedule-model.ts`.
4. Add a private config type and source entry in `src/lib/cinemas.ts`.
5. Add a case to `src/lib/schedules.ts`.
6. Build Movie Cards with `createMovieCard`; build Planning Days with
   `createPlanningWindow`; and reuse shared helpers from `schedule-model.ts` for
   source-neutral language, format, and past-showtime filtering where possible.
7. If the source needs new shared behavior, add it to `schedule-model.ts` only when it remains source-neutral.

## Verification

Run:

```bash
npm run lint
npm run build
```

Use `agent-browser` to test:

- a single-cinema page for the new source
- `/movies?date=<date>` when the source has English-watchable films
- a movie detail page that should merge with another source, if one exists
- `/imax?date=<date>` if the source has IMAX-capable cinemas or should not affect the current IMAX list

Check browser errors after navigation. Console dev/HMR noise is acceptable in local development; app exceptions are not.
