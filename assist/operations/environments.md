# Environments

## Purpose

CODEXSUN should have clear environments so development, testing, demos, and production work do not interfere with each other.

## Environment Types

### Local

Used by developers and CODEIT.

Purpose:

- Fast development.
- Module testing.
- Local tenant data.
- Local containers.
- Offline simulation.

### Development

Shared internal environment.

Purpose:

- Feature integration.
- Internal testing.
- Early API and UI validation.

### Staging

Production-like environment.

Purpose:

- Release candidate testing.
- Migration testing.
- Integration testing.
- Performance checks.
- Demo validation.

### Production

Customer environment.

Purpose:

- Live tenant operations.
- Business records.
- Compliance workflows.
- Real integrations.

### Sandbox

Customer or internal test environment.

Purpose:

- Customer training.
- Integration trials.
- Feature preview.
- Safe experimentation.

## Environment Rules

- Production data must not be copied to lower environments without masking sensitive data.
- Credentials must be different per environment.
- External integrations must have sandbox mode where possible.
- AI tools must clearly know the current environment.
- Logs must identify environment.
- Migrations should be tested before production.

## Configuration Rules

Configuration should include:

- Environment name.
- Database targets.
- Queue targets.
- File storage targets.
- Integration credentials.
- Feature flags.
- AI model settings.
- Logging level.
- Support access rules.

Secrets must not be committed to source control.

CODEXSUN should use one active `.env` file per running environment to avoid confusion. `.env.example` documents required variables without secrets. Environment variables must be validated with Zod at startup.

All API applications use the shared `API_HOST` bind address while retaining their app-specific API ports. Container bundles override the shared bind address to `0.0.0.0` inside the API environment anchor.
