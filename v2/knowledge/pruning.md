---
title: Artificial Synaptic Pruning
url: /projects/pruning
---

## What the project is

Artificial Synaptic Pruning is a Fall 2020 experiment by Rodolfo Raimundo in deleting most of a neural network's weights, the way the brain removes under-stimulated synapses, and checking whether the network gets better. The obvious expectation is that it gets worse. It was his project for COMS E6998, Computation and the Brain, a graduate seminar at Columbia University that he took as an undergraduate. The question was whether pruning can make artificial networks more efficient and help them generalize, paired with ideas from Hebbian learning. The notebooks went up on GitHub in December 2024 at github.com/RoodsBurger/computation_brain, along with a written report.

## Experiment design

Rodolfo set up a 2 by 2 by 2 factorial experiment in TensorFlow and Keras: two optimizers (Adam and RMSProp), two hidden-layer widths (64 and 128 units), and two metrics for picking which weights to prune (entropy and R squared), with one notebook per combination, eight in total. He pruned autoencoders trained on Fashion-MNIST and a convolutional network trained on CIFAR-10, removing from 5% to 95% of the weights in 5% steps. After each pruning pass the network retrained for five epochs, and loss was plotted against the percentage of weights removed.

## Findings

In Rodolfo's pruning study, removing up to 80% of the weights didn't help. Removing between 80% and 95% improved performance on test data, so networks with most of their connections gone generalized better than the full ones. That's consistent with pruning reducing overfitting. The result comes from one sweep on Fashion-MNIST and CIFAR-10, which is worth keeping in mind before generalizing it.

## Why Rodolfo did it

Rodolfo has been interested in neuroscience and how brains learn for a long time, and the pruning project was a way to come at that through computation: take a biological mechanism, apply it to artificial networks, and measure the effect on real benchmarks. There's a practical side too, since a smaller network needs less computation and memory to run. The project page links the notebooks, the written report, and figures from the experiments.
