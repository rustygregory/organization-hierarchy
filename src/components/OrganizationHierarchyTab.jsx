import { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import {
  Table,
  Head,
  HeaderRow,
  HeaderCell,
  Body,
  Row,
  Cell,
  Caption,
} from '@zendeskgarden/react-tables'
import { OffsetPagination } from '@zendeskgarden/react-pagination'
import { Anchor } from '@zendeskgarden/react-buttons'
import { Field, Label, MediaInput } from '@zendeskgarden/react-forms'
import { Skeleton } from '@zendeskgarden/react-loaders'
import { SM } from '@zendeskgarden/react-typography'
import {
  getChildren,
  getOrganization,
  getPeopleIn,
  getPath,
  getDescendantIds,
  countPeopleAtOrBelow,
} from '../data/hierarchy'

/* Tree geometry. One indent step per level; the vertical guide line sits at
   RAIL_LINE_OFFSET inside its step so it lands directly under the parent
   row's chevron. The horizontal arm stops ARM_GAP short of the next element,
   which is the breathing room the row rules used to provide. */
const INDENT_STEP = 24
const RAIL_LINE_OFFSET = 10
const ARM_GAP = 4
const CHEVRON_SLOT = 20
/* Garden's cell padding (theme.space.base * 3). Needed to place the row rule,
   which is measured from the cell's border box, not its content box. */
const CELL_PADDING = 12
const RULE_COLOR = '#eae9e8'
/* A row's height. Shared by RowInner and V3.5's skeleton rows, which have to match
   it exactly — a placeholder taller than the row it stands in for makes the list
   jump as each group of children resolves. */
const ROW_MIN_HEIGHT = 36

/* The selected row's background: blue.100, the faintest step on Flora's primary
   ramp. It's a tint rather than a fill — enough to read as a band across the row
   at a glance, not enough to compete with the names sitting on it.

   Hover stays grey.100 so hovering a row never imitates selection; the selected
   row keeps its own tint on hover rather than reverting to grey. */
const SELECTED_ROW_BG = '#f3f6fb'
const HOVER_ROW_BG = '#f7f7f7'

/* The selection bar: 2px of border.primaryEmphasis down the left edge of the
   selected row, and that row only.

   It is drawn as a pseudo-element on the row's first cell, with explicit `top: 0;
   bottom: 0`, so it spans exactly one row's height and cannot bleed into the rows
   either side. Crucially it is *not* Garden's own focused-row bar: Garden draws an
   inset box-shadow on any focused row, rows here are keyed by organization id so
   the focused DOM node survives a re-render, and the result was bars accumulating
   down the tree as you drilled. That is switched off (see TreeTable's isReadOnly
   note) — this bar is the prototype's own, keyed off the selected id, so exactly
   one row can ever carry it.

   It needs no gutter of its own: the name cell's 12px padding plus the chevron
   slot already leave clear space at the left edge, so the bar sits in space that
   was empty and nothing shifts. Deliberately so — the last attempt at this gave
   the bar its own column, which meant threading a width through ruleInsetFor and
   the descender geometry and knocking the indents off their 24px multiples. */
const SELECTION_BAR_COLOR = '#406cc4'
const SELECTION_BAR_WIDTH = 2

/* How many child-organization rows one page of the tree shows before the pager
   takes over. Only V4 has a list long enough to reach it. 100 is high for a page
   size — Support's own lists sit at 30 — and that is the thing under test:
   whether a hundred sibling departments is a scroll a reader will accept in
   exchange for never paging, or whether the number wants to come down. */
const CHILDREN_PER_PAGE = 100

/* V3.5's expand loading state.
 *
 * Opening a node in place shows skeleton rows for a beat before the real ones
 * arrive. It is faked — the data is already in memory — but the real feature will
 * fetch a subtree on demand, so the question worth putting in front of a reader is
 * whether an expanding node that *pauses* still reads as expansion or as a stall.
 *
 * Only for lists longer than SKELETON_THRESHOLD. Below it the pause costs more than
 * it shows: two rows appearing instantly reads as the tree responding, and flashing
 * placeholders over them reads as a glitch. The real feature has the same shape — a
 * couple of children is one cheap request.
 *
 * It has to stay low while V3.5 is in the set. V3.5 is a copy of V3, whose hand-written
 * tree tops out at four children (Model Training Pod) with most expandable nodes at
 * three — so a higher threshold could never fire there, and the loading state would be
 * invisible in the version built to test it. The constant is shared with V3.75, which
 * has a 175-wide node and could carry a higher number on its own; splitting it per
 * version is a one-line change if the two ever want different answers.
 *
 * Two seconds, Rusty's number — long enough to read the placeholders as a state and
 * decide whether it's the right one, which is what this is in front of anyone for. It
 * is longer than a real subtree fetch should take, and that's the point of a prototype
 * loading state: at a realistic 400ms there is nothing to review.
 *
 * There is a floor as well as a preference. Garden's Skeleton fades itself in with
 * `0%,60% { opacity: 0 }` over 750ms — deliberately invisible for the first 450ms so
 * a fast load never flashes. Anything under ~700ms therefore shows placeholders that
 * are still transparent when they're removed, which looks like rows appearing late
 * rather than like loading. 2000ms leaves roughly 1550ms of visible skeleton. */
const SKELETON_THRESHOLD = 2
const SKELETON_DURATION_MS = 2000
/* How many placeholder rows to draw at most. A node with 150 children doesn't want
   150 skeletons — past a handful they stop reading as "content is coming" and start
   reading as content. Eight fills the space a long list will occupy without
   pretending to know how long that list is. */
const SKELETON_ROW_LIMIT = 8
/* Varied widths so the block reads as rows of names rather than as a bar chart.
   Fixed and cycled rather than random — see the note where they're used. Percentages
   of SKELETON_MAX_WIDTH, not of the cell. */
const SKELETON_WIDTHS = ['62%', '45%', '71%', '38%', '55%', '66%', '42%', '58%']
/* The widest a placeholder can get: about the length of the longest name in the
   tree ("Speech Recognition Team", "International Relations") at 14px. Without it a
   bar stretches across the whole table — see SkeletonName. */
const SKELETON_MAX_WIDTH = 260

/* V3.75's cap. However many children a node has, expanding it in place shows at most
   this many, followed by a *View all* that opens the whole department as its own page
   in a new tab.
 *
 * 50 rather than V4's 100 because the two versions are asking opposite questions.
 * V4 puts the whole list in the tree and pages it, testing how much of a hierarchy
 * one level can hold. V3.75 assumes it can't hold it, and tests the other answer:
 * cap the tree at a readable depth and send the long list somewhere built for it. A
 * cap only means something if it bites well before the list ends — at 100 of 175
 * you're most of the way down anyway, and the escape hatch reads as a pager.
 *
 * Deliberately not the same idea as CHILDREN_PER_PAGE. That is a window onto a list
 * you walk through in place; this is a hard stop with a door next to it. Sharing one
 * constant would tie two versions' answers together. */
const WIDE_ROW_CAP = 50

/* Where a row's name text begins, measured from the left edge of the name
   cell — the point its horizontal rule starts from. */
const ruleInsetFor = (depth) =>
  CELL_PADDING + depth * INDENT_STEP + CHEVRON_SLOT + ARM_GAP

/* Rails are *attached*: a row with children in view draws a descender from its
   own chevron down to its children's rail, so the guide line runs unbroken from
   node to node. The detached alternative — the rail starting at the top of the
   first child row, leaving a half-row gap under the parent chevron — was the
   other half of a side-by-side comparison that the focused view can no longer
   stage: only the path and the selected node ever have children on screen, so
   there is no second branch to contrast against. The ancestor path is the spine
   of this layout, and attached is what keeps it continuous. */


/* The scroller. `$flush` drops the top padding for the rooted department page, whose
   own toolbar sits above this and owns the gap below the search field — otherwise the
   two stack and the table starts 48px down on first paint but 24px down once
   scrolled. */
/* No scrolling of its own — the page around it scrolls, so the whole work area moves
   together rather than the tree sliding under a pinned header. `flex: 1` still, so the
   wrapper fills the space it's given and its padding sets the page's bottom margin. */
const Wrapper = styled.div`
  padding: ${(props) => (props.$flush ? '0' : '24px')} 32px 40px;
  flex: 1;
`

/* Replaces the page heading. Fixed 450px rather than fluid — the tree beside it
   is already as wide as the table, and a full-width search reads as a filter on
   the page rather than on this one list.

   Two overrides on Garden's MediaInput: it sizes to its font by default, so the
   height is pinned to 40px; and it aligns the icon and text on `baseline`, which
   leaves the magnifying glass sitting low in a taller-than-default input —
   `center` puts it on the vertical centre line. */
const SearchField = styled(Field)`
  width: 450px;
  /* 20px, with the count line below supplying its own 8px before the table. */
  margin-bottom: 20px;

  [data-garden-id='forms.faux_input'] {
    align-items: center;
    box-sizing: border-box;
    height: 40px;
  }

  [data-garden-id='forms.input'] {
    height: 100%;
  }
`

const SearchLabel = styled(Label)`
  font-size: 14px;
  font-weight: 600;
  color: #2f3130;
  margin-bottom: 4px;
`

/* The count line, above the table on every version. 20px above comes from
   SearchField's margin-bottom; no top margin here, so the two don't stack. 8px below
   keeps it tight to the table, close enough to read as a caption for it rather than as
   a second line of page copy. */
const Counts = styled(SM)`
  display: block;
  color: #646864;
  font-size: 14px;
  white-space: nowrap;
  margin-top: 0;
  margin-bottom: 8px;
`

/* Garden's own row rules come off. They're redrawn per row below so each one
   starts at its row's name text rather than at the table edge — a full-width
   rule cuts straight through the tree's vertical guides.

   Everything in the table sits at 14px: Garden's default for cells, but its
   header cells inherit a smaller size, so it's set on the table to cover both.

   `isReadOnly` is what turns off Garden's own row interaction styling. Garden's
   Row draws `box-shadow: inset 3px 0 0 0 border.primaryEmphasis` on its first
   cell whenever the row is focused, and it gives every row `tabIndex={-1}`, so
   clicking a row focuses it and leaves a blue bar down its left edge. The bar
   then persists — a click on a name re-renders the tree, and because rows are
   keyed by organization id the focused DOM node is reused, so old marks stack up
   as you drill down. That is the "growing blue line", and it was never the
   prototype's own marker. isReadOnly makes Garden treat rows as static content:
   no tabIndex, no focus tracking, no box-shadow. */
const TreeTable = styled(Table)`
  table-layout: fixed;
  font-size: 14px;

  /* Garden gives the header *row* a fixed 48px height and bottom vertical-align, which
     is right for a table whose header is the first thing on the page but not for one
     with a count directly above it: the label sank to the bottom of a 48px box, so the
     8px gap above the count's line became 29px of air before the words. The height comes
     off the row — the cell's own padding is what sets the spacing instead, 8px below the
     label and none above it.
     Note it's the row, not the cell: height:auto on the th does nothing, because a
     table cell can't be shorter than its row.
     (No backticks in comments inside a styled template — they close the literal.) */
  thead th {
    font-size: 14px;
    padding-top: 0;
    padding-bottom: 8px;
  }

  thead tr {
    height: auto;
    vertical-align: top;
  }

  tbody tr,
  tbody td {
    border-bottom: none;
  }

  /* Belt and braces: isReadOnly stops Garden setting its focused flag, but the
     :focus half of its rule is unconditional, so a row focused any other way
     (a click landing on the td, programmatic focus) could still paint the bar. */
  tbody tr td:first-of-type,
  tbody tr:focus td:first-of-type {
    box-shadow: none;
  }
`

/* The rule is a pseudo-element rather than a border so the name cell's copy can
   be inset by its own indent while every cell to the right stays flush. Drawn
   on all cells from the same `bottom: 0`, so the segments line up exactly.
   V3 drops it entirely: the only line left running across the page is the one
   under the header, so the tree's own vertical guides carry the structure. */
const TreeRow = styled(Row)`
  /* Set on the cells rather than the row: Garden gives its own cells a
     background, which would paint over a colour set on the row itself. */
  td {
    position: relative;
    background-color: ${(props) => (props.$selected ? SELECTED_ROW_BG : 'transparent')};
  }

  &:hover td {
    background-color: ${(props) => (props.$selected ? SELECTED_ROW_BG : HOVER_ROW_BG)};
  }

  ${(props) =>
    !props.$noRule &&
    `
  td::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background-color: ${RULE_COLOR};
  }

  td:first-child::after {
    left: ${props.$ruleInset}px;
  }
  `}

  /* The selection bar, on the selected row and no other. top/bottom pin it to
     this row's box, so it can neither run into the neighbours nor accumulate:
     there is one selected row, so there is one bar. */
  ${(props) =>
    props.$selected &&
    `
  td:first-child::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: ${SELECTION_BAR_WIDTH}px;
    background-color: ${SELECTION_BAR_COLOR};
  }
  `}

  /* The whole row expands, on the rooted page where that's the only thing a row does.
     The cursor is the affordance: with no link text left there, nothing else says the
     row is a target, and the hover tint alone reads as tracking rather than as
     something to click. */
  ${(props) =>
    props.$clickable &&
    `
  cursor: pointer;
  `}
`

