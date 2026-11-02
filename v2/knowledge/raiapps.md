---
title: RaiApps, Toucan and RaiClimbing
url: /projects/raiapps
---

## What RaiApps are

RaiApps are two apps Rodolfo Raimundo built in 2026 for his own use: Toucan, a household budgeting and investing app that pulls bank, card and brokerage data through Plaid, and RaiClimbing, a training tracker for climbing and general workouts. Toucan was called RaiBudget until October 2026, when it was renamed. Both are Flutter apps. Both hand part of the work to an LLM, which is risky around money and training loads unless the model never produces a number and never changes anything by itself.

## The shared agent pattern

Toucan and RaiClimbing handle the LLM the same way. Code computes the figures first, so the model only writes about numbers it didn't generate. A server-side validator, with its own tests, decides what reaches the screen and rejects output that fails its checks. Anything binding waits for a person: Toucan only reads accounts, so nothing happens to an account unless someone in the household does it, and a tap in RaiClimbing only applies changes already written out in the recommendation's text.

## Toucan: what it does

Toucan started in July 2026 as RaiBudget, Rodolfo's personal budgeting app, and grew into an app his household shares. It runs on macOS, iOS and Android from one Flutter codebase. Members share monthly category budgets, goals, a dashboard, an activity feed, a spending report and an Invest tab. Each member can also keep accounts private: only they see them, in a Personal view with its own budgets, goals and reports. Recategorizing a transaction once can save a rule for the next one, refunds reduce their category's spending, and transactions export as CSV. A PIN or biometric lock guards the app, and it opens offline from an encrypted copy of its last data. An interactive tour introduces each page on first launch.

## Toucan: design

Rodolfo wrote a design system for Toucan called Plumage. Every screen has a dark band holding the page's title, one figure and one small chart, over a light sheet of plain rows. The band's curved edge runs as one continuous line from page to page, so swiping between tabs slides along it. Every band chart reads by touch: the Dashboard's spending line, the Budgets tab's range of hills (one per category budget), the Analysis tab's ridges and the Invest tab's portfolio value by quarter. The band folds away as the page scrolls. The app has light and dark themes. The demo videos on the project page show the real app running on a made-up household. A Flutter test drives the app and records each frame, and the phone around the screen is a still image rendered once in Blender.

## Toucan: back end

Toucan moved from Supabase to AWS on October 21, 2026. Postgres 17 runs on RDS with row-level security on every table, behind PostgREST on Lambda; sign-in is Cognito, with Google or email; the server functions run on Lambda; and the whole setup is Terraform. The app talks only to the API. It checks for changes every 30 seconds while open, so another member's edit or a bank sync shows within half a minute. Plaid access tokens are sealed with a KMS key that only the Plaid functions can use. Reading household data or server secrets from the AWS console takes a deliberate change, and every such change emails an alert. The AWS bill is about $16 to $17 a month. The repository passed 360 pull requests and about 690 commits between July and November 2026.

## Toucan: spending analysis

Toucan's Analysis tab is a spending report written by a worker container on AWS Fargate that runs every 15 minutes and reaches the database only through the API. Code builds every fact first: budget pace and projections, recurring charges and subscriptions, savings rate, net worth history, goals and a money flow from income to spending, saving and investing. One OpenAI call then writes only words: a one-line summary, a short analyst note per chart, and two to four recommendations. Every dollar amount and percentage in the reply must trace back to a figure the writer was given, or the reply is retried once and then the job fails. Member names and person-to-person payees are replaced with aliases before the call. Each household and each private view has its own monthly LLM budget, and all LLM calls stop at $19 a month.

## Toucan: investing

Toucan's Invest tab runs on a quant engine Rodolfo wrote in Python. Each weekday it forecasts volatility with the best of EWMA, GJR-GARCH and HAR-RV models, sets a return outlook from current yields and valuations, measures factor exposures and stress tests, and scores signals such as momentum, quality and value. It then issues recommendations, like trimming a position or harvesting a tax loss, each with a stated confidence. Every recommendation is scored once it matures, and a confidence level is demoted when its hit rate falls short. The Sandbox replays past recommendations on the household's own portfolio on historical prices, after taxes and trading costs, to show what following them would have done. Written notes come from OpenAI under the same rule as the spending report, and a weekly research pass adds news on public tickers only. Nothing trades by itself.

## RaiClimbing: plans and logging

RaiClimbing is the training tracker Rodolfo uses on Android. The plan adjusts to how sessions actually went, which only works if the logging is exact. Plans are built from session types, eight built in plus user-defined ones, laid out in a week editor of day cards. Exercises are stored as data: each session type owns a roster of exercises, dosed per week by prescriptions, and every logged set records its load, count and whether it was done, so a ramp or a drop set is recorded exactly. A pain check-in before a session is scored for red flags and trims the loads in the next loading session. Climbs come in from the Tension Board through its API and feed a grade pyramid and trend charts, and a rest timer counts down on the lock screen through a foreground service.

## RaiClimbing: sync and analysis

RaiClimbing's training history syncs to Supabase as a single versioned document, with revision checks, conflict snapshots and JSON export and import, so a reinstall or an older build can't overwrite newer history. Past weeks keep the dose they were actually trained at. An LLM analysis reads an aggregated payload of the plan, sessions, climbs, volume and pain check-ins, returns strict JSON, and that becomes a report with up to eight recommendations. Some carry an action that changes the plan in one tap, like a new load for an exercise or an adjusted week. The server-side validator rejects any recommendation that doesn't state its proposed values in its own text, so a tap only applies what Rodolfo already read. Prompts are versioned like the rest of the code.
