# Known Issues

- The former refresh-hydration HTTP 401 is no longer part of the active flow. Refresh is disabled; users must sign in again after a page reload.
- Access tokens are stateless and remain valid until expiration if copied before logout. Logout clears the in-memory client token and query cache but cannot revoke an already-issued token without server-side session/revocation state.

