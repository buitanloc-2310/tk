# Cloudflare deploy root

This outer directory is intentionally the repository/deploy root.
The application source remains in `tk-main/`.
Cloudflare may run the unchanged command:

    npx wrangler deploy

The root `wrangler.jsonc` points Wrangler to `tk-main/src/index.js`, `tk-main/public`, and `tk-main/migrations`.
