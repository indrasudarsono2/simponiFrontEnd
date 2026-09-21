# Screen Monitoring Rollback

Set the following frontend environment variable and restart the Nuxt application:

```env
NUXT_PUBLIC_SCREEN_MONITORING_ENABLED=false
```

This temporarily disables both screen and camera monitoring, allowing an examination to run from an HTTP LAN address. The backend and database do not need to be rolled back.

Use this setting only for controlled development or testing. Production examinations should use HTTPS and keep monitoring enabled.

To enable screen monitoring again, set the value to `true` and restart Nuxt.
