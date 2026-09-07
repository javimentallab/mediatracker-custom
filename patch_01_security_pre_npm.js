// Auto-generated mega-patch: patch_01_security_pre_npm.js
// Bundles 1 original patch_*.js scripts in execution order.
// Each constituent is wrapped in an IIFE so its top-level vars (const fs = ...)
// don't collide; `process.exit(0)` is rewritten to `return` so an early-exit
// idempotency guard inside one constituent doesn't abort the whole mega-patch.

// ===== patch_security_updates.js =====
;(() => {
// Security updates for CVE-flagged dependencies (HIGH/CRITICAL).
//
// Detected via Trivy scan on the base image:
//   - axios            0.29.0 → 0.30.0   (CVE-2025-27152, CVE-2025-58754, CVE-2026-25639) — HIGH SSRF/DoS
//   - fast-xml-parser  4.5.1  → 4.5.5    (CVE-2026-25896) — CRITICAL XSS via DOCTYPE
//   - form-data        4.0.1  → 4.0.4    (CVE-2025-7783) — CRITICAL unsafe random
//   - lodash           4.17.21→ 4.18.0   (CVE-2026-4800) — HIGH RCE via template imports
//   - path-to-regexp   0.1.12 → 0.1.13   (CVE-2026-4867) — HIGH ReDoS  (transitive via express)
//   - tar-fs           2.1.1  → 2.1.4    (CVE-2024-12905, CVE-2025-48387, CVE-2025-59343) — HIGH path traversal/symlink (transitive)
//   - nanoid           3.3.8  → 3.3.18   (CVE-2026-67213, CVE-2026-67214, CVE-2026-73086) — HIGH DoS + predictable IDs
//   - sharp            0.33.5 → 0.35.0   (GHSA-f88m-g3jw-g9cj: CVE-2026-33327/33328/35590/35591) — HIGH inherited libvips
//
// Strategy:
//   - Direct deps: bump in `dependencies` so `npm install` picks them up.
//   - Transitive deps: declare `overrides` so npm forces the version everywhere.
//
// Run as a Dockerfile RUN step (followed by `npm install --legacy-peer-deps`).

const fs = require('fs');
const pkgPath = '/app/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const before = JSON.stringify(pkg.dependencies);

pkg.dependencies = pkg.dependencies || {};
// Major bumps (third wave) — these are breaking changes upstream, but in our
// codebase the only surfaces touched are:
//   - axios:           response.data / error.response.data / axios.get/post.
//                      paramsSerializer is unused. AxiosHeaders class is
//                      backwards-compatible with plain-object access.
//   - fast-xml-parser: only XMLParser is used (goodreads.js); the CVE is on
//                      XMLBuilder which we don't touch. 5.x XMLParser API is
//                      backwards-compatible.
pkg.dependencies.axios = '^1.16.1';
pkg.dependencies['fast-xml-parser'] = '^5.8.0';
pkg.dependencies['form-data'] = '^4.0.4';
pkg.dependencies.lodash = '^4.18.0';
// ajv is a direct dep — npm rejects overrides on direct deps (EOVERRIDE), so
// bump it here (CVE: ReDoS via `$data` option, <=8.17.1).
pkg.dependencies.ajv = '^8.20.0';
// nanoid and sharp are direct deps too — same reason as ajv: an override on a
// direct dep is rejected with EOVERRIDE, so they get bumped in `dependencies`.
//
// nanoid stays on the 3.x line ON PURPOSE. nanoid 5.x is ESM-only and the
// compiled server loads it with `require('nanoid')` (utils.js, slug.js,
// controllers/token.js, server.js, logger/formatters.js and the
// 20220202231058_image.js migration), so 5.x would break startup outright.
// 3.3.18 covers all three CVEs (fixed in 3.3.12 / 3.3.16 / 3.3.18).
// CVE-2026-73086 is the one that actually bites here: token.js mints auth
// tokens with customRandom(urlAlphabet, 30, random).
pkg.dependencies.nanoid = '^3.3.18';
// sharp: the only call site is sharp(buffer).resize().webp().toFile() in
// utils.js (downloadAsset), an API that is unchanged in 0.34/0.35. The risk in
// this jump is not the API but the native binary on Alpine musl — hence the
// require('sharp') smoke test in the Dockerfile after npm install, so a binary
// that fails to load breaks the build instead of reaching production.
pkg.dependencies.sharp = '^0.35.0';

pkg.overrides = pkg.overrides || {};
// Plain global overrides (apply everywhere unless a deeper-nested rule wins).
pkg.overrides['path-to-regexp'] = '^0.1.13';
pkg.overrides['tar-fs'] = '^2.1.4';
pkg.overrides.axios = '^1.16.1';
pkg.overrides['fast-xml-parser'] = '^5.8.0';
pkg.overrides['form-data'] = '^4.0.4';
pkg.overrides.lodash = '^4.18.0';
// Second wave of CVE fixes (all minor bumps, no breaking changes):
//   - qs               <=6.14.1 → 6.15.x  (DoS via memory exhaustion in bracket parser)
//   - follow-redirects <=1.15.11 → 1.16.x (leaks Authorization headers cross-domain)
//   - fast-uri         <=3.1.1 → 3.1.x   (path traversal via %-encoded dot segments)
//   - @babel/runtime   <7.26.10 → 7.29.x (inefficient RegExp complexity)
//   - ajv              <=8.17.1 → 8.20.x (ReDoS with `$data` option)
pkg.overrides.qs = '^6.15.2';
pkg.overrides['follow-redirects'] = '^1.16.0';
pkg.overrides['fast-uri'] = '^3.1.2';
pkg.overrides['@babel/runtime'] = '^7.29.2';
pkg.overrides['on-headers'] = '^1.1.0'; // HTTP header manipulation (low) via express-session
// NOTE: ajv is in `dependencies` above — npm rejects overrides on direct deps.
// Explicit nested override for express → path-to-regexp because the global
// rule alone didn't propagate into express's bundled node_modules in our setup.
pkg.overrides.express = pkg.overrides.express || {};
pkg.overrides.express['path-to-regexp'] = '^0.1.13';

if (JSON.stringify(pkg.dependencies) === before && pkg.overrides && Object.keys(pkg.overrides).length === 0) {
  console.log('security updates: already applied');
  return /* was process.exit(0) */;
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('security updates: package.json updated');
console.log('  direct: axios, fast-xml-parser, form-data, lodash, ajv, nanoid, sharp');
console.log('  overrides: path-to-regexp, tar-fs (+ direct deps for transitive enforcement)');

})();

// NOTE: patch_configuration_redact_secrets and patch_locale_fr_complete used to
// live here but were moved to patch_02 (post-npm-install). The bonukai base
// image's `npm install` re-extracts /app/build/ from packages, which wiped any
// modification we made to /app/build/** before this step.
