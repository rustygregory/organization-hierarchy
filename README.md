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

Nothing else expands — except in V3.5 and V3.75, the versions that question this.
A sibling's children, an ancestor's other branches, and
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

- **No expand/collapse** (except in V3.5 and V3.75). A row's chevron points right
  when it has a subtree the view is holding back — clicking it drills in, same as
  clicking the name — and down when its children are already listed below. The
  *Open all / Collapse all* bulk control is gone; there is nothing left to open in
  bulk. V3.5 puts expansion back, deliberately, to test whether the focused view
  needs it — see below.
- **The counter still reports reach, not rows.** "29 organizations" is how far
  access cascades below the selected node, which is exactly the number the
  focused view no longer shows you. Worth a look in review: it is the one place
  the page states something the tree doesn't demonstrate.

Rails are drawn **attached** — a descender runs from a node's chevron down to its
children's rail, so the ancestor path reads as one continuous spine. The detached
alternative was the other half of a comparison this layout can't stage any more:
only the path and the selected node ever have children on screen, so there is no
second branch to contrast against.

- **Version switcher** in the top bar — six treatments of the same data, for
  side-by-side review:

| Version | People rows | Columns beside Organization | Row dividers | Shape of the tree | Chevron does | Wide node |
| --- | --- | --- | --- | --- | --- | --- |
| **V1 MVP** | — | Child orgs | yes | focused on the selection | drills in | — |
| **V2 with end-users** | yes | Child orgs · People | yes | focused on the selection | drills in | — |
| **V3 Sans lines** | — | none — count moves inline as `(4)` | no | focused on the selection | drills in | — |
| **V3.5 Expandable** | — | same as V3 | no | **rooted; whatever you opened** | **expands in place** | — |
| **V3.75 175 departments** | — | same as V3 | no | rooted; whatever you opened | expands in place | **capped at 50 + View all** |
| **V4 100 departments** | — | same as V2 | yes | focused on the selection | drills in (as a dot) | **paged 100 at a time** |

V1 is the MVP scope: organizations only, one supporting column. V2 adds the
people who sit directly in the selected organization, plus a People count. V3
asks whether the table furniture is needed at all — the child
count becomes a parenthetical after the name, the Child orgs column goes away,
and the only horizontal line left is the one under the header, so the vertical
guides carry the structure. V3.5 is V3 with the chevron split off from the name.

**The last two are the same question asked twice.** A node with more children
than a screen can hold has to do *something*, and V3.75 and V4 are the two
answers: cap the list and put a door at the bottom, or page through it in
windows. They deliberately run on different data — 175 departments against 150 —
so neither can be mistaken for a tweak of the other; see *Two rosters, on
purpose* below. (The answers meet on the other side of V3.75's door: the page it
opens pages at 100, because a page showing 175 rows unabridged is the thing the cap
was avoiding.)

### V3.5: expanding without selecting

V3.5 is V3 with **one interaction split into two**. In every other version the
chevron and the name do the same thing — both re-centre the page on that
organization. Here they diverge:

- **Click the name** → selects that organization: page title, browser tab, tab
  strip, properties and counts all move to it, and the row takes the selection
  bar, tint and bold. **The tree does not change shape.** Nothing collapses,
  nothing disappears, and every chevron you were working with is still there.
- **Click the chevron** → opens or closes that organization's children in place.
  The selection doesn't move and the page title doesn't change.

So you can look under a sibling without leaving where you are, and select
something without losing what you'd opened. Expansion **nests** — a revealed
child has its own chevron — and several branches can be open at once.

**This is a different tree from the other versions, not the focused view with a
flag.** V1–V4 derive *which rows exist* from the selected organization: its
ancestors, its children, its siblings. That makes selection and structure the
same thing, so in those versions selecting anything necessarily rebuilds the tree
around it. V3.5 instead renders from the **root** down and takes its shape from
one thing only — what the reader has opened. Selection is reduced to a highlight.
Two separate builders, `buildFocusedRows` and `buildExpandableRows`; the
distinction is the version.

