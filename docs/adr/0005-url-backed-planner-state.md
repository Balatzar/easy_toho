# Keep Planner State in the URL

The selected day and selected Cinema will be represented in the URL query string rather than hidden client state. This gives Easy Toho reliable refresh, back-button, and share behavior without adding persistence, while keeping date and Cinema selection explicit at the route boundary.
