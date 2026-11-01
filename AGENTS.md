# Project rules

- Expert applications must be written through a `SECURITY DEFINER` RPC (`apply_as_expert`), never a client-side insert into `experts`: Row Level Security only lets admins insert there, so a direct insert is rejected and the applicant's submission is silently lost.
- `experts.applicant_email` is the marker that separates a genuine application from a seeded catalogue listing; admin approval screens must key off it rather than off `verified` alone.
