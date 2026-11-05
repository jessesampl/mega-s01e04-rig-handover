---
name: plan-to-issues
description: Split this repo's plan.md into GitHub issues with gh, one per unit of work, after a human has reviewed the split. Use when a plan is ready and has no issues yet.
---

# plan-to-issues

Turns `plan.md` into GitHub issues that workers can pick up cold. Easiest with `gh`, authenticated,
in a shell this agent can run.

## Steps

1. Read `plan.md`, `AGENTS.md` and `docs/adr/`.
2. Draft the split as a table: title · plan section · scope · done when · blocked by.
   One issue per unit of work.
3. **Stop and show the table to the human.** Publish nothing until they approve it.
4. Ask the human what every issue here must carry (fields, labels, wording), unless it is
   already written down in this session or in the repo. In this repo it is (see "Issue shape").
5. Create each issue in dependency order, so blocked-by can cite real numbers:

   ```sh
   gh issue create --title "<title>" --body-file <tmp.md>
   ```

6. Record every issue URL from gh's output (not from memory) and reply with the list.

Closing one, with the closing comment from AGENTS.md:

```sh
gh issue close <n> -c "<closing comment>"
```

## Issue shape

Agreed with the human for plan morning-digest (2026-10-30). Every issue carries:

- The label `plan:<plan>`, from the plan's frontmatter (`plan:morning-digest`). Create it once
  with `gh label create` if the repo doesn't have it.
- A body that opens with `Source: plan.md § <n>`, using the most specific section (`§ 2a`, not
  `§ 2`). A section split into several issues gives each the same source line.
- Then three headings: `## Scope` (what the issue covers), `## Done when` (the plan's
  condition, word for word) and `## Blocked by` (issue numbers, or `None`).

A step whose "Done when" depends on someone outside the lane (a reviewer, a deploy, a reply)
stays open until they confirm, not until you have sent it. Anything that must wait for it, such
as a clean-up, lists it under `Blocked by`.

## No `gh`

Steps 1–4 hold either way. GitHub reachable another way (a connector, the REST API, the web UI):
the same issues, made that way. GitHub issues out of reach altogether: write them as files in
`docs/issues/`, format in ADR 0004, then commit and push.

## Don'ts

- Don't paste the whole plan into one issue, and don't keep issues only in chat.
- Don't invent sections the plan doesn't have. If the plan is unclear, ask.
- Don't build titles and bodies from parallel shell arrays: zsh counts from 1, bash from 0, and
  an off-by-one puts every body on the wrong issue. One body file per issue, named by its order.