Getting this wrong once is instructive: the first cut of V3.5 kept
`buildFocusedRows` and added expansion on top, so clicking a department still
re-centred the tree — every other branch vanished, and the rows left over were
ancestors, which carried an inert marker rather than a button, so the chevrons
appeared to stop working. Both symptoms, one cause. **In-place expansion is
incompatible with a selection-shaped tree**; you can't have both from one builder.

Details worth knowing:

- **Every organization with children gets a working control**, including the
  selected one and its ancestors. There is no inert marker in this version,
  because no row's children are on screen merely because of where the page is
  centred.
- **You can collapse an ancestor of the selected row and hide it.** That's
  allowed — it's an explicit act with an obvious undo, the way a file tree
  behaves — and re-expanding remembers everything that was open underneath.
- **Selecting also opens the selected node**, so a click shows you what's inside
  the thing you clicked, as the other versions do. Note this only ever *adds*
  rows; it can't take the tree away from under you.
- **The tree opens on the path down to the current organization**, so the first
  paint shows the same thing the other versions do rather than a single collapsed
  root to dig through.
- **Not paged, and not capped.** V3.5 runs on the hand-written tree only, so
  expansion is the single variable under test. **V3.75 is the one that adds the
  wide node** — see below.
- **Skeleton loaders** stand in for the children while a subtree opens — see
  below.

### Skeleton loaders

Opening a subtree in V3.5 shows Garden's `Skeleton` bars in the rows about to
arrive, for **2s**, then swaps in the real names. It's a fiction here (the whole
tree is in memory) standing in for the fetch a real hierarchy would need. The
bars sit on the tree's guide lines at name-like widths, one per incoming row, so
what you see is *names arriving*, not a page loading.

Four numbers, all constants at the top of `OrganizationHierarchyTab.jsx`:

- `SKELETON_THRESHOLD = 2` — lists this short or shorter open instantly, no
  flash. Two rows appearing at once reads as the tree responding, and flashing
  placeholders over them reads as a glitch; the real feature has the same shape,
  since a couple of children is one cheap request. It has to be low in any case:
  V3.5's widest node is Model Training Pod at four children and most expandable
  nodes have three, so a higher threshold could never fire there and the loading
  state would be invisible in the version built to test it.
- `SKELETON_DURATION_MS = 2000` — Rusty's number, up from 1100. Longer than a real
  subtree fetch should take, which is the point of a prototype loading state: the
  state is what's under review, and at a realistic 400ms there is nothing to look
  at. There's a floor as well as a preference —
  Garden's `Skeleton` has its own fade-in keyframes (`0%,60%{opacity:0}` over 750ms)
  so it is *deliberately invisible for the first ~450ms* to avoid flashing on fast
  loads. At 600ms the skeletons rendered and could not be seen. 2000ms leaves
  ~1550ms visible.
- `SKELETON_ROW_LIMIT = 8` — caps placeholders so a wide node doesn't fill the
  screen with grey.
- `SKELETON_MAX_WIDTH = 260` — without it the bars stretch the full table width
  and read as a loading page rather than as pending names.

The skeleton rows are pinned to `ROW_MIN_HEIGHT` with an explicit
`line-height`, because Garden's `Skeleton` sets its own line-height and renders a
non-breaking space inside — left alone it makes a taller row than the one it
replaces, and the list jumps when the real names land.

### V3.75: a cap with a door in it

V3.75 is V3.5 pointed at **175 departments** under Bramblewick — the case V3.5
deliberately avoided. Expansion in place is a good answer until the thing you
expand is longer than the page; then it stops being an answer and becomes the
problem. So V3.75 keeps everything about V3.5 and adds two things:

- **Any one list stops at 50 rows.** Open Bramblewick and you get Accounting
  through Development Studies, not all 175.
- **A text button at the end of the list**: *View all 175 in Bramblewick
  University*, with `125 more not shown` beside it. Clicking it **opens that
  department in a second Support tab**, beside the profile tab, showing that
  department and every one of its children.

