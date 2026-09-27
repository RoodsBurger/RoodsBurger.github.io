---
title: Kinetic Wall Lamp
url: /projects/wall-lamp
---

## What the kinetic wall lamp is

The kinetic wall lamp is a wall-mounted smart lamp that Rodolfo Raimundo started in September 2026 and is still developing. It is a pendulum arm on a brushless gimbal motor, with no buttons or switches anywhere on it. The arm is the only physical input, so the motor that moves it also has to notice when someone hits it. Knocking the arm moves it from one held position to the next in the direction it was pushed. Matter over WiFi exposes on and off, brightness and color temperature to Apple Home, Google Home and SmartThings, for when getting up to knock on a lamp isn't an option.

## Knock to move

The kinetic wall lamp senses knocks through the motor's own encoder rather than a separate sensor. One knock steps the arm one position in the direction it was pushed, and a quick second knock on the same side sends it all the way to that side's end position. The motion settles without overshoot. At rest, Rodolfo's firmware puts the motor driver to sleep, and the arm holds its position through the friction of the gear reduction alone, so staying put costs no power. On power-up the lamp restores its last resting position from memory, with no calibration routine.

## The light

The light concept for the wall lamp puts a small light at the end of the arm, facing a row of colored plates mounted flush on the wall. The room only sees the light reflected off whichever plate the arm points at, so the plate sets the color, and knocking the arm to a new position changes the plate. A warm and cool LED strip drives the light, with Matter handling on and off and brightness. Rodolfo is still working on this head: it is a design and hasn't been built into a finished lamp yet.

## Why a cycloidal reduction instead of a planetary gearbox

Holding the arm with the driver asleep only works if the reduction gives the motor enough torque to move the arm and enough friction to hold it. Rodolfo looked at direct drive first, then designed and printed a planetary reduction. The 3D-printed cycloidal reduction, at a higher ratio on the same gimbal motor, is the one that moves the arm and holds it. He documented each option with its printed parts, print settings, assembly steps and the firmware changes it needed.

## Electronics and firmware

The kinetic wall lamp reuses the ESP32-S3 control board from Rodolfo's rising-core desk lamp unchanged. Its firmware is a fork of the desk lamp's, with its SimpleFOC motor control, Matter color temperature endpoint and signed over-the-air updates. On top of that it adds knock detection, arm positioning, and a serial console over USB that drives, calibrates and tunes the arm live.
