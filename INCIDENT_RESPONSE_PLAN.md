# Incident Response Plan

## 1. Incident Detection
- Trigger sources: monitoring alerts, Snyk/CI failures, user reports.
- Initial triage target: within 15 minutes.

## 2. Response Protocols
1. Classify severity (SEV-1 to SEV-4).
2. Contain impact (traffic shaping, rollback, feature flag disable).
3. Preserve evidence (logs, metrics, deployment IDs).
4. Begin recovery and validation checks.

## 3. Escalation Procedures
- SEV-1/SEV-2: immediate on-call escalation.
- Notify security owner and engineering lead.
- Engage external vendors if third-party systems are affected.

## 4. Communication Templates
- **Internal update:** incident ID, severity, impact, owner, ETA.
- **Customer update:** impact summary, mitigation underway, next update ETA.
- **Resolution update:** root cause, fix applied, prevention actions.

## 5. Post-Incident Review
- Complete RCA within 5 business days.
- Track corrective actions with owners and due dates.
- Validate long-term fixes through monitoring and tests.

## 6. Lessons Learned Tracking
- Maintain an incident registry.
- Review repeated failure patterns quarterly.
- Feed outcomes into security training and deployment checklist.