The pairing is the point. The cap on its own is a dead end — you can see that
there is more and not reach it. The full-page view on its own doesn't help,
because you'd have to know to go there. Together the tree stays a summary and the
page is where you go when the summary isn't enough.

**Why a whole page rather than more rows.** The obvious alternative is *Show 50
more* in place, which is really paging in a tree. It fails on a mixed list: the
window can land in the middle of an expanded subtree, so the rows you're paging
aren't a list any more, they're a slice of a shape. A page whose subject is one
department has no such problem — its children are all it contains.

`src/components/DepartmentPage.jsx` renders that page. It is **not** a second
copy of the tree: it renders the same `OrganizationHierarchyTab` rooted at the
department (`rootId`) with the cap lifted (`uncapped`). Same geometry, same
chevrons, same skeletons, same selection behaviour — so a child that has children
of its own still opens in place there, and the two views cannot drift apart when
either is touched. What differs is what's around it: a header naming the department
and the path down to it, and a search field scoped to it. It keeps
the profile's **properties rail** — the page is still about an organization, and
its Tags, Domains and access setting matter as much here as on the profile — and
drops only the Tickets/Users/Related tab strip, which is a set of *other* views of
the record rather than part of this one.

The rail is `src/components/OrganizationProperties.jsx`, extracted from the
profile so both pages render the same component. It was inlined in
`OrganizationProfile` first; two copies of a list of fields is exactly the kind of
thing that drifts one field at a time, and the *Can view tickets in this org and
below* option is the whole feature, so the two views disagreeing about it would be
the worst possible place for the drift to land.

**The page pages, at 100.** Lifting the cap made it the one view showing a long
list unabridged, which is the failure mode the cap exists to avoid — so it takes
V4's answer instead: Garden's `OffsetPagination` under the table. The cap and the
pager are the two answers to the same problem, and this page is where the uncapped
one has to hold up.

**The count heads the table rather than following it.** `100 of 175 departments` sits
above the table in foreground.subtle, 8px clear of it, with the `Organization` column
label in the header cell below. The top of a list is where someone decides whether to
scroll it; under the table the same sentence only answers that question after they've
scrolled to the end to find it.

Four things it deliberately isn't:

- **Not `1–100 of 175`.** The range's first number says where the window starts,
  which the pager already says; the count of what's on screen is the part the reader
  doesn't otherwise have. On page two it reads `75 of 175` — the rows on that page,
  not `101–175`.
- **Not *organizations*.** These rows are departments everywhere else on the page,
  and the generic word belongs to the tree, which shows resellers and companies too.
  This page has one subject.
- **Not bold.** It's a note about the list, not a heading — at heading weight the
  count claimed more of the eye than a count deserves.
- **Not *in Bramblewick University***, the way V4's caption is. The row directly
  beneath is that organization, so naming it repeats the next line.

**One arrangement on every version**, arrived at the long way. For a round or two V3.75
moved the count *into* the header cell and dropped the `Organization` label with it, on
the argument that two lines of chrome sat between the search field and the first row and
the label was doing no work — the rows are plainly organizations and the count says the
word already. Both halves came back. A caption standing in a header cell gets read as a
heading, so the count had to carry two jobs at once; and the label, redundant as it looks
in isolation, is what makes the thing below a table rather than a list that starts
abruptly. The two are now stacked in the order they're read: how much there is, then what
the column holds.

The same round removed the rule under the header row and put it back for a related
reason. Garden draws it to separate column labels from data, so with no labels left it
read as a divider between the page and its own list — but the rows below carry no rules
in these versions, so that one line is the only thing marking where the tree starts.

So the geometry is uniform: **the count 8px above the table on all six versions and the
department page**, left-aligned with the search field, the table and the column label —
seven views, one measurement, which the harness checks across all of them rather than on
one. It was briefly conditional (24px where the count sat in the header cell, 20px
otherwise, via a `$countInHeader` prop on `SearchField`) and that is exactly the kind of
per-version branch that drifts, so it's now a single 20px margin with the count line's own
8px beneath it.

