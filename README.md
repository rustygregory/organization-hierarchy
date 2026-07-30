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
TD Synnex                    (Reseller Network)
└─ Reseller A                (Service Provider)
   ├─ University             (Company)
   │  ├─ Computer Science    (Cost Center)
   │  ├─ Mathematics         (Cost Center)
   │  └─ Engineering         (Cost Center Hierarchy)
   │     ├─ Mobile App Team  (Supervisory)
   │     └─ 380 Applications (Cost Center)
   └─ SaaS Product           (Company)
      ├─ Dept 1 / Dept 2 / Dept 3
```

Each persona is attached to exactly **one** organization. Their visible tree is
that node plus every descendant — the cascade the feature is meant to deliver.

## What's in it

- **Tree table** of organizations *and* the people inside them. People are the
  last level under any organization, each visibly connected by an elbow line to
  the organization node it sits under.
- **Bulk expand control** — the bordered chevron in the top-left header cell,
  directly above the column of row chevrons. Opens a menu with *Open all* and
  *Collapse all*. Everything starts collapsed.
- **Persona switcher** in the top bar, since the interesting question is what
  each level of the hierarchy sees:
  - *Head of Engineering* (Marcus Chen) — attached at University, reaches 3
    departments, 2 sub-teams, and everyone in them
  - *Service Provider Support Engineer* (Gordon Alvarez) — attached at Reseller
    A, the widest tree: both University and SaaS Product
  - *Professor, Computer Science* (Rachel Martinez) — attached at one
    department, for contrast

Visual treatment responds to the engineering mockup: no full-width horizontal
row rules (they fought the tree), vertical guide lines with `├`/`└` elbows,
names as blue underlined links, and no icons beyond the disclosure chevrons.

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
- Search or filter within the tree
- Lazy loading / virtualization for the "hundreds wide" case
- The org-chart / node-graph visualization from the FigJam board

## Open questions

- Should the tree distinguish **direct membership** from **inherited access**?
  Right now only the persona's own node is marked `current`.
- Does *People* belong as a column, or is a count link into a separate list
  better once a department has 100+ users?
- Does this need a dedicated full-width page for wide trees, or is the profile
  tab enough real estate?
- Is "Organization hierarchy" the right tab label, or something like "Access"?
