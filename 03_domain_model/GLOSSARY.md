# Glossary

```yaml
id: GLOSSARY
status: draft
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../BUSINESS.md
  - ../SYSTEM.md
```

## Terms

| Term | Meaning |
|---|---|
| Log entry | Structured payload accepted by `POST /api/logs`. |
| Service | Calling microservice identified by the `service` field. |
| Level | Severity value: `error`, `warn`, `info`, or `debug`. |
| Timestamp | ISO 8601 time associated with a log entry. |
| Duration | Request or operation duration in milliseconds, represented as `duration_ms`. |
| Metadata | Optional structured context attached to a log entry. |
| Admin read endpoint | Query or service-list endpoint protected by `AdminRoleGuard`. |
| Rotation | Daily file rollover using Winston daily-rotate-file settings. |
| Sensitive data | Secrets, raw production records, identifiers, authorization headers, or personal data that must not be logged or placed in IPS artifacts. |
