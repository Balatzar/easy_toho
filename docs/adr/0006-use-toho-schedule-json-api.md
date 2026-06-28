# Use TOHO's Schedule JSON API

Easy Toho will fetch live screening data from TOHO Cinemas' client-loaded schedule JSON endpoints rather than scraping the rendered schedule page. The endpoint is public but undocumented, so it may change without notice; the tradeoff is worthwhile for the first version because it provides structured Movie, screen, format, runtime, rating, and Published Showtime data with much less parsing fragility than rendered HTML.
