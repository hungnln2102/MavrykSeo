# Security Scan Remediation Runbook

## Scope

The CI `security` job blocks pull requests and changes to `main` when it detects:

- committed secrets using Gitleaks;
- high or critical, fixable dependency vulnerabilities using Trivy;
- high or critical container or Docker Compose misconfigurations using Trivy.

Scan output and artifacts are intentionally not uploaded. They can contain file paths, configuration context, or potential secret matches. Review failures only in the restricted CI log for the pull request.

## Triage

1. Confirm the finding applies to code or configuration in the change; do not dismiss findings by title alone.
2. Classify it as a secret, dependency vulnerability, or configuration issue.
3. Record the affected component, severity, exposure path, owner, and target remediation date in the pull request or tracked security issue.
4. Treat a potentially real secret as an incident, even when it appears only in Git history or test data.

## Secret Findings

1. Revoke or rotate the credential at its provider immediately.
2. Remove the credential from active code and configuration; use environment injection or the approved secret manager instead.
3. Replace any required local value with an explicitly non-production placeholder in `.env.example`.
4. If the secret reached Git history, coordinate a history-rewrite decision with the repository owner after rotation; do not assume history removal alone revokes access.
5. Re-run the scan and document the rotation and verification without copying the secret into the ticket or logs.

## Dependency Vulnerabilities

1. Prefer upgrading the direct dependency to a version that removes the vulnerability.
2. If the dependency is transitive, update its parent dependency or use a narrowly scoped package-manager override with an expiry and owner.
3. Confirm the vulnerable code path is removed or mitigated; upgrading a lockfile without validating runtime compatibility is insufficient.
4. Run the affected tests, typecheck, and build before merging.
5. A high or critical finding may be temporarily waived only with a documented owner, expiry date, compensating control, and explicit security approval. The CI rule must not be silently weakened.

## Container and Compose Misconfigurations

1. Fix the Dockerfile or Compose configuration at source. Do not suppress a rule to retain an unsafe default.
2. Recheck secret handling, exposed ports, user privileges, image provenance, and read/write filesystem requirements.
3. Rebuild and run the affected service locally; preserve tenant boundaries and never add production secrets to images.
4. Document any justified exception with owner, expiry, compensating control, and explicit security approval.

## Release Gate

No high or critical finding may be merged or released without a recorded remediation or approved, time-bound exception. Re-run the CI `security` job after remediation and link the passing run in the pull request.
