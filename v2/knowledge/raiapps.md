---
title: RaiApps, RaiBudget and RaiClimbing
url: /projects/raiapps
---

## What RaiApps are

RaiApps are two apps Rodolfo Raimundo built in 2026 for his own use: RaiBudget, a budgeting app that syncs across devices and pulls bank and card transactions through Plaid, and RaiClimbing, a training tracker for climbing and general workouts. Both are Flutter apps on Supabase with the same pastel design language. Both hand part of the work to an LLM, which is risky around money and training loads unless the model never produces a number and never changes anything by itself.

## The shared agent pattern

RaiBudget and RaiClimbing handle the LLM the same way. Code computes the figures first, so the model only interprets numbers it didn't generate. The model judges what the numbers mean and drafts a report or recommendation. A server-side validator, with its own tests, decides what reaches the screen and rejects output that fails its checks. Anything binding waits for a person to approve it by hand: RaiBudget's reports are read-only, so nothing happens to an account unless Rodolfo does it himself, and a tap in RaiClimbing only applies changes already written out in the recommendation's text.

## RaiBudget: budgets and dashboard

RaiBudget runs on macOS, iOS and Android from one Flutter codebase. Each spending category gets a monthly limit, and the dashboard shows it filling up, with over and under states and month-over-month trend charts. Every signed-in device sees the same data in real time. Recategorizing a transaction once can save a rule, so the next matching transaction is filed automatically. A PIN or biometric lock guards the app on every device, and public sign-ups are off.

## RaiBudget: back end

RaiBudget's back end is Supabase: Postgres with row-level security on every table, realtime sync, edge functions and scheduled pg_cron jobs. The whole Plaid integration lives in edge functions, which create link tokens, exchange tokens, verify webhooks server-side and sync transactions incrementally, with a nightly job as the fallback. Plaid's secrets and access tokens sit in a table the app can't read. The app talks only to Postgres, and Plaid and the analysis routine reach the database only through edge functions. Rodolfo's first version took about three days, 184 commits and 24 database migrations, followed by several rounds of review.

## RaiBudget: analysis and investments

RaiBudget's Analysis tab is written by a scheduled Claude Code cloud routine, not by the app. Every few hours it checks whether a report is due. On a full run it pulls recent transactions and budgets through an edge function and writes back a structured report covering anomalies, budget-breach forecasts, recurring charges and subscriptions, savings suggestions and trends, laid out as tabs with charts and tables. The server computes every figure the report cites, and the routine's search queries never include an amount or an account. An admin can change how often it runs or force a refresh. A separate investments view shows portfolio value, holdings with their share of the portfolio, allocation and performance charts, and a second report covers the portfolio and gives no buy or sell advice.

## RaiClimbing: plans and logging

RaiClimbing is the training tracker Rodolfo uses on Android. The plan adjusts to how sessions actually went, which only works if the logging is exact. Plans are built from session types, eight built in plus user-defined ones, laid out in a week editor of day cards. Exercises are stored as data: each session type owns a roster of exercises, dosed per week by prescriptions, and every logged set records its load, count and whether it was done, so a ramp or a drop set is recorded exactly. A pain check-in before a session is scored for red flags and trims the loads in the next loading session. Climbs come in from the Tension Board through its API and feed a grade pyramid and trend charts, and a rest timer counts down on the lock screen through a foreground service.

## RaiClimbing: sync and analysis

RaiClimbing's training history syncs to Supabase as a single versioned document, with revision checks, conflict snapshots and JSON export and import, so a reinstall or an older build can't overwrite newer history. Past weeks keep the dose they were actually trained at. An LLM analysis reads an aggregated payload of the plan, sessions, climbs, volume and pain check-ins, returns strict JSON, and that becomes a report with up to eight recommendations. Some carry an action that changes the plan in one tap, like a new load for an exercise or an adjusted week. The server-side validator rejects any recommendation that doesn't state its proposed values in its own text, so a tap only applies what Rodolfo already read. Prompts are versioned like the rest of the code.