**8px to the label, not to the cell.** The first attempt measured correct and looked
wrong: the gap to the header cell's box was 8px while the words underneath sat 29px
below the count. Garden gives the header *row* a fixed 48px height with
`vertical-align: bottom`, which is right for a table whose header is the first thing on
the page and wrong for one with a caption directly above it — the label sank to the
bottom of a 48px box inside a correctly-placed cell. The fix takes the height off the
row (`thead tr { height: auto; vertical-align: top }`) and lets the cell's own padding
set the spacing: none above the label, 8px below it.

Worth knowing which element to aim at, because the obvious try does nothing: the 48px
is on `StyledHeaderRow`, not the cell, and a table cell can't be shorter than its row —
so `height: auto` on the `th` alone leaves the header exactly as tall as it was. The
harness now measures the row's height and the distance between the two *text* lines, not
just the box, so a header that grows back gets caught.

One more trap in the same edit: **CSS comments inside a styled-components template can't
contain backticks.** A comment reading `` `height: 48px` `` closed the template literal
and took the whole app down with a parse error at that line — blank page, no console
error, only a 500 on the module in the network log.

The one thing still version-specific: **in V4 a second caption stays *below* the table**,
because its paged rows are one group among ancestors and siblings — a count spanning the
whole table there would look like it counted all of them. That's what `isRootedPageStatus`
gates.

One Garden detail, in case the rule ever does need to go: it's an inset `box-shadow`, not
a border, so `border-bottom: none` doesn't remove it — and its selector is
`.table > .headerRow:last-child > .headerCell`, three classes, which outspecifies a plain
styled-components override. It takes `&&&&` to win on specificity rather than on
`!important` or stylesheet order.

**The whole work area scrolls, on every version.** The tree used to scroll inside its own
wrapper with the organization's name, the tab strip and the search field pinned above it.
That reads as a pane inside a page rather than as a page — and it put two scroll regions
on screen at once, this and the properties rail, leaving a reader to work out which one
their wheel was over. Now `MainSection` is the single scroller on both routes (the profile
and the department page) and everything in the column moves together: heading, tabs,
search, count, table. `Wrapper` has no `overflow-y` of its own.

The rail keeps its own scroll. It's a separate fixed-width column, and in Support it stays
put while the record's content moves, so it's the one place two scroll regions are the
expected thing rather than a puzzle.

**Paging returns to the top.** The pager is at the foot of a hundred rows, so that's
where the reader is standing when they click it — and landing at the foot of the *next*
hundred shows them its last rows with nothing to say they've arrived at the start of
something. `goToPage` sets the page and scrolls the scroller back to 0.

It finds that scroller by walking up the DOM from a ref on its own root rather than
holding a ref on an element it renders, because the element that scrolls now belongs to
the page *around* this component — `OrganizationProfile`'s `MainSection` on one route,
`DepartmentPage`'s on the other. Walking up finds whichever is there, which beats either
parent having to thread a ref down into the tab. Same walk the harness uses to locate it.

**On the department page the names aren't links.** Every other view makes each
organization a link that re-centres the tree on it. Here they're plain
foreground.default text, because this page's whole job is showing one organization's list
at once: drilling into a department would replace that list with the department's own,
and — since the page shares its selection with the tab that opened it — quietly re-point
that tab too. Expanding still works, because a subtree opening in place leaves the list
underneath it where it was. `isReadOnlyNames` is keyed off `rootId`, so it's a property of
the rooted page rather than of V3.75: the profile tab is still where you navigate from,
and its names are still links.

**And the whole row expands, not just the chevron.** With no link text in the row there's
nothing else it could do, and a 16px glyph is a small target for the page's only
interaction — so the row takes the click too, with `cursor: pointer` as the affordance
since the hover tint on its own reads as tracking rather than as something to click. Rows
with no children stay inert and show no pointer: there is nothing to open, and a cursor
promising otherwise is worse than no cursor.

