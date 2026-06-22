// Loads root .env for local test runs via dotenv's default (no-override)
// behavior: pre-set shell/CI env is not overwritten. If override is ever
// enabled, revisit CI safety (CI should inject via env:, not a .env file).
import 'dotenv/config';
