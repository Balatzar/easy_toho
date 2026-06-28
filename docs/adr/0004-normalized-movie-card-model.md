# Return a Normalized Movie Card Model

The server will return app-specific Movie Card data to the UI instead of raw TOHO Cinemas response fields. This keeps source fetching, TOHO-only labeling, Language Presentation classification, and Unmatched Movie fallback logic behind the server boundary, so UI components render stable Easy Toho concepts even if upstream shapes change.
