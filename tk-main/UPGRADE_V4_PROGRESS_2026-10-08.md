# SKY FIRST MEMBER DIGITAL CENTER — V4 source patch

## Implemented in this patch
- Removed 14 explicit full-page reload calls in admin member detail mutations, replaced with targeted member-tab refresh to retain admin context.
- Approval UI offers send / do not send email choice; approval API honors `send_email: false`.
- Approval notification no longer sends the temporary password in plaintext email. The existing one-time admin display of the temporary password is retained for controlled handover.
- Corrected support and contact mailto links in member account panel, public contact and support pages, and sidebar.
- Kept existing D1/R2 configuration, migrations and data intact.

## Important: not yet implemented / not production verified
- Full V4 scope (SPA registration and lookup, live statistics editor/count-up, full account-ban customization, premium role-based card studio, one-page CV export, CMS, advanced workflows) requires further engineering and production tests.
- No live D1/R2 migrations, mail delivery, or Cloudflare deploy were executed.
- Approval email currently relies on existing email integration. A password setup flow via expiring token should be implemented before automatic activation is considered complete.
- Other legacy `location.reload()` calls outside the admin-member detail screen remain to be reviewed.

## Checks
- `npm run check`: PASS
- `npm test`: PASS (release checks + 13/13 center/API integration checks)
