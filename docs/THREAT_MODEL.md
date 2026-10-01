# Threat Model

## Protected boundaries

Concuryx protects the local machine, request templates, target authorization, project-owned artifacts, execution results, and reports from unintended disclosure or use against unapproved systems. Reference inputs are untrusted, read-only evidence and never executable dependencies.

## Allowed trust model

- Localhost and project-owned test services.
- Explicitly authorized endpoints listed in target configuration.
- Synthetic or project-owned request data and artifacts.
- Strict validation before future preparation or dispatch.

## Explicitly prohibited uses

- Credential extraction or browser-cookie harvesting.
- Production session, auth token, or integrity-token reuse.
- Residential proxies or proxy/IP/account rotation.
- CAPTCHA, anti-bot, anti-abuse, or integrity-control bypass.
- Rate-limit evasion.
- Third-party reward duplication or production claim automation.
- Stealth/evasion behavior.
- Automatic target discovery or arbitrary internet scanning.
- Copying production endpoints, operations, client IDs, headers, hashes, or target identifiers.

## Target authorization control

Future HTTP target support must require an explicit non-empty allowlist. Configuration validation must ensure the base URL uses HTTP(S) and its exact host, including port, appears in the allowlist. Runtime enforcement and redirect policy require approval before network execution exists.

## Phase 0 controls

- `_reference_inputs/` remains ignored and untracked.
- The supplied script is inspected as text and never executed.
- Contracts reject unknown fields and invalid boundaries.
- No request execution, server, retries, worker pool, external connection, analytics, or telemetry exists.

## Future threats requiring design

Redirect escape, DNS rebinding, credential leakage, artifact secrecy/expiry, request smuggling, malicious payloads, timeout/resource exhaustion, retry amplification, response-size limits, trace redaction, file permissions, and safe result retention must be addressed by the phase introducing each boundary.

