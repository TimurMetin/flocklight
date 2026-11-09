# Design rationale — FLOCKLIGHT

FLOCKLIGHT is a guiding game set in a dark forest. The player must bring 16 of 24 fireflies to the Moon Gate. Instead of moving individual fireflies, the player places three lights in sequence. Each light must connect to the previous one and move closer to the gate. The trees are collision hazards, so the player must guide the group around them. The challenge is to create a safe route that independent agents can follow.

The project combines **Agency (01)** and **Emergence (07)**. Agency appears in the placement rules: the player chooses each checkpoint but has only three lights. A disconnected or backward light is rejected, and a light affects fireflies only inside its visible radius. A firefly that collides with a tree is lost, so the player must balance a short route against a safe one. Each firefly must reach the current checkpoint before it can follow the next. The Moon Gate attracts the swarm only after all three lights have been reached. Emergence appears between checkpoints: each firefly aligns with nearby neighbours, moves towards the group and keeps distance from others. The player influences the route, but the swarm’s exact shape and timing are not scripted.

Wardrip-Fruin, Mateas, Dow and Sali (2009) relate agency to the gap between what a player wants to do and what a system allows. This shaped the placement rules and feedback when a light cannot connect. A limitation is that a choice is not meaningful unless the player understands why it succeeds or fails. Reynolds (1987) explains how flock behaviour can emerge from simple local rules rather than a central controller. I used alignment, cohesion and separation for this reason. This remains a simplified model, not a scientific simulation of fireflies.

Code testing showed that the first version guided the swarm to the exit even when lights were ineffective, because the gate attracted fireflies globally after they touched a light. I replaced this shortcut with sequential checkpoints and limited signal ranges. I also made tree collisions count as losses, so a route that cuts through a trunk can fail while a safe route succeeds. A test with an unfamiliar player is still needed to see whether the dotted circles and feedback explain the rules without help.

## References

- Wardrip-Fruin, N., Mateas, M., Dow, S., & Sali, S. (2009). “Agency Reconsidered.” *Proceedings of DiGRA 2009*. https://dl.digra.org/index.php/dl/article/view/369
- Reynolds, C. W. (1987). “Flocks, Herds, and Schools: A Distributed Behavioral Model.” *Computer Graphics, 21*(4), 25–34. https://www.red3d.com/cwr/papers/1987/boids.html


## Live project link
https://timurmetin.github.io/flocklight/
