# Editorial AI Explainer Visuals

Reusable, web-native diagram components for an essay on embodied AI.
Minimal editorial systems-explainer aesthetic: warm paper background,
clean vector geometry, restrained accent palette, meaningful motion.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## The test visualization

`EmbodiedAIPipelineDiagram` tells one story in a ~16s loop:

1. **video in** — a video frame slides in and is drawn into the encoder
2. **encode** — blue tokens flow through a tapered pipe (compression)
3. **train (form)** — latents assemble into a policy network (edges draw in)
4. **train (RL)** — the network morphs into two violet arrows chasing each
   other around a pulsing core: the reinforcement-learning loop
5. **deploy** — the tuned policy shuttles through the output pipe, which
   emits the trained network
6. **act** — the deployed network lights up node by node while a small
   robot next to it does a simple disco dance

The whole pipeline skeleton (pipes, labels, robot, ground) stays visible
in muted line-work throughout; each stage takes color and motion only
during its moment. A serif caption below the drawing narrates the phase.

The animation pauses off-screen (IntersectionObserver) and renders a
complete static diagram under `prefers-reduced-motion`.

## The generalist visualization

`GeneralistMotionPolicyDiagram` is the counterpart: a column of motion
clips (walk, arm-wiggle, jump, kick — each in its own hue, with an
ellipsis and "× 10,000 clips" implying the rest) streams skill-by-skill
through a funnel into ONE large network; inactive clips pale while one
streams. The network's edges permanently take on each learned skill's
color, so it visibly accumulates abilities. Once deployed, three
never-seen requests arrive as dashed cards in hues the network never
trained on: a purple side-wiggle, a pink wave — during which a gust of
wind shoves the robot into a stumble-and-recover, synced to the gust —
and an orange jump. The robot performs them all.

## The SONIC visualization

`SonicArchitectureDiagram` explains NVIDIA SONIC's encoder–latent–decoder
architecture as a LIVE translator. Trapezoid modules (standard ML
iconography, with plug stubs docking toward the board's sockets) encode
a blue G1 motion CSV (ℰ_Robot) and a red SMPL clip (ℰ_Human) into the
latent space: a row of purple cells that lights up left→right as the
first particles arrive, then keeps breathing organically. Each source
activates a different subset of cells, but always in purple — once
inside, inputs are indistinguishable. Each source streams for ~10s with
encode and decode running in parallel (D_c emits amber joint commands
while frames still arrive), and source handovers cross over in a brief
~250ms overlap. Dance handovers are fully interpolated in both
directions: RobotDancer freezes the mid-dance pose and glides limbs
back to rest when a move ends, and glides them from rest into the next
move's measured first-frame pose before its animation starts — no
jump cuts either way.
Finale: the dashed ℰ_next feeds, then a new decoder (D_new, green)
drives a visually different second humanoid in animation-clock-perfect
sync while the G1 grays out. The side-lean wiggle mirrors halfway
through: per-arm mirror wrappers swap the hands to the other side
(~5s left, ~5s right) — the robot itself never turns.

## Architecture

```
src/diagram/
  diagramTokens.ts     design tokens (colors, fonts, easing) + CSS vars
  diagram.css          all keyframes and phase transition styles
  useTimeline.ts       looping phase timeline, reduced-motion, on-screen hooks
  DiagramFrame.tsx     shared editorial frame: card, responsive SVG, caption
  EmbodiedAIPipelineDiagram.tsx     specialist pipeline (one clip → one policy)
  GeneralistMotionPolicyDiagram.tsx one giant net, many motions, OOD + wind
  SonicArchitectureDiagram.tsx      SONIC encoders → latent cells → decoders
  primitives/
    Pipe.tsx           tapered pipe/funnel (encoder or emitter, can be dashed)
    EncoderModule.tsx  ML-style encoder/decoder module with plug stub (trapezoid/layers/chip)
    LatentRack.tsx     row of latent cells; lights up left→right, then breathes organically
    VideoFrame.tsx     minimal video-frame glyph (person + play + progress)
    MotionCard.tsx     tiny mocap clip with a stick-figure pose glyph
    FlowParticles.tsx  dots streaming through a taper (optionally sloped)
    NeuralNetwork.tsx  feed-forward net; edges draw in + tint per learned skill
    TrainingLoop.tsx   two rotating arrows = RL loop (scales down to a badge)
    RobotDancer.tsx    robot with disco/kick/wiggle/walk/sidewiggle/wave/jump + stumble; 'ghost' variant
    WindGust.tsx       dashed streamlines shoving in from the side
    StageLabel.tsx     small-caps stage label with accent dot
```

Building a new diagram = compose primitives inside a `DiagramFrame`,
define a phase list, and map phases to element states. All motion
definitions live in `diagram.css`; components only toggle classes and
inline transforms. Colors and easing come from CSS custom properties
(`--diagram-*`), so retheming is a token swap.

## Embedding in a blog post

The component is self-contained (no external assets, no canvas):

```tsx
import { EmbodiedAIPipelineDiagram } from './diagram/EmbodiedAIPipelineDiagram'
import { redTheme } from './diagram/diagramTokens'

<EmbodiedAIPipelineDiagram />            // blue theme, disco robot
<EmbodiedAIPipelineDiagram showCaption={false} />
<EmbodiedAIPipelineDiagram theme={redTheme} robotMove="kick" />
```

Themes are plain objects of five accent colors (`DiagramTheme` in
`diagramTokens.ts`); `blueTheme` is the default and `redTheme` ships as
a preset. The robot supports `robotMove="disco"` (alternating raised
arms) or `"kick"` (legs flying left and right).

## Embedding the diagrams elsewhere

The site is deployed to GitHub Pages by `.github/workflows/deploy.yml`
on every push to `main`. Besides the full essay, it serves chrome-less
single-diagram pages made for iframes:

```
…/?embed=pipeline                      specialist RL pipeline (blue, disco)
…/?embed=pipeline&theme=red&move=kick  red variant, kicking robot
…/?embed=generalist                    one policy, many motions
…/?embed=sonic                         SONIC encoder–latent–decoder
…&caption=off                          hide the narrating caption line
```

Per platform (replace `<URL>` with the full embed URL):

- **Any webpage** —
  `<iframe src="<URL>" style="width:100%; aspect-ratio: 990/560; border:0" loading="lazy" title="…"></iframe>`
  (use `aspect-ratio: 990/620` for the sonic/generalist diagrams with captions on)
- **Notion** — type `/embed`, paste the URL. HTML blocks also work with
  the iframe snippet above; pasted `<script>` tags are sanitized, so the
  iframe is the reliable vehicle either way.
- **Confluence** — insert the **iframe macro** (`/iframe` in Cloud),
  paste the URL, set width 100% and a height around 560–640px.
- **React sites you own** — skip the iframe: copy `src/diagram/` (its
  only dependency is React) and render the components directly.
- **No-script contexts** (slides, email) — record a looping video:
  `node scripts/record.mjs sonic` writes `recordings/sonic.webm` + `.mp4`
  (dev server must be running; one full loop per file).

Embedded pages keep all behavior: animations pause when the iframe is
scrolled off-screen, and reduced-motion readers get the static diagram.

## Visual QA

`scripts/snap.mjs` screenshots every animation phase via Playwright
(pointed at the system Chromium) — run the dev server on port 5199 and
`node scripts/snap.mjs`; images land in `/tmp/diag-*.png`.
