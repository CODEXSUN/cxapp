# Vibe Coding Guide

## Purpose

Vibe coding in CODEXSUN means using AI speed without losing product discipline.

The developer can move fast, explore ideas, and build with flow, but every result must still respect tenant safety, module boundaries, enterprise quality, and business correctness.

## Vibe Coding Mindset

Work in small clear loops:

1. State the intent.
2. Read the nearby context.
3. Make a focused change.
4. Check behavior.
5. Update notes if the product meaning changed.

Good vibe coding feels light, but it is not random. It keeps the system understandable after the session ends.

## Prompt Pattern For CODEIT

Use prompts like:

```text
Mode: Plan
Feature: Add garment size matrix to billing
Tenant impact: yes
Offline impact: maybe
Need: architecture notes, module boundary, data model, test plan
```

```text
Mode: Build
Task: Implement tenant-aware customer list API
Rules: follow module boundaries, include permission check, add tests
```

```text
Mode: Review
Scope: billing module changes
Focus: tenant leaks, GST correctness, offline risk, queue failures
```

```text
Mode: Debug
Issue: invoices sync twice after desktop reconnect
Need: root cause, safe fix, regression test
```

## Before Coding Checklist

Ask:

- What module owns this?
- Which tenant context is required?
- Which permission allows this?
- Is this platform, industry, or tenant-specific?
- Does subscription activation affect it?
- Does offline sync affect it?
- Does accounting, billing, or compliance depend on it?
- Does it publish or consume events?
- Does it need background jobs?
- Does ZERO or CODEIT need access to it?

## During Coding Rules

- Keep changes small.
- Follow existing patterns.
- Name business concepts clearly.
- Put business rules in domain or application layer.
- Keep UI focused on user work.
- Add tests around risky logic.
- Avoid building broad abstractions too early.
- Do not mix unrelated features.
- Do not hide tenant-specific behavior in shared code.

## After Coding Checklist

Confirm:

- The feature works for the intended tenant.
- Unauthorized users are blocked.
- Disabled modules stay disabled.
- Events and jobs include tenant context.
- Errors are clear.
- Tests cover important behavior.
- Docs changed if architecture or product rules changed.
- Changelog updated for visible or structural changes.

## Agent Output Style

CODEIT should produce:

- Short summary of what changed.
- Important files touched.
- Risks or assumptions.
- Tests run.
- Next useful action.

Avoid:

- Long generic explanations.
- Undocumented architecture changes.
- Guessing business rules without marking assumptions.
- Shipping AI-generated code without reading surrounding code.

## Fast But Clean Rule

If there is a conflict between speed and tenant/accounting/compliance safety, choose safety.

If there is a conflict between clever code and readable code, choose readable code.

If there is a conflict between custom hack and extension point, choose extension point.
