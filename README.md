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
2. **Its direct children** (and, in V2 and V4, the people who sit directly in it)
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
as the list rearranging itself. It's marked three ways: a **2px
border.primaryEmphasis bar down the row's left edge**, a blue.100 tint across the
row, and the name in foreground.default and bold instead of a link. Hover stays
grey.100, so hovering a row never imitates selection — the selected row keeps its
tint on hover rather than reverting to grey.

The bar spans **exactly one row** and moves with the selection. It's drawn as a
`::before` on the row's first cell with `top: 0; bottom: 0`, so it can't bleed
into the rows either side, and it's gated on the selected id, so only one row can
ever carry it. It needs no gutter of its own: the name cell's 12px padding
already leaves clear space at the left edge, so nothing in the tree shifts to
make room and the indents stay on their 24px multiples.

A `current` tag used to sit beside the name as a fourth marker. It's gone — the
bar and the tint say which row this is, and the tag was the most redundant of the
set.

The table is `isReadOnly`, which is load-bearing rather than cosmetic. Garden's
`Row` gives every row `tabIndex={-1}` and paints
`box-shadow: inset 3px 0 0 0 border.primaryEmphasis` on the first cell of a
focused row, so clicking a name left a blue bar down that row's left edge — and
because rows are keyed by organization id, the focused DOM node survived the
re-render and the bars accumulated as you drilled down. `isReadOnly` turns off
Garden's row interaction model entirely (no tabIndex, no focus tracking, no
shadow), and a `box-shadow: none` override covers the `&:focus` half of Garden's
rule, which is unconditional. Worth knowing before adding any row selection to
this table: Garden already has an opinion about what a clicked row looks like.

Note that the selection bar above is *not* that shadow reinstated. It looks
similar by design — it's the same token — but it's the prototype's own
pseudo-element keyed off the selected id rather than off DOM focus, which is what
stops it accumulating.

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

- **Version switcher** in the top bar — four treatments of the same data, for
  side-by-side review:

| Version | People rows | Columns beside Organization | Row dividers |
| --- | --- | --- | --- |
| **V1 MVP** | — | Child orgs | yes |
| **V2 with end-users** | yes | Child orgs · People | yes |
| **V3 Sans lines** | — | none — count moves inline as `(4)` | no |
| **V4 100 end users** | yes, up to 100 per page | same as V2 | yes |

V4 also swaps the chevrons for dots — see below.

V1 is the MVP scope: organizations only, one supporting column. V2 adds the
people who sit directly in the selected organization, plus a People count. V3
asks whether the table furniture is needed at all — the child
count becomes a parenthetical after the name, the Child orgs column goes away,
and the only horizontal line left is the one under the header, so the vertical
guides carry the structure.

### V4: the at-scale case

V4 is V2's treatment run against an organization that actually has a roster —
**Bramblewick University carries 150 users** instead of three. Same columns, same
rows, one number changed. It exists because centring the view bounds how *deep* the
tree goes and says nothing about how *wide* one node is, so this is the case the
focused view doesn't answer on its own.

The roster hangs off **Bramblewick**, the organization the prototype opens on, so
switching to V4 puts you in the at-scale case immediately — no drilling. Bramblewick
also has three child organizations, so the long people list sits below a real set of
child rows rather than on its own, which is the arrangement a reader would meet.

It shows **up to 100 users per page** and paginates past that, with Garden's
`OffsetPagination` centred under the table — it takes Flora's tokens from the
ThemeProvider, so the current page reads in Flora's blue. Above it, `Showing users
1–100 of 150 in Bramblewick University`, because otherwise a hundred rows sit under
a node whose People column says 150 and the two look like they disagree.

Two details worth knowing:

- **Only the people rows page.** The ancestor path, the child organizations, and
  the siblings are the structure of the view rather than its contents, so they
  stay on every page. Paging them away would leave a page-two reader with a list
  of names and nothing saying whose they are.
- **150 = Bramblewick's three hand-written staff plus a 147-name roster**, appended
  rather than substituted. Those three include the personas the prototype is built
  around, and dropping Adrian Whitlock out of the tree to reach a round number
  would cost more than the round number is worth. It also leaves page two at 50 —
  a real page rather than a stray remainder, and not a round multiple of the page
  size, which would hide the part-full last page.

100 is a high page size; Support's own lists sit nearer 30. That is the thing
under test. Page one is roughly 4,300px of scroll, which is either an acceptable
price for never paging or an argument for bringing the number down — worth
watching someone actually look for a name in it before deciding.

**Dots instead of chevrons.** V4 marks each organization with a 7px dot in the
slot the chevron used to occupy. The chevron is directional — down means "children
are below", right means "children are hidden behind this" — and a dot isn't, so
the two states are told apart by fill instead: **filled** where children are on
screen, a **ring** where a subtree is still folded away. Everything else about the
slot is unchanged, including the 20×36px hit area and the `Show the hierarchy
around …` label, so the ring is still the drill-in control and the two treatments
are directly comparable.

The question it asks is whether the arrow was carrying meaning the guide lines
already carry. A dot reads as a junction on the rail rather than as a control,
which is either cleaner or a loss of affordance depending on whether people still
find the click target.

Visual treatment responds to the engineering mockup: row rules inset to each
row's name rather than running full width (a full-width rule cuts through the
vertical guides), vertical guide lines with `├`/`└` elbows, names as blue
underlined links, and no icons beyond the node markers — chevrons in V1–V3, dots in
V4.

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
- Lazy loading for the "hundreds wide" case. V4 pages the rows, but every user is
  still in memory and the whole page renders at once; a real 150-user organization
  would fetch per page.
- The org-chart / node-graph visualization from the FigJam board

## Open questions

- Should the view distinguish **direct membership** from **inherited access**?
  Right now only the selected node is marked at all.
- **Agent vs. End user is no longer shown anywhere.** The Organization type
  column carried it on people rows (alongside Company / Cost Center /
  Supervisory on organization rows — two different things sharing one column),
  and removing the column took the distinction with it. It may not be missed:
  the cascade is about which organizations a person can see tickets in, not what
  kind of account they hold. But if review wants it back, it belongs beside the
  name like the job title already is, not in a column of its own.
- Does *People* belong as a column, or is a count link into a separate list
  better once a department has 100+ users? V4 takes the other road — it puts all
  100 in the tree and pages them — so the two can be compared rather than argued
  about.
- Is 100 the right page size? It's the number under test in V4. Lower means less
  scroll and more paging; Support's own lists sit nearer 30.
- Do the row dividers help or hurt? V3 removes them to find out.
- Is the chevron's direction doing work the guide lines don't already do? V4 uses
  dots — filled vs. ring — to find out. The risk is affordance: a dot looks less
  like something you click.
- Is one level down enough? A focused view is scannable but makes reaching a
  deep node an eight-click trip. Two levels of children, or a breadcrumb of the
  path you clicked through, are the obvious mitigations.
- Three markers on the selected row (bar, tint, bold) may still be one too many —
  the `current` tag was already dropped as a fourth. The bar is the strongest of
  the three and the tint the softest, so if review says the marking is still
  loud, the tint is what goes next. Against that: the tint is the only marker
  that reaches the full width of the row, and the columns on the right have
  nothing else tying them to the selected name.
- Does this need a dedicated full-width page, or is the profile tab enough real
  estate?
- Is "Organization hierarchy" the right tab label, or something like "Access"?
