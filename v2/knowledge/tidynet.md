---
title: TidyNET, diffusion-based robotic tidying
url: /projects/knolling
slug: knolling
---

## What TidyNET is

TidyNET is Rodolfo Raimundo's end-to-end system for robotic workspace organization, built in 2024 and 2025 while he was a Graduate Research Assistant in Columbia University's Creative Machines Lab. It takes a photo of a cluttered workspace, uses a diffusion model to generate an image of the same objects arranged neatly, detects the objects in both images, and has a robotic arm rearrange the real table to match. The plan is a picture, so the generated image has to keep every object recognizable, and the robot has to work out which object goes where and move each one without collisions. TidyNET extends the lab's existing knolling research line, which studies how robots can learn to arrange objects neatly. Rodolfo is not an author of the lab's earlier knolling papers; TidyNET is his own system built on that line of work. The code is public at github.com/RoodsBurger/TidyNET.

## Diffusion model for visual planning

TidyNET plans in image space. Rodolfo wrote a conditional denoising diffusion model (DDPM) by hand: a U-Net encoder and decoder with skip connections, group normalization, time embeddings at several levels, self-attention, and conditioning on the messy input image. It uses a cosine noise schedule and classifier-free guidance, and was trained on paired before-and-after images at 256 by 256 pixels. The model preserves object identity as it moves objects into a tidy layout, with occasional visual artifacts in complex scenes. Rodolfo's earliest experiments, in December 2024, used an off-the-shelf diffusers DDPM at 128 pixels and briefly explored ControlNet before he moved to his own implementation.

## Object detection

TidyNET detects objects with a YOLO model that predicts oriented bounding boxes, so each detection carries the object's rotation as well as its position. To create training labels, Rodolfo bootstrapped detections with a pretrained Faster R-CNN, matched them to known object positions with the Hungarian algorithm, assigned orientations, and then trained the oriented-box YOLO model as a multi-task model over two datasets. The same detector runs on the real camera image and on the generated tidy image, and objects are matched between the messy and tidy states by color using the Hungarian algorithm.

## Robot execution

TidyNET runs on an Interbotix WidowX 200 robotic arm with an Intel RealSense camera under ROS2. Rodolfo's control code uses camera intrinsics to project detections into 3D, tracks object state in a workspace manager, and assigns each detected object to a target slot. A grid occupancy map at 2 cm resolution and Separating Axis Theorem checks on oriented rectangles detect collisions. When an object's target is blocked by another object, the planner first moves the blocker, using a temporary position if needed, then places the rest in priority order and verifies final positions. Rodolfo also contributed the control, detection, and arm calibration code to the lab's Knolling repository in April 2025.

## Results

TidyNET's YOLOv11-OBB detector achieves above 93% detection success across different object counts, with angular accuracy within ±3.2°. On the real Interbotix WidowX 200 arm, TidyNET reaches 85.5% grasp success and 74.2% placement success. End to end, it completes 70% of tidying tasks; the other 30% don't finish. Rodolfo's robot runs are recorded in videos from front, top, and virtual planner views. The training dataset belongs to the Creative Machines Lab and is withheld under a lab agreement. The TidyNET project page links Rodolfo's code and written report, along with the lab's earlier knolling paper (arXiv 2310.04566) and the lab's Knolling repository as related work.
