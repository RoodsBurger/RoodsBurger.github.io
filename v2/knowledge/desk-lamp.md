---
title: Rising-Core Desk Lamp
url: /projects/desk-lamp
---

## What the rising-core desk lamp is

The rising-core desk lamp is a smart lamp that Rodolfo Raimundo designed and built in 2026, where brightness is a position. A brushless gimbal motor turns a lead screw, and a lit core carrying a warm and cool LED strip rides up and down the body. Every brightness change is a mechanical move, so the motor, the light and the smart-home state all have to agree on where the core is. One knob controls it locally, and Matter over WiFi connects it to Apple Home, Google Home and SmartThings. Rodolfo uses the lamp every day, and he sometimes catches himself distracted, just watching the core go up and down.

## How the lamp moves and lights

When a new brightness comes in, from the knob or from Matter, Rodolfo's firmware turns it into a target position. The light fades in over the first part of a rise and out over the last part of a descent, so motion speed is also fade speed. At rest the motor driver sleeps, which means no holding torque and no hum. The lead screw runs in closed loop, with a magnetic encoder giving real position feedback instead of counting motor steps. If someone stops the core by hand, the motor gives up after about half a second, takes wherever the core ended up as the new target, and reports the matching level back over Matter, so the Home app shows the level the lamp is actually at.

## Controls and smart-home integration

The desk lamp has one knob with a push button. Turning it moves the core. A single click turns the lamp on or off, a double click switches the knob between motor, brightness and color temperature modes, and a triple click steps through motion speed presets. A long hold re-homes the lead screw, and a longer one resets the lamp to factory settings, with a warning pulse before it commits. The lead screw homes once on first boot, and after that the position, brightness and color temperature survive power cycles. Over Matter the lamp is a color temperature light: the brightness slider drives the motor position and color temperature sets the warm and cool LED mix. Each lamp gets its own Matter identity, so several can share one home.

## Electronics and firmware

The desk lamp runs on an ESP32-S3 control board Rodolfo designed. The firmware is written in ESP-IDF with Espressif's Matter SDK and a vendored copy of the SimpleFOC library. The motor's field-oriented control loop gets one of the chip's two cores to itself, and WiFi, Bluetooth and Matter share the other, so radio traffic doesn't stall the motor. Updates arrive as signed over-the-air releases. The same board and firmware core also run Rodolfo's kinetic wall lamp.
