# Easy Toho

Easy Toho helps English-speaking moviegoers understand cinema screening options in Tokyo without navigating Japanese cinema websites.

## Language

**Cinema Screening**:
A scheduled public showing at a Cinema in Tokyo, regardless of the film's producer, distributor, or Schedule Source.
_Avoid_: TOHO movie

**Cinema**:
A specific movie venue where screenings take place, such as TOHO Cinemas Shinjuku or Shinjuku Piccadilly.
_Avoid_: Location, theater

**Cinema Map**:
A geographic map of Tokyo Cinemas used to understand where Cinemas are in Tokyo and choose a Cinema on the Selected Day.
_Avoid_: Movie map, location list

**Schedule Source**:
An external cinema website that publishes schedule data for one or more Cinemas, such as TOHO Cinemas, SMT Cinemas, or T-Joy. SMT Cinemas is the Schedule Source for venues on `smt-cinema.com`, including Shinjuku Piccadilly. T-Joy is the Schedule Source for Shinjuku Wald 9, T-Joy SEIBU Oizumi, and T-Joy PRINCE Shinagawa.
_Avoid_: Cinema, venue, source system

**Shared Schedule Code Cinema**:
A Cinema that shares a TOHO schedule code with another Cinema but remains a separate user-facing Cinema, such as TOHO Cinemas Hibiya and TOHO Cinemas Chanter.
_Avoid_: Combined cinema, merged venue

**Multi-Site Cinema**:
A single user-facing Cinema whose screenings are listed under one Cinema but whose auditoriums or public entrances span multiple nearby buildings, such as Kinshicho Toho.
_Avoid_: Split cinema, duplicate cinema

**Tokyo Cinema**:
A Cinema whose official address is in Tokyo prefecture.
_Avoid_: Tokyo location, central Tokyo cinema

**Cinema IMAX Capability**:
A static Cinema-level reference label indicating whether the Cinema has an IMAX or IMAX Laser auditorium. It does not guarantee the selected Movie has an IMAX Published Showtime that day.
_Avoid_: IMAX showtime availability, IMAX movie

**IMAX Screening**:
A Cinema Screening whose Screening Format includes IMAX or IMAX Laser on the Selected Day.
_Avoid_: IMAX-capable cinema, IMAX movie

**Screening Format**:
The presentation attributes that affect the viewing experience, such as IMAX, TCX, MX4D, Dolby Atmos, 2D or 3D, subtitled, or dubbed.
_Avoid_: Screen kind, screen type

**Movie**:
A film that has at least one Cinema Screening.
_Avoid_: Title

**Movie Identity**:
The Easy Toho concept used to merge source-local movie records when different Schedule Sources appear to describe the same Movie. Screening variants such as subtitled, dubbed, premium-format, or special-event rows belong to one Movie Identity when the base film can be identified confidently.
_Avoid_: Source movie code, canonical database ID

**TOHO Movie Group**:
The set of TOHO Cinemas schedule rows that share the same `mcode` and represent variants of the same Movie, such as subtitled, dubbed, or premium-format rows.
_Avoid_: Title group, duplicate movie

**TOHO Movie Code**:
The TOHO Cinemas source identifier that groups schedule variants of the same Movie across Cinema schedules.
_Avoid_: Movie slug, canonical movie ID

**Source Movie Label**:
The movie name as it appears in TOHO Cinemas screening data, usually in Japanese.
_Avoid_: Japanese title

**English Movie Label**:
The reader-facing English movie name provided by TOHO Cinemas, such as `SUPERGIRL / SUB`. It is displayed prominently but remains source data, not an independently verified canonical title.
_Avoid_: Translation, English Movie Identity

**Movie Artwork**:
The reader-facing image for a Movie when TOHO Cinemas provides one through its movie detail pages.
_Avoid_: Poster enrichment, TMDB poster

**Unmatched Movie**:
A Movie whose Source Movie Label does not have a usable English Movie Label. Its screenings remain visible even when English labeling fails.
_Avoid_: Missing movie, failed movie

**Planning Window**:
The selectable schedule range covering today and the next six days.
_Avoid_: Date range, booking horizon

**Selected Day**:
The calendar day chosen from the Planning Window. Screening results are scoped to the whole day, not to a selected hour.
_Avoid_: Time filter, hour selection

**Tokyo Day**:
A calendar day interpreted in the Asia/Tokyo timezone for date tabs, showtimes, and Planning Window boundaries.
_Avoid_: Local day, browser day

**Movie Card**:
The result view for one Movie on a selected day at a selected Cinema, showing its English Movie Label or Unmatched Movie fallback, Source Movie Label, Movie Artwork when available, runtime when available, rating when available, Screening Formats, showtimes, and Cinema name.
_Avoid_: Movie result, title card

**Published Showtime**:
The scheduled start time for a Cinema Screening. It does not imply ticket or seat availability.
_Avoid_: Available time, ticket availability

**Schedule Snapshot**:
The Schedule Source data for one Cinema and Selected Day, fresh enough for planning when captured within the last hour. It includes Published Showtimes and Showtime Availability, so availability may lag the source website by up to one hour.
_Avoid_: Live schedule, real-time schedule

**Movie Projection List**:
The complete set of Published Showtimes for one Movie on a Selected Day across Tokyo Cinemas, including both English-Watchable Screenings and Japanese-Language Screenings.
_Avoid_: Available projections, English-only projections

**Partial Schedule Result**:
A cross-Cinema schedule result that includes successfully fetched Cinema schedules while naming any Cinemas whose live TOHO data could not be loaded.
_Avoid_: Failed search, unreliable result

**Showtime Availability**:
The sales state for a Published Showtime, such as available, limited, sold out, not selling, or unknown. Easy Toho can compare it through source-neutral categories, but the reader-facing label should preserve the Schedule Source's own availability wording or marker for that Cinema.
_Avoid_: Seat count, TOHO seat status

**Language Presentation**:
The audio and subtitle information that determines whether a screening is watchable for an English-speaking moviegoer.
_Avoid_: Language format, subtitle info

**English-Watchable Screening**:
A Cinema Screening whose Language Presentation indicates original English audio with Japanese subtitles, or English subtitles.
_Avoid_: English movie, foreign movie

**English-Watchable Movie**:
A Movie that has at least one English-Watchable Screening on the Selected Day at any Tokyo Cinema.
_Avoid_: Available in English movie, English title

**IMAX-Available Movie**:
A Movie that has at least one IMAX Screening on the Selected Day at any Tokyo Cinema.
_Avoid_: IMAX movie, movie in an IMAX-capable Cinema

**Japanese-Language Screening**:
A Cinema Screening whose Language Presentation does not indicate English-watchable subtitles or audio. It remains visible below English-Watchable Screenings.
_Avoid_: Unknown movie, unclear screening
