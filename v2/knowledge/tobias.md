---
title: Tobias, a quadruped robot that learns to walk
url: /projects/tobias
---

## What Tobias is

Tobias is a four-legged robot that Rodolfo Raimundo designed in Fusion 360 and 3D-printed in 2024, and that walks with a policy trained by reinforcement learning. The policy learns inside a physics simulator, and a gait that works there doesn't automatically work on real servos on a real floor. Rodolfo's public repository, github.com/RoodsBurger/tobias, holds both halves: the simulation and training code, and everything that runs on the robot. The project page has videos of the SAC gait at 20k and 100k training steps and of the final policy, plus the gait on the physical robot.

## Hardware and control

A Raspberry Pi 4 in Tobias drives eight LX-16A serial bus servos, two per leg, one at the hip and one at the knee. Orientation comes from an IMU made of an LSM6DSOX accelerometer and gyroscope plus an LIS3MDL magnetometer. A 1.28-inch round GC9A01 touchscreen on the back shows a small control interface and plays an idle eye animation. The printed CAD model was also exported as STL meshes to build the URDF used in simulation, so the simulated robot has the same geometry as the real one. Control runs from a phone: a Flask REST API on the Pi exposes stand, sit, walk and stop, and a React app built with MUI has a button for each gait and sliders for step size and height. A leg controller interpolates positions over time so the legs move continuously.

## Learning in simulation

Tobias was trained in PyBullet with Gymnasium environments, Stable-Baselines3 and PyTorch. The reward pays for forward velocity and penalizes falling. The state has 28 dimensions covering position, orientation, velocities and joint angles, and the actor and critic networks use 256-unit hidden layers with ReLU activations. Rodolfo tried two algorithms. DQN needs a discrete action space, so the joint commands had to be cut into bins. Soft Actor-Critic (SAC) works in a continuous 8-dimensional action space, one angle per joint, with entropy-based exploration and automatic temperature tuning. SAC outperformed DQN and learned smoother gaits, which is about what you'd expect from eight joints that don't move in steps.

## Sim-to-real transfer

Tobias has two routes from simulation to hardware. The first is replay: training saves the best runs as JSON files of joint angles per leg per frame, and a script on the Pi plays them back on the servos frame by frame. The second runs the trained SAC policy live on the robot, reading the IMU, feeding the policy network and sending joint commands straight to the servos. Replay is the one that produced a stable gait in real conditions. The live policy was less consistent, but it showed that the network trained in simulation could drive the hardware directly, with no recorded path behind it.
