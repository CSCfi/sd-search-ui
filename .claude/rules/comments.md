# CSC Discovery — Code Comments

A comment should reduce the effort needed to understand the code. It must not add another puzzle.

## Rules

- Explain why the code exists, not what the code visibly does.
- Comment only non-obvious constraints, decisions, or failure modes.
- Use plain English, short sentences, and explicit subjects.
- Put one idea per sentence. Separate distinct concerns.
- Name the relevant function or operation instead of using vague words
  such as "this", "it", or "called directly".
- Explain the consequence of breaking a constraint:
  "Calling logoutSession() here would deadlock."
- Avoid compressed technical shorthand:
  write "Both requests returned 401", not "Refresh 401 and retry still 401".
- Prefer 1–3 short lines. If more are needed, first check whether clearer
  naming or simpler code could remove the need for the comment.
- Keep comments accurate and update them when behavior changes.
- Before finishing, read each comment as a new maintainer would.
  Rewrite anything that requires decoding or rereading.