const NameCell = styled(Cell)`
  padding-top: 0;
  padding-bottom: 0;
`

const RowInner = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: ${ROW_MIN_HEIGHT}px;
`

/* The attached treatment. Runs from just below the row's own chevron to the
   bottom of the row, where the first child's rail picks it up — closing the
   half-row gap the detached treatment leaves. It lands on the same x as that
   rail because RAIL_LINE_OFFSET is half of CHEVRON_SLOT, i.e. the chevron's
   centre. */
const ParentDescender = styled.span`
  position: absolute;
  left: ${(props) => props.$depth * INDENT_STEP + RAIL_LINE_OFFSET}px;
  top: calc(50% + 5px);
  bottom: 0;
  width: 1px;
  background-color: #dcdcda;
`

/* One 24px slot per ancestor level. Draws the pass-through vertical for
   ancestors that still have siblings below, and the elbow for the row's own
   parent. */
const Rail = styled.div`
  position: relative;
  width: ${INDENT_STEP}px;
  min-width: ${INDENT_STEP}px;
  flex-shrink: 0;
`

const RailVertical = styled.span`
  position: absolute;
  left: ${RAIL_LINE_OFFSET}px;
  top: 0;
  bottom: ${(props) => (props.$stopAtMiddle ? '50%' : '0')};
  width: 1px;
  background-color: #dcdcda;
`

const RailArm = styled.span`
  position: absolute;
  left: ${RAIL_LINE_OFFSET}px;
  top: 50%;
  width: ${INDENT_STEP - RAIL_LINE_OFFSET - ARM_GAP}px;
  height: 1px;
  background-color: #dcdcda;
`

/* Leaf rows have no chevron, so the arm continues across the empty chevron
   slot and lands on the name. That is what ties a person to the organization
   node above them instead of leaving the row floating at an indent. It picks
   up where the rail's arm left off (hence the negative left) and stops short
   of the name by the same gap. */
const LeafArmContinuation = styled.div`
  position: relative;
  width: ${CHEVRON_SLOT}px;
  min-width: ${CHEVRON_SLOT}px;
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    left: -${ARM_GAP}px;
    top: 50%;
    width: ${CHEVRON_SLOT}px;
    height: 1px;
    background-color: #dcdcda;
  }
`

/* The chevron on a row whose subtree is out of view. It drills in rather than
   expanding in place — same destination as clicking the name, so the whole left
   edge of the row is a way into that organization's context. */
const ChevronButton = styled.button`
  width: ${CHEVRON_SLOT}px;
  min-width: ${CHEVRON_SLOT}px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #646864;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #2f3130;
  }

  &:focus-visible {
    outline: 2px solid #406cc4;
    outline-offset: 1px;
    border-radius: 2px;
  }
