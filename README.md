# Organization hierarchy

Design prototype for a new **Organization hierarchy** tab on the organization
profile in Zendesk Support. Built for PM review and customer interviews.

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

Access granted at any node reaches that node plus every descendant — the cascade
the feature is meant to deliver.

The Computer Science branch runs **ten levels deep** counting Bramblewick as
level 1, and widens to four siblings at its deepest point. That is deliberate:
the hard question for this UI is whether the hierarchy stays readable at the depth
and breadth a real reseller hierarchy reaches, not whether it works at three
levels.

## What's in it

The tab is a **focused view on one organization**, not a browsable tree. For the
organization whose profile you're on it shows exactly three things:

1. **Its ancestors**, as a single path down from the top-level organization
2. **Its direct children** (and, in V2, the people who sit directly in it)
3. **Its direct siblings**

Nothing else expands. A sibling's children, an ancestor's other branches, and
anything more than one level below stay out of view until you ask for them, and
the way you ask is to click — **clicking any organization re-centres the whole
page on it**: the browser title, tab strip, profile header, properties, and tab
counts all move with it, because in Support that click opens that organization's
own profile.

The selected organization **stays where it sits in its sibling group**. Clicking
the third of four pods doesn't hoist it to the top of the group — the rows hold
still and only the marking moves, so a click reads as selecting a row rather than
as the list rearranging itself. It's marked three ways: a blue.100 tint across
the row, the name in foreground.default and bold instead of a link, and the
`current` tag beside it. A 3px blue bar at the table's left edge was a fourth;
it came out because two blue marks for one state competed with each other, and
the tint is the one that reads at a glance down a ten-level path. Hover stays
grey.100, so hovering a row never imitates selection.

That is the answer to the depth problem. Bramblewick's Computer Science branch
runs ten levels deep and four wide at the bottom; rendered recursively that is
one screen of tree you have to read past to find anything. Centred, any node in
it is the same size view — path above, one level below — and reaching the deepest
pod is a series of clicks, each of which lands on a page you can scan.

Two consequences worth naming:

- **No expand/collapse.** A row's chevron points right when it has a subtree the
  view is holding back — clicking it drills in, same as clicking the name — and
  down when its children are already listed below. The *Open all / Collapse all*
  bulk control is gone; there is nothing left to open in bulk.
- **The counter still reports reach, not rows.** "29 organizations" is how far
  access cascades below the selected node, which is exactly the number the
  focused view no longer shows you. Worth a look in review: it is the one place
  the page states something the tree doesn't demonstrate.

Rails are drawn **attached** — a descender runs from a node's chevron down to its
children's rail, so the ancestor path reads as one continuous spine. The detached
alternative was the other half of a comparison this layout can't stage any more:
only the path and the selected node ever have children on screen, so there is no
second branch to contrast against.

- **Version switcher** in the top bar — three treatments of the same data, for
  side-by-side review:

| Version | People rows | Columns beside Organization | Row dividers |
| --- | --- | --- | --- |
| **V1 MVP** | — | Child orgs | yes |
| **V2 with end-users** | yes | Organization type · Child orgs · People | yes |
| **V3 Sans lines** | — | none — count moves inline as `(4)` | no |

V1 is the MVP scope: organizations only, one supporting column. V2 adds the
people who sit directly in the selected organization and the columns that
describe them. V3 asks whether the table furniture is needed at all — the child
count becomes a parenthetical after the name, the Child orgs column goes away,
and the only horizontal line left is the one under the header, so the vertical
guides carry the structure.

Visual treatment responds to the engineering mockup: row rules inset to each
row's name rather than running full width (a full-width rule cuts through the
vertical guides), vertical guide lines with `├`/`└` elbows, names as blue
underlined links, and no icons beyond the chevrons.

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
- Search or filter — the search field is present but inert. It is the obvious
  companion to a focused view: re-centring by click is fine for neighbours,
  but jumping across the tree wants search.
- Real navigation. Re-centring swaps the page contents in place; there is no
  back, no history, and no second tab. Support would open a new tab per
  organization.
- Lazy loading for the "hundreds wide" case — a focused view bounds depth, not
  the width of one node's child list
- The org-chart / node-graph visualization from the FigJam board

## Open questions

- Should the view distinguish **direct membership** from **inherited access**?
  Right now only the selected node is marked `current`.
- Does *People* belong as a column, or is a count link into a separate list
  better once a department has 100+ users?
- Do the row dividers help or hurt? V3 removes them to find out.
- Is one level down enough? A focused view is scannable but makes reaching a
  deep node an eight-click trip. Two levels of children, or a breadcrumb of the
  path you clicked through, are the obvious mitigations.
- Three markers on the selected row (tint, bold, tag) may still be one too many.
  The tint does the work; the `current` tag is the most redundant once the row is
  visibly picked out, and it's the obvious next thing to drop if review says the
  marking is still loud.
- Does this need a dedicated full-width page, or is the profile tab enough real
  estate?
- Is "Organization hierarchy" the right tab label, or something like "Access"?
