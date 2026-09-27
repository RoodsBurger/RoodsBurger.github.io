---
title: Precision Coffee Grinder
url: /projects/grinder
---

## What the grinder is

The Precision Coffee Grinder is a hand grinder that Rodolfo Raimundo turned into a motorized appliance, starting in January 2026. A Raspberry Pi drives the burr with a stepper motor, meters beans with an auger doser, and runs a 1.28-inch round touchscreen, all in Python, with the display and the motor driver sharing one SPI bus. Rodolfo makes espresso every day and built the grinder because he got tired of grinding by hand. The Pi boots straight into the grinder interface as a systemd-managed appliance, with no keyboard, mouse or login. He modeled the body and hopper in Fusion 360 and 3D-printed them. The code is public at github.com/RoodsBurger/grinder.

## Grinding and dosing

The grinder's interface has two screens, switched with a horizontal swipe. One sets grind speed, 30 to 150 RPM at the burr, and the other sets the bean feed rate as a percentage. A center button starts and stops everything: pressing it spins up the burr, and 3 seconds later the doser starts feeding, so beans never land on a burr that isn't up to speed yet. The dial locks while grinding so a stray touch can't change the speed. The doser is a continuous-rotation servo turning a bean auger. Cheap continuous servos stall at low speed, so it runs at full torque in short fixed bursts, and the feed rate comes from the spacing between bursts.

## Why three processes instead of threads

Rodolfo split the grinder software into a UI process, a motor process and a servo process, for three reasons. Timing: the motor process generates the stepper pulse train with busy-wait timing, and running it as its own process keeps it clear of Python's global interpreter lock. The shared bus: the display and the DRV8711 sit on the same SPI bus, which two processes can't hold at once, so the UI closes its SPI handle before starting the motor process, the motor process opens the bus only to write driver registers and closes it within milliseconds, and the UI reopens it when the grind stops. Crashes: if either child process dies, the UI shuts both down cleanly and resets the screen.

## Touch and display

The grinder's screen is drawn with Pillow at twice the resolution and downscaled, so arcs and text come out anti-aliased on the small round panel. The start and stop icons, whole beans and ground coffee, are generated procedurally with a fixed random seed so they look the same on every boot. The touch controller goes silent while a finger is held still, so a small state machine Rodolfo wrote infers release by timeout, and a swipe always overrides a pending tap. The display is a 240 by 240 round GC9A01 panel over SPI with a CST816T capacitive touch controller over I2C.

## Hardware and tuning

A NEMA 23 stepper drives the grinder's burr through a 2:1 gearbox, in place of the hand crank. It runs off a TI DRV8711 stepper driver on a driver board Rodolfo designed, which also carries headers for the Pi, the doser servo and the display. Getting the drive quiet took a while. Rodolfo swept about 90 combinations of current, decay mode, blanking and microstepping, rated the noise of each, and settled on the quiet profile the grinder runs now.
