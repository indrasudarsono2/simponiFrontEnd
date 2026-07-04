# Screen Monitoring Rollback

Set the following frontend environment variable and restart the Nuxt application:

```env
NUXT_PUBLIC_SCREEN_MONITORING_ENABLED=false
```

This restores the previous camera-only behavior. The `/api/preview` endpoint remains backward compatible with the original single `file` upload, so the backend and database do not need to be rolled back.

To enable screen monitoring again, set the value to `true` and restart Nuxt.
