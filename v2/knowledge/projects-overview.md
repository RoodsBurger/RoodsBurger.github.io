---
title: Rodolfo Raimundo's Projects
url: /#projects
---

## Main portfolio projects

Rodolfo Raimundo's site features eight projects, in the site's order:

- Tobias: a 3D-printed quadruped robot that walks on a policy trained with reinforcement learning (Soft Actor-Critic) in simulation, running on a Raspberry Pi 4 that drives eight bus servos.
- RaiApps: two Flutter apps on Supabase that Rodolfo built for his own use, RaiBudget (budgeting that syncs across devices, with Plaid) and RaiClimbing (a climbing training tracker), with LLM reports that never compute a number or change anything on their own.
- Rising-Core Desk Lamp: a desk lamp that sets brightness by raising a lit core on a lead screw, with a brushless motor, one knob and Matter over WiFi. Rodolfo uses it every day.
- Precision Coffee Grinder: a hand grinder turned into a motorized appliance, with a Raspberry Pi, a stepper-driven burr, an auger doser and a round touchscreen. Rodolfo built it because he makes espresso every day.
- TidyNET: a robotic tidying system built in Columbia's Creative Machines Lab, where a diffusion model generates a tidy layout from a photo and a WidowX 200 robot arm rearranges the real objects to match.
- Kinetic Wall Lamp: a wall-mounted lamp with no buttons. Knocking its pendulum arm steps it to the next held position, and a light concept in development uses colored plates on the wall to set the light's color.
- Artificial Synaptic Pruning: a Fall 2020 study of synaptic pruning in neural networks, where deleting 80% to 95% of the weights improved test performance.
- RAG Chat Assistant: the site's retrieval-augmented chat, where Cohere embeddings and reranking pull passages from the site's own content and Command A answers from them in a streamed reply.

## Smaller side projects

Beyond the portfolio, Rodolfo has worked on other projects. In 2019 he was Technology Lead of the Columbia Space Initiative team whose payload flew on Blue Origin's New Shepard NS-12 mission, launched December 11, 2019. The payload studied how microgravity affects gene expression in retinal glial cells. Rodolfo developed the circuits and code for its micro-camera module, its fluid injection system and its communication link to the rocket, using Python and EAGLE, and designed a custom H-bridge controller for the payload's motors. He was the team's on-site technical specialist at the launch in West Texas.

## Smaller tools and builds

Rodolfo has also built several smaller projects. eagle-pcb-studio is an open-source Claude Agent Skill, MIT licensed and built in June 2026, that generates an unrouted board from an EAGLE or Fusion Electronics schematic and reviews designs for manufacturability, trace widths and Gerber issues. scale is a Raspberry Pi Zero load-cell scale that pairs with his coffee grinder; Rodolfo wrote his own HX711 driver after the standard library returned corrupted readings, and kept the failed approaches in the repository with notes. LeagueOverlay is a SwiftUI macOS overlay for League of Legends that reads the game's live client API to track objective and respawn timers.
