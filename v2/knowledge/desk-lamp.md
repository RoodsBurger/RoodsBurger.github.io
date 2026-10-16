---
title: Kinetic Desk Lamp
url: /projects/desk-lamp
---

## What the kinetic desk lamp is

The kinetic desk lamp is a smart lamp that Rodolfo Raimundo designed and built in 2026, where brightness is a position. Closed, it is a plain Ø150 mm aluminum cylinder with the light hidden inside. As it turns up, a lantern of two frosted glass tubes around a lit core rises out of the top of the tube, up to about 115 mm. Every brightness change is a mechanical move, so the motor, the light and the smart-home state all have to agree on where the lantern is. Matter over WiFi connects it to Apple Home, Google Home and SmartThings, and a knob under the base gives local control. This is the current version of the lamp; an earlier version raised a lit core out of its body.

## How the lamp moves and lights

A brushless gimbal motor turns a stock Tr8x2 lead screw directly. Silence and stability were the design priorities. The lantern rides a floating POM anti-backlash nut and two Ø8 mm steel rods with polymer bushings, so a slightly off-center screw cannot bind it. The screw is self-locking, so at rest the motor driver sleeps, which means no holding torque and no hum. The light fades in over the first part of a rise and out over the last part of a descent, so motion speed is also fade speed. The core carries a warm and cool COB LED strip wound around it as a helix, with a row of addressable LEDs around its top.

## Mechanical design

The aluminum tube is the only metal part of the lamp's body. Everything else is FDM-printed ABS, support-free in its print orientation, and the outside shows only three thin lines of plastic: a lip under the tube, a collar on top of it and the rim of the lid. Rodolfo set a rule that no moving printed part touches a fixed printed part: where parts meet, the contact is steel, POM or felt, and every screw into plastic goes into a brass heat-set insert. He modeled every screw, nut, insert and bushing as a real part in Fusion 360 and checked clearances over the whole lift with a scripted sweep of the assembly, keeping at least 1 mm between moving and fixed parts.

## Controls and smart-home integration

The lead screw runs in closed loop, with a magnetic encoder on the motor giving real position feedback instead of counting steps. If someone stops the lantern by hand, the motor gives up after about half a second, takes wherever it ended up as the new target, and reports the matching level back over Matter, so the Home app shows the level the lamp is actually at. Over Matter the lamp is a color temperature light: the brightness slider drives the motor position and color temperature sets the warm and cool LED mix. The knob under the base has a push button: turning it moves the lantern, a click turns the lamp on or off, and a double click switches the knob between motor, brightness and color temperature modes. Each lamp gets its own Matter identity, so several can share one home.

## Electronics and firmware

The desk lamp runs on an ESP32-S3 control board Rodolfo designed, with the power supply inside the base. The firmware is written in ESP-IDF with Espressif's Matter SDK and a vendored copy of the SimpleFOC library. The motor's field-oriented control loop gets one of the chip's two cores to itself, and WiFi, Bluetooth and Matter share the other, so radio traffic doesn't stall the motor. Updates arrive as signed over-the-air releases. The same board and firmware core also run Rodolfo's kinetic wall lamp.