Two details this needs. The chevron calls `stopPropagation`, or its click would bubble to
the row, toggle a second time and net no change — the most confusing possible outcome,
since the control would look broken while the row worked. And `isRowToggle` requires
`isReadOnlyNames`, so no other version gets a row-wide handler: everywhere else the row
contains a link, and a click on the padding beside a name doing something different from
the name is the kind of inconsistency nobody reports but everybody feels.

**The heading is just the name.** It used to read `Bramblewick University · 175
child organizations · 200 below in total`. Two totals a few pixels apart is a
question about the page rather than about the hierarchy — the header's number
counted every descendant while the table's counts the direct children on screen, so
the reader's first job was working out why 175 and 200 disagreed. The one count
that describes what's actually on screen now heads the table, and the reach figure
is gone rather than restated somewhere quieter.

It pages **the root's children only** — not the selected node's, the way V4 does.
On a rooted page the root is what the page is about, so its children are
unambiguously the list, and a list is the only thing a pager can honestly walk.
Windowing a nested node would slice a shape rather than a list: the window could
open mid-subtree, and the rows either side of it wouldn't be siblings. `page` is
therefore passed to `buildExpandableRows` only when `uncapped && rootId`, and it's
mutually exclusive with `rowCap`.

Details worth knowing:

- **`WIDE_ROW_CAP = 50` is its own constant**, not shared with V4's
  `CHILDREN_PER_PAGE = 100`. A window you page through and a hard stop with a door
  beside it are two different answers to the same problem; one constant would tie
  the two versions' answers together and make the comparison meaningless.
- **The cap applies per node, not per page.** Every list in the tree is capped
  independently, so a wide branch nested inside another wide branch gets its own
  *View all*.
- **The View all row is part of the tree, not a footer.** It sits on the guide
  lines at the depth of the children it stands in for, and it counts as the last
  child for the purposes of closing the rail — so the vertical line ends at it
  rather than at the 50th name, which would leave the row hanging outside the
  branch it belongs to.
- **It's Garden's `Anchor`, not a `Button`.** Rusty asked for a text button;
  `Button isLink` still brings a 36px box with it, which breaks the row height.
- **Collapsing the node takes the View all with it**, since it's a child row like
  any other.
- **`isLast` is judged against the full child list, not the page.** On page one the
  hundredth row is not the last child, so the rail has to carry on past it; deciding
  the elbow from the visible page closes the vertical line at row 100 of 175 and the
  tree looks like it ends mid-list.
- **The search field is 440px, with 24px beneath it.** That 24px started as clearance:
  the toolbar used to stay put while the tree scrolled under it, and without a gap the
  first row to pass behind it lost half its name, which reads as a rendering fault
  rather than as scrolling. The page scrolls as one now, so nothing passes behind it and
  the 24px is simply the gap to the count line. The tab's own `Wrapper` still goes flush
  (`$flush`) here so the two paddings don't stack.
- **The label is *Search this organization***, not "Search organizations in
  Bramblewick University". The department is named twice above it already, and a long
  name wraps the label onto two lines.
- **The Comment toggle sits 32px from the left edge**, over the nav rail rather than
  clear of it — the rail's own icons stop well above the bottom of the window, so the
  space is free. `CommentLayer` measures the rail by default, which put the button
  80px in, far enough that it read as belonging to the page content; the position is
  an optional `toggleLeft` prop so the shared drop-in keeps its measuring default for
  other prototypes.
- **The second tab closes when you leave V3.75.** The full-page view only exists
  in this version, so a tab left standing would show a page the current version
  can't produce.
- **The tab strip's fills are opaque.** It's overlaid on the global TopBar, which
  has its own *Add* button behind it — a transparent "outline" tab lets that label
  read straight through the organization name.
