---
status: deferred to v2
---

# Use Leaflet and OpenStreetMap for the Cinema Map

Easy Toho eventually needs a real Tokyo map for choosing a Cinema, but version one will ship without a map so the app can answer the immediate showtime-planning need faster. When the map is added on the home planner, the Cinema selector will offer Map and List tabs. The map will use Leaflet with OpenStreetMap-derived CARTO basemap tiles because it gives us real geography, English/Latin map labels, and simple selectable pins without API-key setup, Google Maps billing, or the design burden of maintaining a custom schematic map.

Selecting a Cinema pin will update the same URL-backed planner state as selecting a Cinema from the list: `/?cinema=<slug>&date=<date>`. This keeps refresh, back-button, and share behavior aligned with ADR-0005 while allowing the map and list to be alternate views of the same Cinema selection. The Map tab will be the default selector view because the feature exists to make Tokyo geography visible before the user chooses a Cinema. Cinema coordinates will be curated manually in static Cinema reference data rather than fetched through runtime geocoding.

The Map/List tab selection itself will remain local UI state and will not be added to the URL. Shared planner links should preserve the selected Cinema and Selected Day, not the user's last selector presentation.

The current map viewport will also remain local UI state. Selecting a Cinema from the map updates the URL-backed Cinema selection without resetting the user's current map center or zoom.

Unselected map pin labels will show the Cinema name only. Area labels, IMAX capability, and schedule details remain outside the default pin label so the map stays readable.

The initial map viewport will fit all Tokyo Cinemas rather than zooming into central Tokyo, so far-west and outer Tokyo Cinemas remain visible during selection.

The selected Cinema pin will be visually highlighted, but schedule detail will stay in the existing planner panel. The map explains geography; the schedule panel remains responsible for Movie Cards and Published Showtimes.

The first map will not cluster nearby Cinemas. Cinemas remain separately selectable even when physically close, and curated coordinates may use a slight display offset when two separate Cinemas would otherwise be difficult to select.

The first map will not request or display the user's current location. It answers where Cinemas are in Tokyo, without browser permission prompts or user-location persistence.

The List tab remains a first-class fallback if the map or external OpenStreetMap tiles fail to load.

The map selector will show all Tokyo Cinemas from static reference data, independent of whether a Cinema's schedule fetch succeeds for the Selected Day.

Map pins will not visually distinguish IMAX-capable Cinemas in the first version.

The map/list selector will be a client-side component because Leaflet depends on browser APIs. Schedule fetching and Movie Card rendering will remain server-side, driven by the selected `cinema` and `date` URL parameters.

For a Multi-Site Cinema, the map will use one curated primary public access coordinate rather than splitting a single user-facing Cinema into multiple pins during this feature.
