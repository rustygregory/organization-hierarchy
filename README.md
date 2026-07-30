# Organization hierarchy

Design prototype for a new **Organization hierarchy** tab on the user profile in
Zendesk Support. Built for PM review and customer interviews.

## The problem

Organizations in Support are a flat set of records, but B2B customers use them
hierarchically — resellers, subsidiaries, regions, departments. A supporting role
partway down that chain (a Service Provider Support Engineer at the reseller, a
Head of Engineering at a university) needs ticket visibility into **every
organization beneath them**. Because there is no hierarchy today, that person has
to be added manually to each organization — tens to hundreds of them. You can
miss one and never know, and a newly created organization grants nobody anything.

The product direction is a parent field on the organization record plus a third
access option that cascades ticket permissions down the tree. This prototype
covers the UX half: how someone sees and understands the hierarchy they can reach.

## The model

```
TD Synnex                                       (Reseller Network)
└─ Reseller A                                   (Service Provider)
   ├─ Bramblewick University                    (Company)
   │  ├─ Computer Science                       (Cost Center)
   │  │  └─ Artificial Intelligence             (Cost Center)
   │  │     ├─ Machine Learning Lab             (Supervisory)
   │  │     │  └─ Neural Networks Group
   │  │     │     └─ Deep Learning Unit
   │  │     │        ├─ Computer Vision Team
   │  │     │        │  └─ Image Recognition Squad
   │  │     │        │     └─ Model Training Pod
   │  │     │        │        ├─ GPU Cluster Ops
   │  │     │        │        ├─ Dataset Curation Pod
   │  │     │        │        ├─ Evaluation Pod
   │  │     │        │        └─ Inference Serving Pod
   │  │     │        └─ Speech Recognition Team
   │  │     ├─ Natural Language Lab
   │  │     │  └─ Speech Processing Group
   │  │     │     └─ Transcription Team
   │  │     └─ Robotics Lab
   │  ├─ Mathematics                            (Cost Center)
   │  │  ├─ Applied Mathematics                 (Cost Center)
   │  │  │  └─ Numerical Analysis Group
   │  │  │     └─ Simulation Team
   │  │  ├─ Pure Mathematics
   │  │  └─ Statistics
   │  └─ Engineering                            (Cost Center Hierarchy)
   │     ├─ Mobile App Team                     (Supervisory)
   │     │  └─ iOS Squad
   │     │     └─ Build & Release
   │     └─ 380 Applications                    (Cost Center)
   └─ SaaS Product                              (Company)
      ├─ Dept 1 / Dept 2 / Dept 3
```

Each persona is attached to exactly **one** organization. Their visible tree is
that node plus every descendant — the cascade the feature is meant to deliver.

The Computer Science branch runs **ten levels deep** counting Bramblewick as
level 1, and widens to four siblings at its deepest point. That is deliberate:
the hard question for this UI is whether the tree stays readable at the depth and
breadth a real reseller hierarchy reaches, not whether it works at three levels.

## What's in it

- **Tree table** of organizations *and* the people inside them. People are the
  last level under any organization, each visibly connected by an elbow line to
  the organization node it sits under.
- **Bulk expand control** — the bordered chevron in the top-left header cell,
  directly above the column of row chevrons. Opens a menu with *Open all* and
  *Collapse all*. The tree starts fully open.
- **Persona switcher** in the top bar, since the interesting question is what
  each level of the hierarchy sees:
  - *Head of Engineering* (Adrian Whitlock) — attached at Bramblewick
    University, reaches 3 departments, 2 sub-teams, and everyone in them
  - *Service Provider Support Engineer* (Gordon Alvarez) — attached at Reseller
    A, the widest tree: both Bramblewick University and SaaS Product
  - *Professor, Computer Science* (Rachel Martinez) — attached at one
    department, for contrast
- **Version switcher**, left of the persona menu — three treatments of the same
  data, for side-by-side review:

| Version | People rows | Columns beside Organization | Row dividers |
| --- | --- | --- | --- |
| **V1 MVP** | — | Child orgs | yes |
| **V2 with end-users** | yes | Organization type · Child orgs · People | yes |
| **V3 Sans lines** | — | none — count moves inline as `(4)` | no |

V1 is the MVP scope: organizations only, one supporting column. V2 adds the
people inside each organization and the columns that describe them. V3 asks
whether the table furniture is needed at all — the child count becomes a
parenthetical after the name, the Child orgs column goes away, and the only
horizontal line left is the one under the header, so the tree's own vertical
guides carry the structure.

Visual treatment responds to the engineering mockup: row rules inset to each
row's name rather than running full width (a full-width rule cuts through the
tree's vertical guides), vertical guide lines with `├`/`└` elbows, names as blue
underlined links, and no icons beyond the disclosure chevrons.

## Running it

```bash
npm install
npm run dev
```

## Stack

Vite + React 18 + Zendesk Garden 9, the vendored Flora theme in
`src/flora-theme/`, and `zendesk-globalnav-template` for the TopBar and left
nav. Same stack as the `transaction-log` and `attachment-search` prototypes.

## Not built yet

Deliberately out of scope for this pass, worth a PM conversation first:

- Admin UI for setting an organization's parent
- A ticket list scoped to the hierarchy
- Search or filter within the tree — the search field is present but inert
- Drilling into an organization: clicking a name should open that org in its own
  Admin Center tab, rooted there, with everything above it collapsed but visible
- Lazy loading / virtualization for the "hundreds wide" case
- The org-chart / node-graph visualization from the FigJam board

## Open questions

- Should the tree distinguish **direct membership** from **inherited access**?
  Right now only the persona's own node is marked `current`.
- Does *People* belong as a column, or is a count link into a separate list
  better once a department has 100+ users?
- Do the row dividers help or hurt? V3 removes them to find out. At ten levels
  deep the dividers add a second grid competing with the tree's verticals.
- Does this need a dedicated full-width page for wide trees, or is the profile
  tab enough real estate?
- Is "Organization hierarchy" the right tab label, or something like "Access"?