- **Comment pins remember which tab they were made on.** The same screen position
  holds a department list on one tab and the profile on the other, so the pin
  context carries `wideTabOrgId` and `activeTabId` alongside the version and
  selected organization.

### V4: the at-scale case

V4 is V2's treatment run against an organization that is genuinely wide —
**Bramblewick University carries 150 child departments** instead of three.
Accounting, Aerospace Engineering, African Studies, … Palaeontology: departments
rather than people, because the question V4 asks is how much of *the hierarchy*
one level can hold. Centring the view bounds how *deep* the tree goes and says
nothing about how *wide* a node is, so this is the case the focused view doesn't
answer on its own.

The departments hang off **Bramblewick**, the organization the prototype opens on,
so switching to V4 puts you in the at-scale case immediately — no drilling. They're
listed alphabetically, which is what makes a hundred rows navigable at all and what
makes paging legible: page one ends at Interior Architecture, page two picks up at
International Relations.

**The departments are leaves.** None has children of its own, so drilling into one
lands on a page with a path above it and nothing below — deliberately, since V4 is
about breadth and the ten-level depth case is already covered by Computer Science
in V1–V3.

It shows **up to 100 child organizations per page** and paginates past that, with
Garden's `OffsetPagination` centred under the table — it takes Flora's tokens from
the ThemeProvider, so the current page reads in Flora's blue. Above it, `Showing
organizations 1–100 of 150 in Bramblewick University`, because otherwise a hundred
rows sit under a node whose Child orgs column says 150 and the two look like they
disagree. It stays at the bottom here, unlike V3.75's, which heads its table — the
difference is that V4's paged rows are one group among ancestors and siblings, so a
count in the header cell would appear to be counting the whole table.

Three details worth knowing:

- **Whichever long group is on screen is the one that pages.** Children and
  siblings are the same list seen from either side of a drill-in, so after clicking
  into Accounting the hundred-odd rows are its *siblings* rather than its children.
  Only one of the two can be over a page long, so the pager follows it, and the
  caption names whichever organization owns the list. The alternative — paging only
  children — made the control appear and vanish as you moved one level.
- **Drilling into a department on page two stays on page two.** The page resets to
  wherever the newly selected organization actually falls in its sibling group, so
  clicking Palaeontology doesn't bounce the list back to Accounting.
- **150 = Bramblewick's three hand-written departments plus 147 generated ones**,
  appended rather than substituted. The three are the ones the deep Computer
  Science branch hangs off, so they have to stay. It also leaves page two at 50 — a
  real page rather than a stray remainder, and not a round multiple of the page
  size, which would hide the part-full last page.

#### Two rosters, on purpose

V3.75's 175 and V4's 150 come from two separate lists in `hierarchy.js`:
`AT_SCALE_DEPARTMENTS` (147 generated) and `WIDE_DEPARTMENTS` (those 147 plus 25
more), selected by the `atScale` and `wide` flags on `getChildren`.

That looks like duplication and isn't. V4's 150 is load-bearing — the arithmetic
in the bullet above is a deliberate choice about what page two should look like,
and it's under review. Growing the one list to 175 would silently re-cut V4's
pages while Rusty was still comparing them. Two rosters means each version's
number can move without disturbing the other's.

**V4 has no people rows**, though it keeps the People column. Its subject is the
width of one level of the hierarchy, so putting users in the tree as well would
confound the two. The column stays because "150 child orgs" says nothing about how
many people the cascade actually reaches, which is the number the feature is
ultimately about. For the same reason the search field reads *Search
organizations* here rather than *Search organizations and users* — offering to
search users would promise something this tree can't show.

100 is a high page size; Support's own lists sit nearer 30. That is the thing
under test. Page one is roughly 4,300px of scroll, which is either an acceptable
price for never paging or an argument for bringing the number down — worth
watching someone actually look for a department in it before deciding.

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

## Comment mode

Anyone with the link can annotate the prototype in place, Figma-style: click
**Comment** in the bottom left, click the thing you want to talk about, and a
numbered pin and a thread appear. Pins persist, so you can come back and read
what people said. Replies are one level deep; threads can be resolved or deleted.

This exists because a prototype in a browser has no comment affordance at all.
Feedback on the earlier versions arrived as Slack messages describing rows
("the one under Product, two levels down") which is slow to write and easy to
misread. A pin points at the row.

It is deliberately outside the prototype's own flow. While comment mode is off,
nothing intercepts a click and the prototype behaves exactly as it did before the
layer existed. That matters more than it sounds: the alternative — always-on
commenting — makes every click ambiguous between using the design and annotating
it.

**Pins remember the view, not just the position.** This is the part that isn't
obvious. A Figma pin can be a plain x/y coordinate because the canvas doesn't
change underneath it. Here the same screen position shows entirely different
content depending on which version is selected and which organization the tree is
centred on — a pin dropped on a department row in V4 would float over blank
space in V1. So a pin stores the version, the selected organization, a structural path to
the element, and where inside that element the click fell as a fraction of its
box. Opening a comment restores the version and organization first, then scrolls
its row into view. Comments made on another view aren't drawn on the current one;
the sidebar lists them with a "on another view — click to jump there" note.

Two smaller decisions worth knowing:

- **The toggle sits bottom-left, and its offset is measured rather than
  hard-coded.** The sidebar opens from the right and narrows the app, so a
  bottom-right button ends up sitting on the panel it just opened. The layer finds
  the nav rail touching the left edge and clears its width instead of assuming a
  number, so the file drops into another prototype unedited. **This prototype
  overrides it to 32px** via the optional `toggleLeft` prop: measuring put the
  button 80px in, clear of the rail, which read as belonging to the page content
  rather than to the window. The rail's own icons stop well above the bottom, so
  sitting over it costs nothing. The override is a prop rather than a change to the
  measuring code, so other prototypes keep the default.
- **⌘-click (Ctrl-click) navigates** without leaving comment mode. The click
  catcher covers the design area, so plain clicks can't reach the links
  underneath — and an early version covered the whole viewport, which trapped
  reviewers on whichever version they happened to enter comment mode on. The
  catcher is now scoped to the commentable area, so the version switcher and nav
  stay live regardless.
- **The path uses `nth-of-type`, never class names.** styled-components
  regenerates its class names on every build, so a class-based path would break
  on the next deploy — pins would silently detach, which is worse than pins that
  visibly fail. If the anchored row's text has changed since, the thread header
  says "content changed since" rather than hiding the pin: the row may have been
  legitimately renamed.

Where comments are stored depends on configuration, and the sidebar always says
which mode you're in:

| | |
| --- | --- |
| **Shared** | A free Supabase project. Everyone with the link reads and writes the same threads. Five minutes of setup: **[src/comments/SETUP.md](src/comments/SETUP.md)** |
| **This browser only** | The fallback when no credentials are configured. No setup, but nobody else sees your comments. |

There's no login — just a remembered name. Anyone with the link can post under
any name and delete anyone's comment. That's the right trade for design review
among colleagues and the wrong one for anything needing trustworthy attribution,
so don't put confidential material in a comment.

`src/comments/` is self-contained and has **zero dependencies** — Supabase is
reached over its REST API with plain `fetch` rather than through the SDK, which
would have added ~40kB and a realtime client this doesn't use. Dropping it into
another prototype is: copy the directory, change `PROJECT` in `store.js`, put
`data-comment-root="true"` on the element wrapping the design, and render
`<CommentLayer context={…} onRestoreContext={…} />`. The `context` object is
opaque to the layer — it's whatever state your prototype needs to restore, so a
different prototype passes a completely different shape without editing anything
in the directory.

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
  back and no history. **V3.75 opens a real second tab**, but only from a *View
  all* — clicking a name still re-centres, where Support would open a tab per
  organization.
- Lazy loading for the "hundreds wide" case. V4 pages the rows, but every
  department is still in memory and the whole page renders at once; a real
  150-child organization would fetch per page.
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
  better once a department has 100+ users? V2 puts the people in the tree; V4
  keeps the column with no people rows at all, so the column can be judged on its
  own.
- Is 100 the right page size? It's the number under test in V4, and V3.75's
  department page reuses it. Lower means less scroll and more paging; Support's own
  lists sit nearer 30. Worth noting the two pages aren't equivalent tests: V4's
  hundred rows sit inside a tree with other branches open, while the department
  page's hundred are the only thing on it, so the same number may well be right in
  one place and wrong in the other.
- **Is 50 the right cap?** V3.75's number is under test the same way. 50 is
  already a long scroll inside a tree that also has other branches open, and the
  argument for a cap gets stronger the lower it goes — but a cap low enough to
  fire on ordinary nodes sends people to a full page for lists they could have
  read in place.
- **Cap-and-page, or page-through?** V3.75 and V4 are the two answers, and the
  comparison is the reason both exist. The cap tells you the truth immediately
  (*175, showing 50*) and moves you somewhere better; the pager keeps you in the
  tree and asks you to walk. A third possibility neither prototypes: cap at 50 and
  make *View all* filter in place rather than navigate.
- **Does a second tab read as a second tab?** V3.75 opens one in Support's own
  strip, which is the affordance Support already has — but the prototype's strip is
  a drawing overlaid on the global TopBar, so whether it reads as "a new tab
  opened" or as "the page changed" is worth watching rather than asking about.
- **Does paging belong in the tree at all?** A hundred child organizations is a
  list, and V4 renders it as tree rows because that's what the tab is — but an
  alphabetical index, a filter, or a count link into a normal paged list are all
  plausible answers to "this node has 150 children" that don't put 150 rows on a
  hierarchy page. **V3.75's full-page view is a partial version of that answer** —
  the rows are still tree rows, but they're on a page whose subject is the one
  department.
- Do the row dividers help or hurt? V3 removes them to find out.
- Is the chevron's direction doing work the guide lines don't already do? V4 uses
  dots — filled vs. ring — to find out. The risk is affordance: a dot looks less
  like something you click.
- Is one level down enough? A focused view is scannable but makes reaching a
  deep node an eight-click trip. **V3.5 is one answer** — expand in place, no
  navigation — and it is the sharpest question in the set, because V3.5 doesn't
  moderate the focused view, it abandons it: the tree is rooted and unbounded
  again. With three branches open it *is* the recursive tree this design replaced,
  which is either the honest admission that hierarchies want to be browsed or a
  round trip back to the problem centring solved. Two levels of children by
  default, or a breadcrumb of the path you clicked through, are the middle
  positions nobody has prototyped yet.
- **Does splitting the chevron from the name teach itself?** V3.5 gives one row two
  targets that do different things — 20px of chevron that opens, and the name that
  navigates — with nothing but the cursor to say so. Reviewers who've used a file
  tree will expect it; reviewers coming from V1–V3, where the chevron and name are
  interchangeable, may click the chevron expecting to be taken somewhere. Worth
  watching rather than asking about.
- Should the loading state be real? The skeletons in V3.5 are on a timer. If
  review likes them, the question for engineering is which nodes actually need a
  fetch — and `SKELETON_THRESHOLD` becomes a real answer about list size rather
  than a number chosen so the effect is visible in a small tree.
- Three markers on the selected row (bar, tint, bold) may still be one too many —
  the `current` tag was already dropped as a fourth. The bar is the strongest of
  the three and the tint the softest, so if review says the marking is still
  loud, the tint is what goes next. Against that: the tint is the only marker
  that reaches the full width of the row, and the columns on the right have
  nothing else tying them to the selected name.
- Does this need a dedicated full-width page, or is the profile tab enough real
  estate? **V3.75 builds one of each** — the profile tab's tree beside a full-width
  page for a single department — so the two can be judged against each other rather
  than argued about.
- Is "Organization hierarchy" the right tab label, or something like "Access"?
