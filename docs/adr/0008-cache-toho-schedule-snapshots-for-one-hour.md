# Cache TOHO Schedule Snapshots for One Hour

Easy Toho will cache successful Planning Window lookups and Schedule Snapshots for one hour, including Seat Sales Status. This deliberately trades real-time seat-status precision for fewer requests to TOHO Cinemas' undocumented schedule JSON API; failed TOHO requests are not cached, so temporary outages can recover on the next request.
