# FLOCKLIGHT — Guide the Unseen

**A short interactive game combining two premises from the NMED 3203 lab:**

- **01 — Agency:** the player places temporary lights that change the direction of the swarm.
- **07 — Emergence:** the fireflies create group movement through simple local behaviours instead of following one fixed, scripted path.

## How to play

1. Press **Start the Night**.
2. Place the first light within reach of the starting clearing.
3. Place the second and third lights in order. Each must be inside the previous light’s dotted range circle and noticeably closer to the Moon Gate.
4. The final light must also be close enough to the Moon Gate. Tree trunks are dangerous: a firefly that hits one is lost.
5. Bring at least **16 of the 24 fireflies** to the Moon Gate before the **50-second** timer ends.

The lights are sequential checkpoints, not global magnets. Each firefly must physically reach light 1, then light 2, then light 3. A light attracts only inside its visible dotted radius; the Moon Gate only attracts after all three checkpoints have been reached and only from nearby. The amber rings around trees mark collision danger: a firefly that touches a tree is lost. The fireflies also align with nearby neighbours, keep distance from each other and steer away from tree trunks. The player shapes the conditions but cannot control an individual firefly.

### Keyboard and alternative controls

- **Arrow keys:** move the placement cursor.
- **Space / Enter:** place a light.
- The on-screen arrow buttons and **PLACE LIGHT** button provide labelled alternatives.
- On touchscreens, tap the forest to place a light.

## Files

- `index.html` — page structure, instructions and game HUD.
- `style.css` — visual design and responsive layout.
- `script.js` — flock behaviour, beacon rules, timer, scoring and Canvas rendering.
- `RATIONALE.md` — 315–385-word design rationale and references.

## Live change for the presentation

Open `script.js` and find the `CONFIG` object at the top. Change:

```js
TREE_COLLISION_MARGIN: 8,
```

to:

```js
TREE_COLLISION_MARGIN: 20,
```

The amber danger rings become wider, and fireflies are lost when they get closer to the tree trunks. This is a clear live change: the player must build a safer route. To restore the original version, change the value back to `8` and refresh.

Other useful values to demonstrate are `BEACON_RADIUS` (how far a light can reach), `BEACON_LINK_MAX` (the maximum gap between checkpoints), `BEACON_STRENGTH` (how strongly a nearby light attracts the swarm) and `FLOCK_RADIUS` (how far each firefly senses its neighbours).

## Theory and references

The two readings are from the course lab's bibliography:

- Wardrip-Fruin, N., Mateas, M., Dow, S., & Sali, S. (2009). “Agency Reconsidered.” *Proceedings of DiGRA 2009*. https://dl.digra.org/index.php/dl/article/view/369
- Reynolds, C. W. (1987). “Flocks, Herds, and Schools: A Distributed Behavioral Model.” *Computer Graphics, 21*(4), 25–34. https://www.red3d.com/cwr/papers/1987/boids.html

## Credits and AI note

The project was created for NMED 3203 and uses the Agency and Emergence premises from the [Interactive Media Applications lab](https://mertseven.com/ima/lab/index.html). The visual field, fireflies, lights, trees and Moon Gate are drawn with original Canvas code; no external game assets or remote fonts are required.

OpenAI was used to brainstorm the concept and assist with the HTML, CSS, JavaScript and rationale draft. One generated behaviour was rejected: a global exit magnet that made the swarm reach the gate regardless of where the player placed lights. I replaced it with three sequential checkpoints, limited attraction ranges and tree-collision losses. The project keeps its rules editable in the `CONFIG` object. I remain responsible for testing, explaining and modifying the code.

## Publish with GitHub Pages

Upload all five files (`index.html`, `style.css`, `script.js`, `README.md` and `RATIONALE.md`) to the root of a public repository. Then open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save. Use the published URL to test in a private browser window and on a phone.


## Live project link
Add the published GitHub Pages URL here after enabling Pages.

## New in the enhanced edition

Choose from three forest levels with changing tree danger and beacon reach. The outcome shows 0–3 stars (16 rescued = 1, 20 = 2, 24 = 3). The game does not stop at 16; keep guiding the swarm until time runs out or every firefly is accounted for.