`

/* The same slot, inert: on the path and the selected node the children are
   already below, so the chevron is state, not a control. */
const ChevronSlot = styled.span`
  width: ${CHEVRON_SLOT}px;
  min-width: ${CHEVRON_SLOT}px;
  flex-shrink: 0;
  color: #646864;
  display: flex;
  align-items: center;
  justify-content: center;
`

const NameArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: ${ARM_GAP}px;
  min-width: 0;
`

const NameLink = styled.a`
  color: #406cc4;
  text-decoration: underline;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    color: #284173;
  }
`

/* Names that aren't links: the selected organization (already here) and people
   (no context of their own to open). The selected one is foreground.default and
   bold — it's the one row in the table that isn't somewhere to go. */
const NodeName = styled.span`
  font-size: 14px;
  color: #2f3130;
  font-weight: ${(props) => (props.$current ? 700 : 400)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

/* foreground.subtle — grey.700. Secondary to the name it follows, but a real
   step darker than the grey.600 this started at. */
const PersonTitle = styled.span`
  font-size: 14px;
  color: #646864;
  white-space: nowrap;
`

const Muted = styled.span`
  color: #999b97;
`

/* Garden's OffsetPagination, centred under the table the way Support centres the
   pager under a list. It takes Flora's tokens from the ThemeProvider wrapping the
   app, so the current page reads in Flora's blue rather than Garden's default.

   24px clear of the last row: enough that the pager is not mistaken for another
   row of the table, which matters more here than usual because the rows it pages
   through are indented under an organization that stays put. */
const PaginationRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
`

/* Sits above the pager, left-aligned with the table: which slice of the list is
   on screen. Without it the tree shows a hundred rows under a node whose Child
   orgs column reads 150, and the two look like they disagree. */
const PageStatus = styled(SM)`
  display: block;
  color: #646864;
  font-size: 14px;
  margin-top: 16px;
`

/* V3's replacement for the Child orgs column: the bare count in parentheses,
   right after the name. Reads as part of the node rather than as a column of
   repeated "child orgs" copy, which is what let the column go away. */
const ChildCount = styled.span`
  font-size: 14px;
  color: #646864;
  white-space: nowrap;
`

/* The Open all / Collapse all control that used to sit in the header cell is
   gone with the recursive tree: there is nothing left to open in bulk. Every row
   is either on the path, a direct child, or a direct sibling, and the way deeper
   is to drill in. */

const HiddenCaption = styled(Caption)`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

/* Garden's `search-stroke`, inlined for the same reason the chevron is: no SVG
   loader in this build. */
const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    focusable="false"
    aria-hidden="true"
  >
    <circle cx="6.5" cy="6.5" r="5" />
    <path strokeLinecap="round" d="m10.5 10.5 4 4" />
  </svg>
)

/* V4's alternative to the chevron: a dot in the same slot.
 *
 * The chevron is directional — down means "children are below", right means
 * "children are hidden behind this". A dot has no direction, so the two states
 * have to be told apart some other way, and the difference here is fill: a node
 * whose children are on screen is a filled dot, one still holding a subtree back
 * is a ring. That reads as a junction on the tree's guide line rather than as a
 * control, which is the point of trying it — whether the arrow was carrying
 * meaning the guide lines already carry.
 *
 * 7px across, sized to sit on the 1px rail without swallowing it. Drawn as a
 * bordered box rather than an SVG since it's a circle and nothing more. */
const Dot = styled.span`
  box-sizing: border-box;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: 1px solid currentColor;
  background-color: ${(props) => (props.$filled ? 'currentColor' : '#ffffff')};
`

/* Garden's Skeleton, sized to a tree row.

   Its `width` is a percentage of its parent, so the parent has to be the width the
   name would have had — hence a flex: 1 wrapper rather than dropping the skeleton
   straight into the row.

   The wrapper is also what holds the row to its normal height. Garden's Skeleton
   sets its own `line-height` from theme.fontSizes.sm and renders a non-breaking
   space inside, so left alone it makes a taller box than a 14px name and the whole
   list jumps as each group resolves. Fixing the wrapper's height to RowInner's
   min-height and overriding line-height on the bar keeps a loading row and a loaded
   row exactly the same size.

   And it is capped, not fluid. The name cell runs the full width of the table —
   over a thousand pixels — so a bar at 60% of it is several times longer than any
   organization name and reads as a loading *page* rather than as a row of names
   arriving. SKELETON_MAX_WIDTH is roughly the longest name in the tree, so the
   placeholders occupy the space the names will actually occupy. */
const SkeletonName = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  max-width: ${SKELETON_MAX_WIDTH}px;
  height: ${ROW_MIN_HEIGHT}px;
  padding-left: ${ARM_GAP}px;
`

const SkeletonBar = styled(Skeleton)`
  height: 14px;
  line-height: 14px;
  border-radius: 3px;
`

/* V3.75's *View all*, sitting where the 51st child would be. Takes the same gutter
   and height as a real row so the guide line runs into it and it reads as the end of
   the list rather than as a control parked underneath. */
const ViewAllArea = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  height: ${ROW_MIN_HEIGHT}px;
  padding-left: ${ARM_GAP}px;
`

/* A text button: Garden's Anchor as a button, which is what `isLink` on Button gives
   you but without inheriting the 36px button box that would push this row taller than
   the ones above it. */
const ViewAllButton = styled(Anchor)`
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`

const RemainderNote = styled(SM)`
  color: #646864;
  white-space: nowrap;
