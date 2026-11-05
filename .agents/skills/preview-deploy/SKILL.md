---
name: preview-deploy
description: Put a rig page on its public preview link (GitHub Pages) for review, check it opens for a stranger, and take the lane marker off it afterwards. Use when a plan has a "Preview for review" or "Clean up" step.
---

# preview-deploy

Previews follow ADR 0003: one self-contained HTML file on a public HTTPS link we can upload
over, never committed to the repo. Here that is GitHub Pages, deployed as an artifact by
`.github/workflows/preview.yml`, so the HTML never enters git history.

Each deploy publishes a page anyone can open. Ask the human before every run, saying what goes
up, where, and how to undo it (run again, or turn Pages off).

## Once per repo

Pages must deploy from Actions, not from a branch:

```sh
gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow
```

## Deploy with the marker (review)

```sh
gh workflow run preview.yml -f marker=<LANE_MARKER>
gh run watch <run id> --exit-status
```

The workflow runs rig in CI, saves the page with `curl` (a command, not a browser save) and
deploys it. To preview a page other than `/digest/2026-10-28`, change the path in the
workflow's save step.

## Check it like a stranger

Before sending the link anywhere, fetch it from outside GitHub:

```sh
curl -s -o page.html -w '%{http_code}\n' https://<owner>.github.io/<repo>/
grep -c '<LANE_MARKER>' page.html
```

Expect `200`, and the marker once. Compare with a local save of the same page if you have one.
Pages caches for up to 10 minutes, so add `?v=<timestamp>` when checking straight after a deploy.

## Take the marker off (clean-up)

Only after the review is in. Run the same workflow with an empty marker, so the same link gets
the clean copy:

```sh
gh workflow run preview.yml -f marker=
```

Then check again: `200`, the marker count is `0`, and the banner reads "no marker set".
