# Login.jsx Update Plan

**Information Gathered:**

- Current Login.jsx generates name from email (`email.split("@")[0]`)
- No name input field → Backend rejects invalid generated name
- Backend requires proper name field

**Plan:**

1. Add `name` state
2. Name input ONLY in register mode (above email)
3. Frontend validation if name empty
4. Send user-provided `name` to `/auth/register`
5. Keep all other logic unchanged

**Dependent Files:** None

**Followup:** Test signup with valid name input