`

const CHEVRON_ROTATION = {
  down: 'none',
  right: 'rotate(-90deg)',
  up: 'rotate(180deg)',
}

const Chevron = ({ direction = 'down' }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{
      transform: CHEVRON_ROTATION[direction],
      transition: 'transform 100ms ease',
    }}
  >
    <path d="M2.5 4.5 6 8l3.5-3.5" />
  </svg>
)

/**
 * Builds the focused context for one organization. Deliberately NOT a recursive
 * walk: the view shows exactly one organization's neighbourhood, so it renders
 *
 *   - every ancestor, as a single path above the selected organization
 *   - the selected organization itself, tagged `current`
 *   - its direct children (and, in V2, its direct people)
 *   - its direct siblings
 *
 * and nothing else. No sibling's children, no ancestor's other branches. Drilling
 * into any of those means clicking it, which re-centres the page there.
 *
 * Each row carries the geometry its guide lines need:
 *
 *   depth          how far to indent
 *   isLast         terminate the parent's vertical with an elbow, not a tee
 *   ancestorIsLast one entry per depth, indexed by depth: was the ancestor at
 *                  that depth its own parent's last child? Where it was, the
 *                  vertical above it has already closed, so the corresponding
 *                  rail draws nothing. Index `depth` is the row itself.
 *   isOpen         its children are visible below it — drives the descender
 *   hasChildren    it has a subtree this view is holding back — drives the
 *                  right-pointing chevron that drills into it
 *
 * V3.5 does not use this builder. In-place expansion means the tree's shape has to
 * come from what the reader opened rather than from where the page is centred, and
 * those are the same thing here — every row this function emits is defined by its
 * relationship to `selectedId`. See buildExpandableRows below.
 *
 * `page` windows one group of organization rows: whichever of the selected node's
 * children or its own sibling group is longer than a page. Those are the same list
 * seen from either side — drilling into one of Bramblewick's 150 departments turns
 * its children into that department's siblings — so at most one of them is ever
 * long, and paging them the same way keeps the pager from appearing and vanishing
 * as you drill. The ancestor path is never paged: it's the structure of the view
 * rather than its contents, and paging it away would leave a page-two reader with
 * a list of departments and no indication of whose they are.
 *
 * Returns `{ rows, pagedTotal, pagedFrom, pagedTo }` so the caller can caption the
 * slice without recounting it. `pagedTotal` is 0 when nothing needed paging.
 */
const buildFocusedRows = (selectedId, showPeople = true, atScale = false, page = 1) => {
  const rows = []
  const empty = { rows, pagedTotal: 0, pagedFrom: 0, pagedTo: 0 }
  const path = getPath(selectedId)
  const selected = path[path.length - 1]
  if (!selected) return empty

  const orgOptions = { atScale }

  const hasChildren = (orgId) =>
    getChildren(orgId, orgOptions).length > 0 ||
    (showPeople && getPeopleIn(orgId).length > 0)

  const ancestors = path.slice(0, -1)

  // Every ancestor is an only child in this view — its siblings are out of
  // context — so each one closes its parent's vertical with an elbow, and no
  // pass-through verticals are needed alongside the path.
  let chain = []
  let idChain = []
  ancestors.forEach((org, depth) => {
    chain = [...chain, true]
    idChain = [...idChain, org.id]
    rows.push({
      key: `org-${org.id}`,
      kind: 'org',
      node: org,
      depth,
      isLast: true,
      ancestorIsLast: chain,
      ancestorIds: idChain,
      isOpen: true,
      hasChildren: true,
      childOrgCount: getChildren(org.id, orgOptions).length,
      peopleCount: countPeopleAtOrBelow(org.id, orgOptions),
    })
  })

  const ancestorChain = chain
  const ancestorIdChain = idChain
  const selectedDepth = ancestors.length

  const allChildOrgs = getChildren(selected.id, orgOptions)
  // V1 MVP and V3 are organizations-only views, so people never enter the tree.
  const people = showPeople ? getPeopleIn(selected.id) : []
  // `isOpen` is decided by the full list, not the paged slice, so a node with
  // children always reads as open even on a page that shows none of them.
  const isOpen = allChildOrgs.length > 0 || people.length > 0

  // The whole sibling group in its own order, with the selected organization
  // sitting wherever it actually sits. Hoisting it to the top of the group would
  // make a click reorder the rows around it — you click the third of four pods
  // and it jumps to first, which reads as the list rearranging itself rather
  // than as one row being selected. The tree holds still; only the selection bar
  // and the row tint move.
  const allSiblings = selected.parentId
    ? getChildren(selected.parentId, orgOptions)
    : [selected]

  /* Which group the pager drives. The children and the sibling group are the same
     list from either side of a drill-in, so only one can be over a page long, and
     paging whichever it is keeps the control in place as you move between them.
     Sibling paging is windowed around the selected row rather than from index 0 —
     see keepSelectedVisible — because the alternative is a page-one reader looking
     for a selected row that is on page two. */
  const pagesOver = (list) => list.length > CHILDREN_PER_PAGE
  const pagedGroup = pagesOver(allChildOrgs)
    ? 'children'
    : pagesOver(allSiblings)
      ? 'siblings'
      : 'none'
  const pagedTotal =
    pagedGroup === 'children'
      ? allChildOrgs.length
      : pagedGroup === 'siblings'
        ? allSiblings.length
        : 0
  const pageStart = (page - 1) * CHILDREN_PER_PAGE

  const childOrgs =
    pagedGroup === 'children'
      ? allChildOrgs.slice(pageStart, pageStart + CHILDREN_PER_PAGE)
      : allChildOrgs
  const siblingGroup =
    pagedGroup === 'siblings'
      ? allSiblings.slice(pageStart, pageStart + CHILDREN_PER_PAGE)
      : allSiblings

  const pagedShown = pagedGroup === 'children' ? childOrgs.length : siblingGroup.length

  const lastSiblingId = allSiblings[allSiblings.length - 1]?.id
  const lastChildId = allChildOrgs[allChildOrgs.length - 1]?.id

  siblingGroup.forEach((org) => {
    /* `isLast` decides whether this row closes its parent's vertical guide with an
       elbow, and that has to be judged against the *full* group, not the page. On
       a first page of 100 out of 150 the hundredth row is not the last child, so
       the line has to carry on past it — otherwise the rail closes mid-list and
       the tree looks like it ends there. */
    const isLast = org.id === lastSiblingId
    const isSelected = org.id === selected.id
    const chainHere = [...ancestorChain, isLast]
    const idChainHere = [...ancestorIdChain, org.id]

    rows.push({
      key: `org-${org.id}`,
      kind: 'org',
      node: org,
      depth: selectedDepth,
      isLast,
      ancestorIsLast: chainHere,
      ancestorIds: idChainHere,
      // Only the selected organization is opened out; its siblings keep their
      // subtrees folded away until they're clicked in turn.
      isOpen: isSelected && isOpen,
      hasChildren: hasChildren(org.id),
      childOrgCount: getChildren(org.id, orgOptions).length,
      peopleCount: countPeopleAtOrBelow(org.id, orgOptions),
    })

    if (!isSelected) return

    // Direct children, nested under the selected organization. Each is a leaf
    // *here* — whatever hangs below it stays out of the view until it is clicked.
    childOrgs.forEach((child) => {
      const isLastChild = child.id === lastChildId && people.length === 0

      rows.push({
        key: `org-${child.id}`,
        kind: 'org',
        node: child,
        depth: selectedDepth + 1,
        isLast: isLastChild,
        ancestorIsLast: [...chainHere, isLastChild],
        ancestorIds: [...idChainHere, child.id],
        isOpen: false,
        hasChildren: hasChildren(child.id),
        childOrgCount: getChildren(child.id, orgOptions).length,
        peopleCount: countPeopleAtOrBelow(child.id, orgOptions),
      })
    })

    // People sit directly under the organization they belong to, always after
    // the child organizations, so only they can close the subtree.
    people.forEach((person, personIndex) => {
      const isLastPerson = personIndex === people.length - 1
      rows.push({
        key: `person-${person.id}-${selected.id}`,
        kind: 'person',
        node: person,
        depth: selectedDepth + 1,
        isLast: isLastPerson,
        ancestorIsLast: [...chainHere, isLastPerson],
        ancestorIds: [...idChainHere, person.id],
        isOpen: false,
        hasChildren: false,
      })
    })
  })

  return {
    rows,
    pagedTotal,
    pagedGroup,
    // 1-indexed and inclusive, for "Showing 101–150 of 150". Zero when nothing is
    // paged, so the caption can be left off entirely.
    pagedFrom: pagedTotal > 0 && pagedShown > 0 ? pageStart + 1 : 0,
    pagedTo: pagedTotal > 0 ? pageStart + pagedShown : 0,
  }
}

/* V3.5's builder, and the reason it is a separate function rather than a flag on
   buildFocusedRows.
 *
 * buildFocusedRows derives the *shape* of the tree from `selectedId` — the rows it
 * emits are that node's ancestors, children and siblings. That makes selection and
 * structure the same thing, so selecting anything necessarily rebuilds the tree
 * around it and discards whatever was open. That is correct for V1–V4, where a click
 * is a navigation, and wrong for V3.5, where a click must leave the tree alone.
 *
 * So this builder takes its shape from one thing only: `expandedIds`, what the reader
 * has opened. It renders the whole tree from the root down, following expansion and
 * stopping wherever a node is closed. `selectedId` is used for exactly two things
 * here — finding which tree to root at, and being handed back to the component to
 * highlight one row. Nothing about the row set depends on it.
 *
 * The consequences are the point of the version:
 *
 *   - Clicking a name changes the page title and the highlight. No row appears or
 *     disappears, so the chevrons you were working with are still there.
 *   - Every organization with children gets a working control, including the
 *     selected one and its ancestors. There is no `isStructural` here: no row's
 *     children are on screen because of where the page is centred, because the page
 *     being centred somewhere no longer shapes this tree.
 *   - The reader can collapse an ancestor of the selected row and hide it. That's
 *     an explicit act with an obvious undo, which is how a file tree behaves.
 *
 * Not paged. V3.5 runs on the hand-written tree, whose widest node has four
 * children; combining in-place expansion with V4's 150 would put two variables in
 * one comparison. Row geometry is identical to buildFocusedRows' — same fields, same
 * meanings — so TreeGutter and the row renderer are shared.
 */
const buildExpandableRows = (
  selectedId,
  showPeople,
  expandedIds,
  loadingIds,
  /* V3.75: the wider roster, a cap on how many children any one node shows, an
     explicit root, and a page window.
     - `rowCap: null` means no cap, which is V3.5 and also V3.75's own full-page view.
     - `rootId` starts the tree at a given organization instead of at the top of the
       hierarchy. That is what makes the View all page a page *of that department*
       rather than the whole tree scrolled to it.
     - `page` windows the **root's** children, CHILDREN_PER_PAGE at a time. Only the
       root's, because the root is what the page is about: its children are a list,
       and a list is the only thing a pager can honestly walk. Windowing a nested
       node would slice a shape rather than a list — the window could open mid-subtree
       and the rows either side of it wouldn't be siblings. Paging is therefore
       mutually exclusive with a rowCap, and only the uncapped rooted page uses it. */
  { wide = false, rowCap = null, rootId = null, page = null } = {},
) => {
  const rows = []
  const nothing = { rows, pagedTotal: 0, pagedGroup: 'none', pagedFrom: 0, pagedTo: 0 }
  const orgOptions = wide ? { atScale: true, wide: true } : undefined

  // Root of the tree the selected organization belongs to, so the view always
  // contains it even though it no longer revolves around it.
  const root = rootId ? getOrganization(rootId) : getPath(selectedId)[0]
  if (!root) return nothing

  const hasChildren = (orgId) =>
    getChildren(orgId, orgOptions).length > 0 || (showPeople && getPeopleIn(orgId).length > 0)

  /* The root's child list, and the window onto it. Computed up front rather than
     inside pushNode because the caption needs the totals whether or not the root
     happens to be open. */
  const rootChildren = getChildren(root.id, orgOptions)
  const isPaged = page !== null && rootChildren.length > CHILDREN_PER_PAGE
  const pageStart = isPaged ? (page - 1) * CHILDREN_PER_PAGE : 0
  const pagedTotal = isPaged ? rootChildren.length : 0
  let pagedShown = 0

  const pushNode = (org, depth, chain, idChain) => {
    const isOpen = expandedIds.has(org.id) && hasChildren(org.id)

    rows.push({
      key: `org-${org.id}`,
      kind: 'org',
      node: org,
      depth,
      isLast: chain[depth],
      ancestorIsLast: chain,
      ancestorIds: idChain,
      isOpen,
      hasChildren: hasChildren(org.id),
      childOrgCount: getChildren(org.id, orgOptions).length,
      peopleCount: countPeopleAtOrBelow(org.id, orgOptions),
    })

    if (!isOpen) return

    const allChildren = getChildren(org.id, orgOptions)
    const peopleHere = showPeople ? getPeopleIn(org.id) : []

    /* V3.75's cap. Past WIDE_ROW_CAP children the tree stops and offers a way out
       instead of continuing — see the constant. People are not capped: they only
       exist in V2 and V4, neither of which uses this builder, so a cap here would be
       untested code standing in for a decision nobody has made. */
    const isCapped = rowCap !== null && allChildren.length > rowCap
    /* The page window, on the root's children only — see the `page` option. A node
       is never both capped and paged: the cap belongs to the tree in the profile tab
       and the pager to the full page, which is the version of this list with the cap
       lifted. */
    const isPagedHere = isPaged && org.id === root.id
    const children = isCapped
      ? allChildren.slice(0, rowCap)
      : isPagedHere
        ? allChildren.slice(pageStart, pageStart + CHILDREN_PER_PAGE)
        : allChildren
    const hiddenCount = isCapped ? allChildren.length - children.length : 0
    if (isPagedHere) pagedShown = children.length

    // Standing in for the fetch a real hierarchy would need — see
    // SKELETON_THRESHOLD. The subtree below is withheld until the mark clears.
    if (loadingIds.has(org.id)) {
      const placeholders = Math.min(children.length + peopleHere.length, SKELETON_ROW_LIMIT)
      for (let index = 0; index < placeholders; index += 1) {
        const isLastPlaceholder = index === placeholders - 1
        rows.push({
          key: `skeleton-${org.id}-${index}`,
          kind: 'skeleton',
          width: SKELETON_WIDTHS[index % SKELETON_WIDTHS.length],
          depth: depth + 1,
          isLast: isLastPlaceholder,
          ancestorIsLast: [...chain, isLastPlaceholder],
          ancestorIds: [...idChain, `skeleton-${index}`],
          isOpen: false,
          hasChildren: false,
        })
      }
      return
    }

    const lastChildId = allChildren[allChildren.length - 1]?.id

    children.forEach((child) => {
      /* People are pushed after the child organizations, so a child can only close
         the rail if there are none — and neither can it when a View all row follows
         it, since that row is then the last thing under this node and the guide line
         has to reach it.
         Judged against `allChildren`, not the page: on page one of a paged root the
         hundredth row is not the last child, so the rail has to carry on past it or
         the tree looks like it ends mid-list. */
      const isLastHere =
        child.id === lastChildId && peopleHere.length === 0 && !isCapped
      pushNode(child, depth + 1, [...chain, isLastHere], [...idChain, child.id])
    })

    peopleHere.forEach((person, personIndex) => {
      const isLastPerson = personIndex === peopleHere.length - 1 && !isCapped
      rows.push({
        key: `person-${person.id}-${org.id}`,
        kind: 'person',
        node: person,
        depth: depth + 1,
        isLast: isLastPerson,
        ancestorIsLast: [...chain, isLastPerson],
        ancestorIds: [...idChain, person.id],
        isOpen: false,
        hasChildren: false,
      })
    })

    /* The escape hatch, as the last row under a capped node. A row rather than a
       control bolted to the parent, because it belongs at the bottom of the list it
       ends — that's where a reader who has scrolled the 50 actually is. It sits at
       the children's depth and closes the rail, so it reads as part of the list
       rather than as chrome floating beside it. */
    if (isCapped) {
      rows.push({
        key: `view-all-${org.id}`,
        kind: 'viewAll',
        node: org,
        hiddenCount,
        totalCount: allChildren.length,
        depth: depth + 1,
        isLast: true,
        ancestorIsLast: [...chain, true],
        ancestorIds: [...idChain, `view-all-${org.id}`],
        isOpen: false,
        hasChildren: false,
      })
    }
  }

  // The root has no rail of its own — TreeGutter draws nothing at depth 0 — so the
  // leading `true` is only there to keep `chain` indexed by depth.
  pushNode(root, 0, [true], [root.id])

  return {
    rows,
    pagedTotal,
    // Always the root here, unlike buildFocusedRows where the paged list can belong
    // to the selected node's parent.
    pagedGroup: pagedTotal > 0 ? 'children' : 'none',
    pagedFrom: pagedTotal > 0 && pagedShown > 0 ? pageStart + 1 : 0,
    pagedTo: pagedTotal > 0 ? pageStart + pagedShown : 0,
  }
}

const TreeGutter = ({ row }) => {
  if (row.depth === 0) return null

  return (
    <>
      {Array.from({ length: row.depth }, (_, level) => {
        const isElbowLevel = level === row.depth - 1

        if (isElbowLevel) {
          return (
            <Rail key={level}>
              <RailVertical $stopAtMiddle={row.isLast} />
              <RailArm />
            </Rail>
          )
        }

        // A pass-through vertical. Rail `level` carries the line descending
        // from the ancestor at that depth, and it should only continue past
        // this row if that ancestor still has children after the subtree we're
        // inside — i.e. if our ancestor one level deeper is not its last child.
        return (
          <Rail key={level}>
            {!row.ancestorIsLast[level + 1] && <RailVertical />}
          </Rail>
        )
      })}
    </>
  )
}

/* Ancestors of `orgId` plus itself, as ids. V3.5 seeds its expansion with this so
   the tree opens down to the organization the tab is on, and re-opens down to a
   newly selected one that a collapse had hidden.

   Inclusive of `orgId` deliberately: selecting an organization also opens it, so a
   click reveals what's inside the thing you just selected — which is what every
   other version does when it re-centres. Note this only ever *adds* rows, so it
   can't take the tree away from under the reader. */
const pathIds = (orgId) => getPath(orgId).map((org) => org.id)

/* Centred on `selectedId` — the organization whose profile this tab is on.
   Clicking another organization re-centres the whole page, so selection lives
   above this component rather than being tracked here. */
export default function OrganizationHierarchyTab({
  selectedId,
  onSelectOrganization,
  version = 'v1',
  // V3.75 only: opens an organization as its own Support tab. Absent elsewhere, and
  // the View all row is only rendered when it's present.
  onOpenInNewTab,
  /* V3.75's full-page department view (see DepartmentPage). Roots the tree at one
     organization and lifts the row cap, which is the whole difference between the
     capped tree and the page a View all opens. Everything else — geometry, chevrons,
     skeletons, selection — is the same component, so the two can't drift apart. */
  rootId = null,
  uncapped = false,
  hideSearch = false,
}) {
  // V4 is V2's treatment against an organization with a hundred child
  // departments — same columns, same people rows, one organization's child list
  // swapped for a full-sized one. It hangs off Bramblewick, the node the prototype
  // opens on, so the at-scale case is what V4 shows first rather than something to
  // drill for. The long scroll it produces is the point: centring the view bounds
  // how deep the tree goes, not how wide one level of it is, so this is the case
  // the focused view does not answer.
  const atScale = version === 'v4'
  /* The People column: a count of everyone at or below each row. V1 MVP and V3
     drop it along with their people rows; V2 and V4 keep it. */
  const showPeople = version === 'v2' || atScale
  /* People *rows* are V2's alone. V4 replaced its end users with departments — its
     subject is how wide one level of the hierarchy can get — so it has no people in
     the tree, but it keeps the column, because "150 child orgs" says nothing about
     which of them anyone can actually reach. */
  const showPeopleRows = showPeople && !atScale
  /* V3.5 Expandable: V3's treatment, with the chevron split off from the name.
     Clicking a name still re-centres the page on that organization; clicking the
     chevron opens that organization's children *in place* and leaves the page
     where it is. The two things a chevron could mean — "go here" and "show me
     what's in here" — are one action in V1–V4, so the only way to see inside a
     node is to make it the subject. This version separates them, which is what
     lets a reader compare two branches without leaving the row they're on. */
  /* V3.75: V3.5's expansion against V4's breadth — 175 departments under
     Bramblewick instead of three. Where V4 puts the whole list in the tree and pages
     it, V3.75 caps any one list at WIDE_ROW_CAP rows and offers a *View all* that
     opens that department as its own Support tab. The two are the two available
     answers to "this node has 175 children", which is why they're separate versions
     rather than one with a toggle. */
  const isWide = version === 'v3-75'
  const isExpandable = version === 'v3-5' || isWide
  // V3 Sans lines: no row dividers, and the child count moves out of its own
  // column into a parenthetical beside each organization's name. V3.5 inherits
  // both, so the expansion behaviour is the only thing that differs between them.
  const isSansLines = version === 'v3' || isExpandable
  // V4 marks nodes with dots instead of chevrons.
  const isDotted = atScale

  /* The data options every selector in this component passes. One object rather than
     `{ atScale }` repeated at five call sites, because V3.75 added a second flag and
     the failure mode of missing one is a count that disagrees with the rows. */
  const dataOptions = useMemo(() => ({ atScale: atScale || isWide, wide: isWide }), [atScale, isWide])

  // Which page of the paged organization group is on screen.
  const [page, setPage] = useState(1)

  /* Paging from the bottom of a hundred rows leaves the reader at the bottom of the
     next hundred, looking at its last rows with no idea they've arrived at the start of
     something. The click is at the foot of the page because that's where the pager is,
     not because that's where they want to be. So the page goes back to the top and the
     new list starts at its first row.

     The scroller is found by walking up from this component rather than held as a ref on
     one of its own elements: the whole work area scrolls now, and that element belongs to
     the page around this one — the profile's MainSection on one route, the department
     page's on the other. Walking up finds whichever is there instead of either component
     having to pass a ref down to the other. */
  const rootRef = useRef(null)
  const goToPage = (next) => {
    setPage(next)
    let el = rootRef.current?.parentElement
    while (el) {
      if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)) {
        el.scrollTo({ top: 0 })
        return
      }
      el = el.parentElement
    }
  }

  /* Organizations the reader has opened. V3.5 only — it is what shapes that
     version's tree, and it is ignored entirely by the others.

     Seeded with the path down to the organization the tab opens on, so V3.5's first
     paint shows the same thing the other versions do: the selected row in context,
     already reachable, rather than a single collapsed root the reader has to dig
     through to find where they are. */
  const [expandedIds, setExpandedIds] = useState(() =>
    // On the full-page department view the subject is the root, and its children are
    // the entire point of the page, so it opens expanded rather than seeded with a
    // path that would be one collapsed row.
    new Set(rootId ? [rootId] : pathIds(selectedId)),
  )

  /* Nodes whose children are being "fetched" — see SKELETON_THRESHOLD. An id lives
     here for SKELETON_DURATION_MS after the node is opened, and only if its child
     list is long enough to be worth waiting for. */
  const [loadingIds, setLoadingIds] = useState(() => new Set())

  const removeLoading = (orgId) =>
    setLoadingIds((current) => {
      if (!current.has(orgId)) return current
      const next = new Set(current)
      next.delete(orgId)
      return next
    })

  const toggleExpanded = (orgId) => {
    const isOpening = !expandedIds.has(orgId)

    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(orgId)) next.delete(orgId)
      else next.add(orgId)
      return next
    })

    if (!isOpening) {
      // Collapsing mid-load: drop the loading mark with it, or reopening the node
      // would find a timer already spent and show skeletons that never resolve.
      removeLoading(orgId)
      return
    }

    const childCount =
      getChildren(orgId, dataOptions).length + (showPeopleRows ? getPeopleIn(orgId).length : 0)
    if (childCount <= SKELETON_THRESHOLD) return

    setLoadingIds((current) => new Set(current).add(orgId))
  }

  /* Clears the loading marks a beat after they're set. One timer per open rather
     than one shared timeout, so expanding a second node while the first is still
     loading doesn't cut the first one short — each row resolves on its own clock,
     which is also how a real per-subtree fetch would behave.

     Keyed on the id set, so the timers are re-established only when something is
     actually loading, and cleared on unmount or a version switch. */
  useEffect(() => {
    if (loadingIds.size === 0) return undefined

    const timers = [...loadingIds].map((orgId) =>
      window.setTimeout(() => removeLoading(orgId), SKELETON_DURATION_MS),
    )
    return () => timers.forEach(window.clearTimeout)
  }, [loadingIds])

  /* Switching versions resets the tree to the path down to the selected row, which
     is V3.5's opening state rather than a blank one. Carrying an arbitrary set of
     expansions into V4 would land them on rows whose chevrons are dots and whose
     lists are paged — a different treatment reading as a bug rather than as a
     comparison — and coming back into V3.5 with everything shut would make the
     switch look like it had lost the reader's place.
     eslint-disable-next-line react-hooks/exhaustive-deps — deliberately not keyed on
     selectedId: a selection must not disturb what's open. That case is handled
     below, additively. */
  useEffect(() => {
    setExpandedIds(new Set(rootId ? [rootId] : pathIds(selectedId)))
    setLoadingIds(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, rootId])

  /* Selecting a row must never close anything — that was the bug this version had:
     clicking a department rebuilt the tree around it and everything else vanished.
     So this only ever *adds*, and only the path down to the newly selected row, for
     the one case where it would otherwise be invisible: the reader collapsed an
     ancestor, then reached that row from somewhere else (a comment pin restoring its
     view, say). If the row is already on screen this is a no-op — the identity check
     matters, because returning a new Set every time would rebuild the rows on every
     render. */
  useEffect(() => {
    // Not on the rooted page: the path to the selected organization runs *above* that
    // page's root, so seeding it would pull ancestors the page deliberately excludes.
    if (!isExpandable || rootId) return
    setExpandedIds((current) => {
      const missing = pathIds(selectedId).filter((id) => !current.has(id))
      if (missing.length === 0) return current
      const next = new Set(current)
      missing.forEach((id) => next.add(id))
      return next
    })
  }, [selectedId, isExpandable, rootId])

  /* Which page the subject sits on when the *sibling group* is what's paged.
     Clicking the 120th of Bramblewick's departments makes it the selected node
     inside a 153-row sibling group, and page one holds rows 1–100 — so the row you
     just clicked would not be on screen. Opening on its page instead means the
     selection is always visible when the page loads. Returns 1 for every other
     case, which is what the reset below wants anyway. */
  const pageForSelected = (orgId) => {
    const parentId = getOrganization(orgId)?.parentId
    if (!parentId) return 1
    const siblings = getChildren(parentId, dataOptions)
    if (siblings.length <= CHILDREN_PER_PAGE) return 1
    const index = siblings.findIndex((org) => org.id === orgId)
    return index < 0 ? 1 : Math.floor(index / CHILDREN_PER_PAGE) + 1
  }

  /* Re-page whenever the subject changes. Usually back to page one: landing on
     page 3 of a department you just navigated to — because the last one happened
     to have that many — would look like rows had gone missing. The exception is
     the case above, where page one would hide the row that was just clicked.
     On the rooted page the paged list is the root's and doesn't change when a row is
     selected, so it stays where the reader left it — resetting to page one there
     would throw away their place for clicking a name. */
  useEffect(() => {
    if (rootId) return
    setPage(pageForSelected(selectedId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, version, rootId])

  // A different department opened in the tab starts at its own page one.
  useEffect(() => {
    if (rootId) setPage(1)
  }, [rootId])

  /* Two different trees, not one tree with a flag. V1–V4 take their shape from
     `selectedId`; V3.5 takes its shape from `expandedIds` and uses `selectedId` only
     to highlight a row. That is the whole difference between navigating and
     expanding, and it is why they are separate builders. */
  const { rows, pagedTotal, pagedGroup, pagedFrom, pagedTo } = useMemo(
    () =>
      isExpandable
        ? buildExpandableRows(selectedId, showPeopleRows, expandedIds, loadingIds, {
            wide: isWide,
            rowCap: isWide && !uncapped ? WIDE_ROW_CAP : null,
            rootId,
            // Paged only on the uncapped rooted page — that's the one showing a whole
            // long list, and the cap is the other answer to the same problem.
            page: uncapped && rootId ? page : null,
          })
        : buildFocusedRows(selectedId, showPeopleRows, atScale, page),
    [
      selectedId,
      showPeopleRows,
      atScale,
      page,
      isExpandable,
      isWide,
      expandedIds,
      loadingIds,
      rootId,
      uncapped,
    ],
  )

  const totalPages = Math.ceil(pagedTotal / CHILDREN_PER_PAGE)
  const isPaginated = totalPages > 1
  /* Where the "100 of 175 departments" caption goes. On the rooted department page it
     replaces the Organization column label at the top of the table; in V4's focused
     tree it stays above the pager at the bottom.
     The difference is what the caption is about. There the whole page is one list, so
     the count belongs at its head. In V4 the paged rows are one group among
     ancestors and siblings, and a header cell spanning the whole table would appear
     to count all of them. */
  const isRootedPageStatus = isPaginated && Boolean(rootId)

  /* The rooted page is for reading, not for navigating. Everywhere else a name is a
     link that re-centres the tree on it; here that would defeat the page, which exists
     to show one organization's whole list at once. Re-centring on a department would
     replace the list with that department's own, and — because the page shares its
     selection with the tab that opened it — quietly move the tab behind it too.

     So names are plain foreground.default text and the chevron is the only control:
     it opens a subtree in place, which is the one thing that can happen here without
     the list underneath changing. */
  const isReadOnlyNames = Boolean(rootId)

  /* The count sits above the table on every version, and the `Organization` label
     stays in the header cell under it.

     It briefly didn't: for one round V3.75 moved the count *into* the cell and dropped
     the label, on the argument that the rows are plainly organizations and the count
     says the word already. What that lost is a table with a labelled column — the count
     is a caption about the list, and standing in for the label it had to be read as
     both. The two are now stacked in the order they're read: how much there is, then
     what the column holds. Closing the gap between them is what the spacing does. */

  // The counter still describes reach, not the rows on screen: the point of the
  // feature is how far access cascades below the selected organization, and that
  // is a number the focused view no longer shows in full.
  const reachOrgCount = useMemo(
    () => 1 + getDescendantIds(selectedId, dataOptions).length,
    [selectedId, dataOptions],
  )
  const peopleReach = useMemo(
    () => (showPeople ? countPeopleAtOrBelow(selectedId, dataOptions) : 0),
    [selectedId, showPeople, dataOptions],
  )

  // Drill-in. Every organization in the view is a link to its own context; the
  // page re-centres and the row set is rebuilt from that node's perspective.
  const select = (orgId) => {
    if (orgId !== selectedId) onSelectOrganization?.(orgId)
  }

  const orgLabel = reachOrgCount === 1 ? 'organization' : 'organizations'
  const peopleLabel = peopleReach === 1 ? 'person' : 'people'
  // Named in the pager's caption and its accessible label, so a reader arriving at
  // the control knows whose list it walks. When the *siblings* are what's paged
  // the list belongs to the parent, not to the selected node — captioning it with
  // the selected department would name a node that holds none of these rows.
  const pagedOwnerId =
    pagedGroup === 'siblings'
      ? getOrganization(selectedId)?.parentId
      : // On the rooted page the paged list is the root's, and the root is not
        // necessarily the selected row — a reader can click a child and stay here.
        (rootId ?? selectedId)
  const pagedOwnerName = getOrganization(pagedOwnerId)?.name

  // data-comment-root marks the subtree comment pins may anchor inside. The
  // global nav and the comment layer itself sit outside it deliberately: the nav
  // is chrome rather than design under review, and a pin able to attach to the
  // comment layer could anchor to another pin.
  return (
    <Wrapper ref={rootRef} data-comment-root="true" $flush={hideSearch}>
      {/* No Hint — the label carries the explanation, and a hint line here
          pushed the counts and the table down for no added meaning. */}
      {!hideSearch && (
        <SearchField>
          {/* Follows the rows, not the column: V4 shows a People count but no people,
              so offering to search users would promise something its tree can't
              show. */}
          <SearchLabel>
            {showPeopleRows ? 'Search organizations and users' : 'Search organizations'}
          </SearchLabel>
          <MediaInput start={<SearchIcon />} />
        </SearchField>
      )}

      {/* Above the table on every version. On the rooted page it counts the window —
          `100 of 175 departments` — and everywhere else it counts the reach. Both are
          captions about the list below, which is why they share the slot; what differs
          is only which number the view can honestly claim. */}
      <Counts>
        {isRootedPageStatus ? (
          `${pagedTo - pagedFrom + 1} of ${pagedTotal} departments`
        ) : (
          <>
            {reachOrgCount} {orgLabel}
            {showPeople && ` · ${peopleReach} ${peopleLabel}`}
          </>
        )}
      </Counts>

      <TreeTable isReadOnly>
        <HiddenCaption>
          {rootId
            ? `${getOrganization(rootId)?.name} and every organization below it`
            : 'Hierarchy around the selected organization: its ancestors, direct children, and direct siblings'}
        </HiddenCaption>
        <Head>
          <HeaderRow>
            {/* The column label, on every version including the rooted page. The count
                above it is a caption about the list; this names what the column holds.
                For one round the count stood here in its place and the label went, on
                the argument that rows this obvious don't need naming — but a caption in
                a header cell is read as a heading, and the two say different things. */}
            <HeaderCell>Organization</HeaderCell>
            {/* No Organization type column. It carried Company / Cost Center /
                Supervisory for organizations and Agent / End user for people —
                two different things in one column, and the 22% it took came out
                of the Organization column, which is the one that has to absorb
                ten levels of indent. Note what went with it: Agent vs End user
                is no longer stated anywhere in the tree. */}
            {!isSansLines && <HeaderCell width="12%">Child orgs</HeaderCell>}
            {showPeople && <HeaderCell width="10%">People</HeaderCell>}
          </HeaderRow>
        </Head>
        <Body>
          {rows.map((row) => {
            /* A placeholder standing in for a row still loading. It takes the same
               gutter and the same height as a real row, so the tree's guide lines
               run through the loading block unbroken and nothing shifts when the
               names arrive. */
            if (row.kind === 'skeleton') {
              return (
                <TreeRow
                  key={row.key}
                  $ruleInset={ruleInsetFor(row.depth)}
                  $noRule={isSansLines}
                >
                  <NameCell>
                    <RowInner>
                      <TreeGutter row={row} />
                      <LeafArmContinuation aria-hidden="true" />
                      <SkeletonName>
                        <SkeletonBar width={row.width} />
                      </SkeletonName>
                    </RowInner>
                  </NameCell>
                  {!isSansLines && <Cell />}
                  {showPeople && <Cell />}
                </TreeRow>
              )
            }

            /* V3.75's escape hatch, in the row after the capped list. A text button
               plus the count it's hiding — the count is what makes the cap legible,
               since 50 rows of departments give no clue how many more there are. */
            if (row.kind === 'viewAll') {
              return (
                <TreeRow key={row.key} $ruleInset={ruleInsetFor(row.depth)} $noRule={isSansLines}>
                  <NameCell>
                    <RowInner>
                      <TreeGutter row={row} />
                      <LeafArmContinuation aria-hidden="true" />
                      <ViewAllArea>
                        <ViewAllButton
                          onClick={(event) => {
                            event.preventDefault()
                            onOpenInNewTab?.(row.node.id)
                          }}
                        >
                          View all {row.totalCount} in {row.node.name}
                        </ViewAllButton>
                        <RemainderNote>
                          {row.hiddenCount} more not shown
                        </RemainderNote>
                      </ViewAllArea>
                    </RowInner>
                  </NameCell>
                  {!isSansLines && <Cell />}
                  {showPeople && <Cell />}
                </TreeRow>
              )
            }

            const isPerson = row.kind === 'person'
            const isCurrent = !isPerson && row.node.id === selectedId
            /* V3.5: the chevron expands in place instead of drilling in, on every
               organization that has children — including the selected one and its
               ancestors. There is no inert marker in this version: no row's children
               are on screen because of where the page is centred, so there is none
               whose control would be a lie. */
            const isExpandControl = isExpandable && row.hasChildren
            /* On the rooted page the chevron is a small target for the only thing the
               row does, so the row carries it too — click anywhere on a department to
               open or close it. Only where names aren't links: elsewhere a row-wide
               handler would compete with the link inside it, and a click landing on
               the padding beside a name would do something different from the name. */
            const isRowToggle = isReadOnlyNames && isExpandControl

            return (
              <TreeRow
                key={row.key}
                $ruleInset={ruleInsetFor(row.depth)}
                $noRule={isSansLines}
                $selected={isCurrent}
                $clickable={isRowToggle}
                onClick={isRowToggle ? () => toggleExpanded(row.node.id) : undefined}
              >
                <NameCell>
                  <RowInner>
                    {row.isOpen && <ParentDescender $depth={row.depth} aria-hidden="true" />}
                    <TreeGutter row={row} />

                    {/* Three states, no expand/collapse: a marker on the rows
                        whose children are already in view (the path and the
                        selected node), a clickable marker on rows with a subtree
                        the focused view is holding back, and the plain arm on true
                        leaves.

                        V4 swaps the chevron for a dot — filled where children are
                        on screen, a ring where a subtree is still folded away.
                        Everything else about the slot is unchanged, so the two
                        treatments are comparable. */}
                    {isExpandControl ? (
                      /* V3.5's two-part row: this control opens and closes the
                         subtree in place and never moves the page. The name beside
                         it is still the way in. Both remain — the point of the
                         version is having the choice, not replacing one with the
                         other. */
                      <ChevronButton
                        type="button"
                        onClick={(event) => {
                          /* Where the row toggles too, a chevron click would bubble up
                             to it and toggle a second time, netting no change at all. */
                          event.stopPropagation()
                          toggleExpanded(row.node.id)
                        }}
                        aria-expanded={row.isOpen}
                        aria-label={
                          row.isOpen
                            ? `Collapse ${row.node.name}`
                            : `Expand ${row.node.name}`
                        }
                      >
                        <Chevron direction={row.isOpen ? 'down' : 'right'} />
                      </ChevronButton>
                    ) : row.isOpen ? (
                      <ChevronSlot aria-hidden="true">
                        {isDotted ? <Dot $filled /> : <Chevron direction="down" />}
                      </ChevronSlot>
                    ) : row.hasChildren ? (
                      <ChevronButton
                        type="button"
                        onClick={() => select(row.node.id)}
                        aria-label={`Show the hierarchy around ${row.node.name}`}
                      >
                        {isDotted ? <Dot /> : <Chevron direction="right" />}
                      </ChevronButton>
                    ) : (
                      <LeafArmContinuation aria-hidden="true" />
                    )}

                    <NameArea>
                      {isPerson || isCurrent || isReadOnlyNames ? (
                        /* The centre of the view is not a link to itself — and on the
                           rooted page nothing is, since there is nowhere for a name to
                           go that wouldn't undo what the page is for. */
                        <NodeName $current={isCurrent} title={row.node.name}>
                          {row.node.name}
                        </NodeName>
                      ) : (
                        <NameLink
                          href="#"
                          onClick={(event) => {
                            event.preventDefault()
                            select(row.node.id)
                          }}
                          title={row.node.name}
                        >
                          {row.node.name}
                        </NameLink>
                      )}
                      {isSansLines && !isPerson && row.childOrgCount > 0 && (
                        <ChildCount>({row.childOrgCount})</ChildCount>
                      )}
                      {/* No `current` tag. The bar and the tint say which row this
                          is, and a third marker repeating it was the most
                          redundant of the three. */}
                      {isPerson && row.node.title && (
                        <PersonTitle>{row.node.title}</PersonTitle>
                      )}
                    </NameArea>
                  </RowInner>
                </NameCell>
                {!isSansLines && (
                  <Cell>
                    {isPerson ? (
                      <Muted>—</Muted>
                    ) : (
                      `${row.childOrgCount} child ${row.childOrgCount === 1 ? 'org' : 'orgs'}`
                    )}
                  </Cell>
                )}
                {showPeople && <Cell>{isPerson ? <Muted>—</Muted> : row.peopleCount}</Cell>}
              </TreeRow>
            )
          })}
        </Body>
      </TreeTable>

      {/* Only appears once a list of child organizations runs past one page, which
          today only V4's does. V1–V3 end at the table, unchanged. */}
      {isPaginated && (
        <>
          {/* Stated once. On the rooted page it's already in the header cell above
              the list, so repeating it here would put the same numbers at both ends
              of the same page. */}
          {!isRootedPageStatus && (
            <PageStatus>
              Showing organizations {pagedFrom}–{pagedTo} of {pagedTotal} in {pagedOwnerName}
            </PageStatus>
          )}
          <PaginationRow>
            <OffsetPagination
              currentPage={page}
              totalPages={totalPages}
              onChange={goToPage}
              aria-label={`Pages of organizations in ${pagedOwnerName}`}
            />
          </PaginationRow>
        </>
      )}
    </Wrapper>
  )
}
