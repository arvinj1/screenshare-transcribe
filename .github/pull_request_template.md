## Summary
<!-- What does this PR do? -->

## Preview / Demo
- Vercel Preview: <!-- paste URL here (or it will be inserted by intent-forge-release in pr_body.md) -->

## IntentForge Artifacts
- Requirements: `.intent-forge/artifacts/000_intake/requirements.yaml`
- Scope: `.intent-forge/artifacts/000_intake/scope.yaml`
- Architecture: `.intent-forge/artifacts/010_planning/architecture.yaml`
- Tasks: `.intent-forge/artifacts/010_planning/tasks.yaml`
- Jira Payload: `.intent-forge/artifacts/020_jira/jira_payload.json`
- Implementation Log: `.intent-forge/artifacts/030_implementation/implementation_log.yaml`
- Closeout: `.intent-forge/artifacts/900_state/cost_report.md`

## How to Test
1. `npm install`
2. `npm run dev`
3. Open `http://localhost:5173`
4. Click **Start Sharing**
5. Confirm OCR text appears on right
6. Click **Stop** and confirm summary appears

## Checklist
- [ ] `npm run build` passes
- [ ] Screen share permission works in Chrome
- [ ] OCR produces text on at least one sample
- [ ] Summary generated on stop

## Notes / Follow-ups
<!-- Any known issues or next steps -->
