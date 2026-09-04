import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  ORGANIZATIONS,
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
/* A row's height. Garden pins its medium table rows at 40px (theme.space.base
   * 10), so this has to be 40 too: anything less and RowInner comes up short of
   the cell it's in, which opens a visible gap in the tree's vertical guide
   lines at every row boundary. Shared by RowInner and V2's skeleton rows, which
   have to match it exactly — a placeholder taller than the row it stands in for
   makes the list jump as each group of children resolves. */
const ROW_MIN_HEIGHT = 40

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

/* V2's expand loading state.
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
 * It has to stay low while V2 is in the set. V2 runs on the hand-written tree, which
 * tops out at four children (Model Training Pod) with most expandable nodes at
 * three — so a higher threshold could never fire there, and the loading state would be
 * invisible in the version built to test it. The constant is shared with V3, which
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

/* V3's cap. However many children a node has, expanding it in place shows at most
   this many, followed by a *View all* that opens the whole department as its own page
   in a new tab.
 *
 * 50 rather than V4's 100 because the two versions are asking opposite questions.
 * V4 puts the whole list in the tree and pages it, testing how much of a hierarchy
 * one level can hold. V3 assumes it can't hold it, and tests the other answer:
 * cap the tree at a readable depth and send the long list somewhere built for it. A
 * cap only means something if it bites well before the list ends — at 100 of 175
 * you're most of the way down anyway, and the escape hatch reads as a pager.
 *
 * Deliberately not the same idea as CHILDREN_PER_PAGE. That is a window onto a list
 * you walk through in place; this is a hard stop with a door next to it. Sharing one
 * constant would tie two versions' answers together. */
const WIDE_ROW_CAP = 50

/* The cap is also switchable, in the *Show 50 | 75 | 100 records* control beside the
   Organization header — V3 only, since it is the only version with a cap to move.
   50 leads because it's the number the version was cut at and the one the README
   argues for; 100 is the top of the range because it's V4's page size, which makes the
   two versions directly comparable at that setting: the same 100 rows, one ending in a
   *View all* and the other in a pager. 75 sits between them for the case where 50 feels
   short and 100 feels long.

   A control rather than an edit to the constant because "how many rows before the
   escape hatch" is the open question in this version, and it's a question you answer by
   looking at the three side by side, not by reading a number. */
const WIDE_ROW_CAP_OPTIONS = [50, 75, 100]

/* V3.75's scroll-triggered load. The indicator sits above the point in the list the
   reader has scrolled to, not the viewport edge — see ScrollLoadSentinel. It blinks
   for this long before the next batch lands, standing in for a fetch the same way
   SKELETON_DURATION_MS does elsewhere, just shorter: this is "more of a list you're
   already reading" rather than "a subtree that was closed a moment ago". Kept in
   step with ScrollLoadIndicator's own animation (700ms × 3 blinks) so the batch
   never lands mid-blink. */
const SCROLL_LOAD_BLINK_DURATION = 2100
/* 80px was the original reading distance; raised 100px further so the text clears
   the row it's about to add to rather than sitting right on top of it. */
const SCROLL_INDICATOR_OFFSET = 180

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


/* `$flush` drops the top padding for the rooted department page, whose
   own toolbar sits above this and owns the gap below the search field — otherwise the
   two stack and the table starts 48px down on first paint but 24px down once
   scrolled. */
/* A bounded column, not a free-flowing one: the search, count line and table header
   stay pinned and only the rows scroll (TableScroll below). On the rooted department
   page the wrapper's height is still content-driven — MainSection there scrolls the
   whole page, so TableScroll never becomes a scroller and nothing about that page's
   behavior changes. */
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${(props) => (props.$flush ? '0' : '24px')} 32px 0;
  flex: 1;
  min-height: 0;
`

/* The one moving part of the page. Everything above it — search, the count line,
   the table's own header row — is pinned; the rows scroll underneath that header,
   which is opaque so they slide behind it rather than through it. The bottom padding
   lives here rather than on the wrapper so it sits at the end of the scrolled
   content instead of shrinking the scroll region. */
const TableScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: ${(props) => (props.$flush ? '0' : '40px')};
`

/* Replaces the page heading. Fixed 450px rather than fluid — the tree beside it
   is already as wide as the table, and a full-width search reads as a filter on
   the page rather than on this one list.

   Overrides on Garden's MediaInput: it sizes to its font by default, so the
   height is pinned to 40px; and it aligns the icon and text on `baseline`, which
   leaves the magnifying glass sitting low in a taller-than-default input —
   `center` puts it on the vertical centre line. The figure margins below set
   the icon/text and text/navigator spacing. */
const SearchField = styled(Field)`
  width: 450px;
  /* 20px, with the count line below supplying its own 8px before the table. */
  margin-bottom: 20px;
  /* Anchors V1.5's typeahead menu to the field. */
  position: relative;

  [data-garden-id='forms.faux_input'] {
    align-items: center;
    box-sizing: border-box;
    height: 40px;
  }

  [data-garden-id='forms.input'] {
    height: 100%;
  }

  /* 12px between the magnifying glass and the query text. This has to target
     the bare svg: Garden's start figure clones its styling onto the icon
     element, but the inlined SearchIcon doesn't forward props, so the figure
     class never lands on it and the icon carries no margin of its own. */
  [data-garden-id='forms.faux_input'] > svg {
    margin-right: 12px;
    flex-shrink: 0;
  }

  /* The match navigator rides in the end figure, which Garden sizes as a fixed
     16px icon box with an 8px gap — auto size instead, and 16px of air between
     the query text and the counter. Its right edge then lands on the faux
     input's own 12px padding, the same inset the magnifying glass gets on the
     left. The selector only matches while a search is running — with no query
     there is no end figure at all. */
  [data-garden-id='forms.media_figure'] {
    width: auto;
    height: auto;
    margin: 0 0 0 16px;
  }
`

const SearchLabel = styled(Label)`
  font-size: 14px;
  font-weight: 600;
  color: #2f3130;
`

/* The label line. A wrapper of its own, not a bare Label, so the label and the
   faux input never become direct siblings — Garden gives an input that follows
   a label 8px of margin-top, on top of the 4px wanted here. */
const SearchLabelRow = styled.div`
  margin-bottom: 4px;
`

/* The match navigator ("1 of 2" with down/up chevrons), riding inside the
   field's end figure. Same size as the query text but regular weight and
   fg/default — it reports position, it isn't part of what was typed. */
const MatchNav = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  font-weight: 400;
  color: #2f3130;
  white-space: nowrap;
`

const MatchNavButton = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 2px;
  border: none;
  border-radius: 2px;
  background: transparent;
  color: #2f3130;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: #f7f7f7;
  }

  &:disabled {
    color: #c2c8cc;
    cursor: default;
  }

  &:focus-visible {
    outline: 2px solid #406cc4;
    outline-offset: 1px;
  }
`

/* V1.5's typeahead menu: the selected organization's matching children, listed
   under the input as the query is typed. Exactly ten rows tall at most — item
   height times ten, plus the menu's own padding — and scrolling past that: a
   window onto the list, per the review ask, not the whole list dropped down.
   onMouseDown is prevented at the menu (see the render) so choosing an option
   never blurs the input before the click lands. */
const SEARCH_MENU_ITEM_HEIGHT = 32

const SearchMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  box-sizing: border-box;
  max-height: ${SEARCH_MENU_ITEM_HEIGHT * 10 + 8}px;
  overflow-y: auto;
  padding: 4px 0;
  border: 1px solid #c2c8cc;
  border-radius: 8px;
  background-color: #ffffff;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.16);
`

const SearchMenuItem = styled.button`
  display: block;
  box-sizing: border-box;
  width: 100%;
  height: ${SEARCH_MENU_ITEM_HEIGHT}px;
  padding: 6px 12px;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 20px;
  color: #2f3130;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;

  &:hover {
    background-color: #f7f7f7;
  }
`

/* Flora's yellow.300 — the search highlight everywhere: the inline mark in the
   expandable versions and on the matched word in V1.5's hit row. */
const SEARCH_HIT_BG = '#eedf7a'

/* Text colour is inherited so a hit on the selected row's bold name stays bold
   and a hit on a link stays blue. */
const SearchMark = styled.mark`
  background-color: ${SEARCH_HIT_BG};
  color: inherit;
`

/* Splits a row's name around the first case-insensitive hit. Returns the plain
   string when there's no query or no hit, so unaffected rows render untouched. */
const NameText = ({ name, query }) => {
  const index = query ? name.toLowerCase().indexOf(query) : -1
  if (index < 0) return name
  return (
    <>
      {name.slice(0, index)}
      <SearchMark>{name.slice(index, index + query.length)}</SearchMark>
      {name.slice(index + query.length)}
    </>
  )
}

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

/* *Show 50 | 75 | 100 records*, at the right-hand end of the Organization header row.

   In the header cell rather than in a toolbar of its own because it's a property of this
   table's rows: it sets how many of them appear before the *View all*. Put above the
   table it would have read as a control on the page, which on the profile tab is a
   whole profile.

   Right-aligned in the cell so it sits at the far edge of the table, opposite the
   column label. In V3 there is no second column to collide with — the child count is
   inline beside each name — so the space is free. */
const ShowRecords = styled.span`
  float: right;
  font-weight: normal;
  color: #646864;
  white-space: nowrap;
`

/* The numbers. Anchors rather than buttons because they behave like the version
   switcher's options — pick one and the view changes — and Garden's Anchor is what the
   rest of this prototype uses for that.

   The current one is not a link: it's the state you're already in, so clicking it would
   do nothing, and leaving it blue invites the click. Bold and dark instead, which also
   makes the current setting readable at a glance from across a meeting room. */
const ShowOption = styled(Anchor)`
  font-size: 14px;
`

const ShowCurrent = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #2f3130;
`

/* The separators. Own element rather than characters in the markup so they can be
   greyed independently — at the same blue as the links they read as part of them. */
const ShowDivider = styled.span`
  color: #c2c8cc;
  padding: 0 6px;
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
  /* Sticky, with an opaque background: the header is the bar the rows scroll
     underneath, and without the fill the rows would show through it. White, not
     grey.100 — the header carries no tint of its own, just the stroke under it.
     The underline is redrawn as a box-shadow because Garden's own is a border on
     the tr, which stays behind at the natural position while the cells stick. */
  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: #ffffff;
    box-shadow: inset 0 -1px 0 0 #dcdcda;
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
   V2 drops it entirely: the only line left running across the page is the one
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

/* V2's replacement for the Child orgs column: the bare count in parentheses,
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

/* V3's *View all*, sitting where the 51st child would be. Takes the same gutter
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

/* fg/subtle at 14px: recedes next to the View more action but stays legible
   as the running count of what's still capped. */
const RemainderNote = styled(SM)`
  color: #646864;
  font-size: 14px;
  white-space: nowrap;
`

/* V3.75's cap row has no buttons — this is a 1px marker, not a piece of content.
   IntersectionObserver needs something to watch, and something at zero size would
   never intersect anything, so it's 1px rather than 0. Nothing about it is visible;
   RowInner's own min-height is what keeps the row's height and the rail's spacing
   the same as every version above it. */
const SentinelMarker = styled.div`
  width: 1px;
  height: 1px;
`

/* "Loading more", floating over the tree rather than inside it — it has to stay on
   screen at a fixed distance from where the reader stopped scrolling, and a row can't
   do that from inside a table that's still reflowing under it.
   Horizontally centred on the screen, not on the table: the table isn't full width in
   every layout (the properties rail on the rooted page narrows it), and centring on
   the screen is what makes the indicator read as "the page is doing something" rather
   than "this column is". `top` is set inline per instance — SCROLL_INDICATOR_OFFSET
   above wherever the sentinel row was found, not a fixed distance from the viewport
   edge, so it tracks the actual point the reader scrolled to.
   `#2f3130` at 50% white behind it — button/fg/default over a translucent white,
   not a solid chip: solid would read as an actual button sitting on the tree, and
   this fires on its own with nothing to click. The translucency is there so the
   text stays legible over whichever row happens to be under it without hiding that
   row's own content entirely.
   Blinks three times rather than spinning or filling a bar: the same on/off the
   Skeleton rows use elsewhere in this tree, kept to a family of one loading idiom
   instead of two — just slower, since a flash at Skeleton's own speed read as
   flickering rather than as loading. */
const ScrollLoadIndicator = styled.div`
  position: fixed;
  left: 50%;
  z-index: 20;
  transform: translateX(-50%);
  padding: 4px 12px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.5);
  color: #2f3130;
  font-size: 14pt;
  font-weight: 400;
  white-space: nowrap;
  pointer-events: none;
  animation: scrollLoadBlink 700ms ease-in-out 3;

  @keyframes scrollLoadBlink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.25;
    }
  }
`

/* Finds the nearest scrolling ancestor above `el`, the same walk goToPage uses to find
   where to reset scroll position after a page change. IntersectionObserver needs this
   as its `root`: the app's scroll container is a CSS `overflow-y: auto` div several
   layers up, not the window, so watching the viewport (the default root) would never
   see the sentinel cross a boundary that only exists inside that div. Returns null —
   meaning "use the viewport" — only if no such ancestor exists. */
const findScrollAncestor = (el) => {
  let node = el?.parentElement
  while (node) {
    if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
      return node
    }
    node = node.parentElement
  }
  return null
}

/* One of these renders in place of the button row for every capped node in V3.75.
   It has no visible content of its own — `onTrigger` fires once when the marker
   scrolls into view, which is the reader reaching the bottom of what's currently
   shown. Its own component rather than an effect in the tab itself because each
   capped node needs an independent observer: Bramblewick and Mathematics can each be
   mid-scroll at once, and one shared listener would have to rediscover which of them
   the reader was near instead of just being told. */
const ScrollLoadSentinel = ({ orgId, onTrigger }) => {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const root = findScrollAncestor(el)
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onTrigger(orgId, entry.boundingClientRect.top)
      },
      { root, threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [orgId, onTrigger])

  return <SentinelMarker ref={ref} aria-hidden="true" />
}

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
 *   - its direct children (and its direct people, when a version asks for them)
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
 * V2 does not use this builder. In-place expansion means the tree's shape has to
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
 * `cap` is V1.5's alternative to the pager, for the children group only (the list
 * the Show child orgs control names): a children list longer than `cap` ends at
 * `cap` rows plus a View more row, exactly as a capped node does in V3.5. The
 * sibling group keeps the pager either way — the control is titled about child
 * orgs, and the selected row has to stay in view in a way a capped-from-the-top
 * sibling list couldn't promise.
 *
 * `loading` swaps the whole row set for skeleton placeholders — V1.5's stand-in
 * for the fetch a re-centre would need. The placeholders follow the real
 * structure (one per ancestor, one for the selected node, then children) so the
 * guide lines land where the real rows will.
 *
 * Returns `{ rows, pagedTotal, pagedFrom, pagedTo }` so the caller can caption the
 * slice without recounting it. `pagedTotal` is 0 when nothing needed paging.
 */
const buildFocusedRows = (
  selectedId,
  showPeople = true,
  orgOptions = {},
  page = 1,
  { cap = null, loading = false } = {},
) => {
  const rows = []
  const empty = { rows, pagedTotal: 0, pagedFrom: 0, pagedTo: 0 }
  const path = getPath(selectedId)
  const selected = path[path.length - 1]
  if (!selected) return empty

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

  /* The loading stand-in: skeleton rows in the real rows' places — the ancestors
     already pushed above are the structure of the view and stay; everything from
     the selected row down is what the "fetch" would return, so that's what the
     placeholders cover. At least a few child placeholders even on a deep path, or
     the block would read as a list that ends at the selected row. */
  if (loading) {
    const selectedChain = [...ancestorChain, true]
    const selectedIdChain = [...ancestorIdChain, selected.id]
    rows.push({
      key: `skeleton-selected-${selected.id}`,
      kind: 'skeleton',
      width: SKELETON_WIDTHS[ancestors.length % SKELETON_WIDTHS.length],
      depth: selectedDepth,
      isLast: true,
      ancestorIsLast: selectedChain,
      ancestorIds: selectedIdChain,
      isOpen: false,
      hasChildren: false,
    })
    const childPlaceholders = Math.max(SKELETON_ROW_LIMIT - rows.length, 3)
    for (let index = 0; index < childPlaceholders; index += 1) {
      const isLastPlaceholder = index === childPlaceholders - 1
      rows.push({
        key: `skeleton-child-${selected.id}-${index}`,
        kind: 'skeleton',
        width: SKELETON_WIDTHS[(ancestors.length + 1 + index) % SKELETON_WIDTHS.length],
        depth: selectedDepth + 1,
        isLast: isLastPlaceholder,
        ancestorIsLast: [...selectedChain, isLastPlaceholder],
        ancestorIds: [...selectedIdChain, `skeleton-${index}`],
        isOpen: false,
        hasChildren: false,
      })
    }
    return { rows, pagedTotal: 0, pagedGroup: 'none', pagedFrom: 0, pagedTo: 0 }
  }

  const allChildOrgs = getChildren(selected.id, orgOptions)
  // V1 MVP and V2 are organizations-only views, so people never enter the tree.
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
  /* V1.5's cap takes precedence over the pager for the children group — the cap
     is that version's whole answer to a long child list. The sibling group keeps
     the pager either way. The gate is `cap !== null`, not `childCapped`: a search
     hit near the end of the list grows the cap past the last child's index, and
     then the list is owed to the reader whole — paging it at 100 would hide the
     very row the search just promised to show. */
  const childCapped = cap !== null && allChildOrgs.length > cap
  const pagesOver = (list) => list.length > CHILDREN_PER_PAGE
  const pagedGroup =
    cap !== null
      ? pagesOver(allSiblings)
        ? 'siblings'
        : 'none'
      : pagesOver(allChildOrgs)
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

  const childOrgs = childCapped
    ? allChildOrgs.slice(0, cap)
    : pagedGroup === 'children'
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
      /* When the list is capped the View more row follows it, and that row is
         what closes the rail — the last shown child must not draw an elbow. */
      const isLastChild = !childCapped && child.id === lastChildId && people.length === 0

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

    /* V1.5's escape hatch, as the last row under the selected organization — the
       same View more treatment a capped node gets in V3.5, borrowed outright so
       the two versions' caps read and behave identically. `shownCount` is the
       current visible count so the handler can increment from the right number. */
    if (childCapped) {
      rows.push({
        key: `view-more-${selected.id}`,
        kind: 'viewMore',
        node: selected,
        hiddenCount: allChildOrgs.length - childOrgs.length,
        shownCount: childOrgs.length,
        depth: selectedDepth + 1,
        isLast: true,
        ancestorIsLast: [...chainHere, true],
        ancestorIds: [...idChainHere, `view-more-${selected.id}`],
        isOpen: false,
        hasChildren: false,
      })
    }
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

/* V2's builder, and the reason it is a separate function rather than a flag on
   buildFocusedRows.
 *
 * buildFocusedRows derives the *shape* of the tree from `selectedId` — the rows it
 * emits are that node's ancestors, children and siblings. That makes selection and
 * structure the same thing, so selecting anything necessarily rebuilds the tree
 * around it and discards whatever was open. That is correct for V1 and V4, where a click
 * is a navigation, and wrong for V2, where a click must leave the tree alone.
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
 * Not paged. V2 runs on the hand-written tree, whose widest node has four
 * children; combining in-place expansion with V4's 150 would put two variables in
 * one comparison. Row geometry is identical to buildFocusedRows' — same fields, same
 * meanings — so TreeGutter and the row renderer are shared.
 */
const buildExpandableRows = (
  selectedId,
  showPeople,
  expandedIds,
  loadingIds,
  /* V3 / V3.5: the wider roster, a cap, an explicit root, and a page window.
     - `rowCap: null` means no cap (V2 and the uncapped rooted page).
     - `rootId` starts the tree at one organization — makes the View all page a page
       *of that department* rather than the whole tree scrolled to it.
     - `page` windows the root's children CHILDREN_PER_PAGE at a time. Root's only;
       mutually exclusive with rowCap (the cap is the profile-tab answer, the pager
       is the full-page answer).
     - `capOverrides` — Map<orgId, number | null>: per-org cap for V3.5. A number
       overrides rowCap for that org; null means show all. Orgs absent from the map
       use rowCap. Only consulted when `inlineExpand` is true.
     - `inlineExpand` — when true, capped nodes produce a `viewMore` row (View more +
       View all buttons, inline expansion) instead of a `viewAll` row (opens new tab). */
  { wide = false, rowCap = null, rootId = null, page = null, capOverrides = null, inlineExpand = false } = {},
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

    /* V3's cap. Past the effective cap the tree stops and offers a way out.
       V3.5 can override the cap per org via `capOverrides`: a number extends the
       default, null removes the cap entirely for that org. People are not capped. */
    const effectiveCap = capOverrides?.has(org.id)
      ? capOverrides.get(org.id)   // null = uncapped for this org
      : rowCap
    const isCapped = effectiveCap !== null && allChildren.length > effectiveCap
    /* The page window, on the root's children only — see the `page` option. A node
       is never both capped and paged: the cap belongs to the tree in the profile tab
       and the pager to the full page, which is the version of this list with the cap
       lifted. */
    const isPagedHere = isPaged && org.id === root.id
    const children = isCapped
      ? allChildren.slice(0, effectiveCap)
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
       rather than as chrome floating beside it.

       `inlineExpand` switches the kind to `viewMore`: two buttons (View more, View
       all) that expand in place rather than opening a new tab. `shownCount` is the
       current visible count so the handler can increment from the right number. */
    if (isCapped) {
      const kind = inlineExpand ? 'viewMore' : 'viewAll'
      rows.push({
        key: `${kind}-${org.id}`,
        kind,
        node: org,
        hiddenCount,
        totalCount: allChildren.length,
        shownCount: children.length,
        depth: depth + 1,
        isLast: true,
        ancestorIsLast: [...chain, true],
        ancestorIds: [...idChain, `${kind}-${org.id}`],
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

/* Ancestors of `orgId` plus itself, as ids. V2 seeds its expansion with this so
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
  // V3 only: opens an organization as its own Support tab. Absent elsewhere, and
  // the View all row is only rendered when it's present.
  onOpenInNewTab,
  /* V3's full-page department view (see DepartmentPage). Roots the tree at one
     organization and lifts the row cap, which is the whole difference between the
     capped tree and the page a View all opens. Everything else — geometry, chevrons,
     skeletons, selection — is the same component, so the two can't drift apart. */
  rootId = null,
  uncapped = false,
  hideSearch = false,
}) {
  // V4 No chevrons is V1's treatment against an organization with a hundred child
  // departments — same columns, one organization's child list swapped for a
  // full-sized one, and a dot in place of the chevron. It hangs off Bramblewick, the
  // node the prototype opens on, so the at-scale case is what V4 shows first rather
  // than something to drill for. The long scroll it produces is the point: centring
  // the view bounds how deep the tree goes, not how wide one level of it is, so this
  // is the case the focused view does not answer.
  const atScale = version === 'v4'
  /* The People column at the right edge of the table — everyone at or below each row.
     Off in every version now. V4 was the last to carry it, on the argument that "150
     child orgs" says nothing about which of them anyone can actually reach; against
     that, a per-row number sitting beside a hundred rows of zeroes is a column of
     zeroes, and the reach that *is* worth stating is stated once in the count line
     above the table instead of 150 times down the side of it.
     Kept as a named flag rather than cut out, because the five render sites it gates
     are correct and a version wanting the column back is this line. */
  const showPeopleColumn = false
  /* The `· 73 people` half of the count line above the table. Still V4's: it's the
     version whose subject is scale, and one summary of how many people the selection
     reaches is the part of the old column that was worth keeping. */
  const showPeopleReach = atScale
  /* People *rows* — end users listed in the tree beside the organizations — belonged
     to V2 only, and no version on the table has them now: V4 replaced its end users
     with departments, since its subject is how wide one level of the hierarchy can
     get. Held as a named constant rather than deleted because both builders take it
     as a parameter and honour it throughout; bringing people rows back to a version
     is this line plus a condition, whereas tearing the parameter out and rewriting it
     later would be a day's work to land in the same place. */
  const showPeopleRows = false
  /* V2 Expand all rows: no row dividers, the child count moved out of its own column into
     a parenthetical beside each name, and — the substance of it — the chevron split
     off from the name. Clicking a name re-centres the page on that organization;
     clicking the chevron opens that organization's children *in place* and leaves the
     page where it is. The two things a chevron could mean — "go here" and "show me
     what's in here" — are one action in V1 and V4, so the only way to see inside a
     node there is to make it the subject. This version separates them, which is what
     lets a reader compare two branches without leaving the row they're on. */
  /* V3: V2's expansion against V4's breadth — 175 departments under Bramblewick
     instead of three. Where V4 puts the whole list in the tree and pages it, V3
     caps any one list at WIDE_ROW_CAP rows and offers a *View all* that opens that
     department as its own Support tab. The two are the two available answers to "this
     node has 175 children", which is why they're separate versions rather than one
     with a toggle. */
  const isWide = version === 'v3'
  /* V3.5: same wide roster and same Show cap as V3, but the cap row is replaced by
     View more, which adds another Show-sized batch in place (50, 75 or 100 depending
     on the control's setting). */
  const isViewMore = version === 'v3b'
  /* V3.75: currently an exact copy of V3.5, kept as its own id so scroll-to-load
     behavior can be built into it without touching V3.5. */
  const isScrollLoad = version === 'v3c'
  /* V1.5: V1's focused view with three of V3.5's mechanics added — a skeleton beat
     while the list "loads" after each re-centre, the Show control in the header
     (retitled Show child orgs, since the records it numbers are the selected
     organization's children), and a cap on that children list with View more at
     the bottom. Reads the V3.5 roster, as V1 now does, so every child count
     matches V3.5's. */
  const isCappedFocused = version === 'v1b'
  /* V3, V3.5 and V3.75 use the wide department roster and the full 175 / 133 counts. */
  const isWideRoster = isWide || isViewMore || isScrollLoad
  const isExpandable = version === 'v2' || isWide || isViewMore || isScrollLoad
  /* No row dividers, and the child count inline beside each name. Both of the
     expandable versions do this and nothing else does, so it tracks `isExpandable`
     exactly — kept as its own name because they are two separate decisions that
     happen to coincide, and a version wanting one without the other would only need
     to change this line. */
  const isSansLines = isExpandable
  /* V1.5 drops the row division lines too — only the line under the header
     stays. Its own flag rather than widening isSansLines, which also gates the
     expandable versions' inline counts; this is only about the rules. */
  const noRowRules = isSansLines || isCappedFocused
  /* The Child orgs column belongs to the lined versions — minus V1.5, which
     drops the column and carries the count inline beside the name, the way
     V3.5 does. Lines stay; only the column goes. */
  const showChildCountColumn = !isSansLines && !isCappedFocused
  // V4 marks expandable rows with dots instead of chevrons — hence its name.
  const isDotted = atScale

  /* The data options every selector in this component passes. One object rather than
     `{ atScale }` repeated at five call sites, because V3 added a second flag and
     the failure mode of missing one is a count that disagrees with the rows.

     V1 reads the V3.5 roster — every organization keeps the same child count in
     both versions, per the review ask. V1.5 inherits it. */
  const dataOptions = useMemo(
    () => ({
      atScale: atScale || isWideRoster || version === 'v1' || isCappedFocused,
      wide: isWideRoster || version === 'v1' || isCappedFocused,
    }),
    [atScale, isWideRoster, version, isCappedFocused],
  )

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
  /* The rows' own scroll region. On the profile tab this is the scroller; on the
     rooted department page it never overflows (the page around it scrolls instead),
     so goToPage falls back to the upward walk for that case. */
  const scrollRef = useRef(null)

  const goToPage = (next) => {
    setPage(next)
    const own = scrollRef.current
    if (own && own.scrollHeight > own.clientHeight) {
      own.scrollTo({ top: 0 })
      return
    }
    let el = rootRef.current?.parentElement
    while (el) {
      if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)) {
        el.scrollTo({ top: 0 })
        return
      }
      el = el.parentElement
    }
  }

  /* Organizations the reader has opened. V2 only — it is what shapes that
     version's tree, and it is ignored entirely by the others.

     Seeded with the path down to the organization the tab opens on, so V2's first
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

  /* How many rows a capped list shows before its *View all* — the Show control's
     setting. See WIDE_ROW_CAP_OPTIONS. */
  const [rowCapChoice, setRowCapChoice] = useState(WIDE_ROW_CAP)

  /* V3.5's per-org cap overrides. orgId → number (current visible count after View
     more clicks) | null (View all clicked — no cap). Orgs absent from the map use
     rowCapChoice as the cap. Reset when leaving v3b so entering it again starts
     fresh.

     Kept separate from V3.75's own map below rather than shared: they're two
     different treatments of the same idea being compared side by side, and sharing
     state would mean revealing Knot Theory by scrolling in V3.75 also reveals it by
     clicking in V3.5 — the two would stop being independent variables. */
  const [expandedCapMap, setExpandedCapMap] = useState(() => new Map())
  useEffect(() => {
    if (!isViewMore) setExpandedCapMap(new Map())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  /* V3.75's own cap overrides — same shape as expandedCapMap, its own state. See the
     note above for why the two aren't shared. */
  const [scrollCapMap, setScrollCapMap] = useState(() => new Map())
  useEffect(() => {
    if (!isScrollLoad) setScrollCapMap(new Map())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  /* V1.5's own cap overrides — same shape again, its own state for the same
     reason. Only ever holds entries for the organization the view is centred on,
     since that's the one list this view caps. */
  const [focusedCapMap, setFocusedCapMap] = useState(() => new Map())
  useEffect(() => {
    if (!isCappedFocused) setFocusedCapMap(new Map())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  /* V1.5's simulated fetch. The focused view has no chevrons to open, so the
     "request" is the navigation itself: every re-centre — drill in, drill out,
     or landing on the version — holds skeleton rows for the same beat a chevron
     open would in the expandable versions. */
  const [focusedLoading, setFocusedLoading] = useState(false)
  useEffect(() => {
    if (!isCappedFocused) return undefined
    setFocusedLoading(true)
    const timeoutId = window.setTimeout(() => setFocusedLoading(false), SKELETON_DURATION_MS)
    return () => window.clearTimeout(timeoutId)
  }, [isCappedFocused, selectedId])

  /* V3.75: which nodes are currently blinking, and where — orgId → the sentinel's
     `top` at the moment it was caught, which is where the indicator floats until the
     batch lands. A Map rather than a single value because Bramblewick and Mathematics
     can each be scrolled to their own bottom at once. */
  const [scrollLoadingMap, setScrollLoadingMap] = useState(() => new Map())
  /* Guards against a second observer callback re-triggering the same node while its
     timeout is still pending — read synchronously inside the callback, so it has to
     be a ref rather than state, which would still show the stale value at that point
     in the same tick. */
  const scrollLoadingOrgsRef = useRef(new Set())
  const scrollTimeoutsRef = useRef(new Map())

  useEffect(() => {
    if (isScrollLoad) return undefined
    // Leaving V3.75 mid-blink: drop whatever was pending rather than let it land on
    // a version it no longer applies to.
    scrollTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
    scrollTimeoutsRef.current.clear()
    scrollLoadingOrgsRef.current.clear()
    setScrollLoadingMap(new Map())
  }, [isScrollLoad])

  useEffect(
    () => () => scrollTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId)),
    [],
  )

  /* The search field's text. Highlighting keys off the trimmed lowercase form;
     the raw string stays untouched so the field shows exactly what was typed. */
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedQuery = searchQuery.trim().toLowerCase()

  /* The reveal runs on a debounced copy of the query. Typing "law" passes
     through "l" and "la", which hit nearly everything (every "Lab" under
     Computer Science, for a start) — revealing on each keystroke would fling
     the tree open for a word nobody searched for. Highlighting and the match
     counter stay on the live query; only the tree-moving work waits for a
     pause. */
  const [revealQuery, setRevealQuery] = useState('')
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setRevealQuery(normalizedQuery), 300)
    return () => window.clearTimeout(timeoutId)
  }, [normalizedQuery])

  /* Which branches are open because of search, and which the reader shut
     themselves during this query. The two are what let the reveal relax as the
     query narrows — closing branches it opened that no longer lead to a hit —
     without ever closing one the reader opened, or reopening one they closed.
     The reader's closes reset with the query: a new word is a new search. */
  const searchOpenedRef = useRef(new Set())
  const readerClosedRef = useRef(new Set())
  useEffect(() => {
    readerClosedRef.current = new Set()
  }, [normalizedQuery])

  /* V1.5's scoped search. The typeahead offers only the selected organization's
     *direct* children whose names start with the query — never grandchildren,
     never other branches — so a search can only ever land on a row this view
     shows, and the field's label ("Search Mathematics") restates the scope.
     There is no counter or chevron navigation here; choosing an option IS the
     search. */
  const searchInputRef = useRef(null)
  /* The menu opens on typing, not on focus — "if I start to type something,
     bring up a menu below the search input" — and closes when a hit is chosen,
     on Escape, or when the field loses focus. Typing again reopens it. */
  const [searchMenuDismissed, setSearchMenuDismissed] = useState(false)
  /* The chosen hit's row, highlighted in Flora yellow.300 until the query is
     typed over or the view re-centres. */
  const [searchHitId, setSearchHitId] = useState(null)
  /* A scroll-and-highlight request waiting for its row to render — choosing a
     hit past the cap lifts the cap first, and the row lands a render (or a
     skeleton beat) later. Same pattern as pendingMatchScrollRef below. */
  const pendingHitScrollRef = useRef(null)

  const searchOptions = useMemo(
    () =>
      isCappedFocused && normalizedQuery
        ? getChildren(selectedId, dataOptions).filter((org) =>
            org.name.toLowerCase().startsWith(normalizedQuery),
          )
        : [],
    [isCappedFocused, selectedId, normalizedQuery, dataOptions],
  )

  const selectSearchHit = (child) => {
    /* The row has to exist to be highlighted: a hit sitting past the cap lifts
       the cap just far enough to include it. */
    const children = getChildren(selectedId, dataOptions)
    const index = children.findIndex((org) => org.id === child.id)
    const effectiveCap = focusedCapMap.get(selectedId) ?? rowCapChoice
    if (index >= effectiveCap) {
      setFocusedCapMap((prev) => new Map(prev).set(selectedId, index + 1))
    }
    setSearchQuery(child.name)
    setSearchMenuDismissed(true)
    setSearchHitId(child.id)
    pendingHitScrollRef.current = child.id
    /* Focus leaving the field is belt and braces for the menu closing — the
       search is done, and the highlighted row now carries the result. */
    searchInputRef.current?.blur()
  }

  /* Retried on every render until the hit's row exists — a cap lift lands a
     render after the click, and a skeleton beat holds rows back longer. */
  useEffect(() => {
    const target = pendingHitScrollRef.current
    if (!target) return
    const el = rootRef.current?.querySelector(`[data-org-id="${target}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    pendingHitScrollRef.current = null
  })

  /* A re-centre moves the search scope with it — a highlight on the old
     centre's child would point at a row that may not even be on screen. */
  useEffect(() => {
    setSearchHitId(null)
    // V1.5's query is scoped to the selected organization's children, so a name
    // typed against one organization can't stay in the box after the view moves
    // to another — the input would promise a scope it no longer has.
    if (isCappedFocused) {
      setSearchQuery('')
      setSearchMenuDismissed(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, version])

  /* A hit behind a View more cap raises that list's cap far enough to show it
     (the last matching row, so one search reveals every hit in the list, not
     just the first). Runs against the version's own cap map, keeping V3.5 and
     V3.75 independent. A hit behind a closed *chevron* is the effect below.
     V1.5 is not in here: its typeahead lifts the cap only when a hit is chosen,
     not as letters are typed — see selectSearchHit. */
  useEffect(() => {
    if (!revealQuery || uncapped || (!isViewMore && !isScrollLoad)) return
    const setCapMap = isViewMore ? setExpandedCapMap : setScrollCapMap
    setCapMap((current) => {
      let next = null
      ORGANIZATIONS.forEach((org) => {
        const children = getChildren(org.id, dataOptions)
        const effectiveCap = current.has(org.id) ? current.get(org.id) : rowCapChoice
        if (effectiveCap === null || children.length <= effectiveCap) return
        let lastMatch = -1
        children.forEach((child, index) => {
          if (child.name.toLowerCase().includes(revealQuery)) lastMatch = index
        })
        if (lastMatch >= effectiveCap) {
          next = next ?? new Map(current)
          next.set(org.id, lastMatch + 1)
        }
      })
      return next ?? current
    })
  }, [revealQuery, isViewMore, isScrollLoad, uncapped, rowCapChoice, dataOptions])

  /* Every organization in the current dataset, walked from the tree's root —
     what search can hit. ORGANIZATIONS alone isn't the whole set: the generated
     rosters (Bramblewick's 175, Mathematics' 133) live outside it, and
     getChildren is the only way back to them. On the rooted department page the
     walk starts at that page's root, not the tree's. */
  const searchableOrgs = useMemo(() => {
    const root = rootId ? getOrganization(rootId) : ORGANIZATIONS.find((org) => !org.parentId)
    if (!root) return []
    const walk = (id) => [
      getOrganization(id),
      ...getChildren(id, dataOptions).flatMap((child) => walk(child.id)),
    ]
    return walk(root.id)
  }, [rootId, dataOptions])

  /* A hit inside a closed chevron opens the chevrons above it — enough of the
     path for the hit to be on screen, no more. The hit's own chevron keeps its
     state, and branches with no hit in them stay shut (that was the earlier
     complaint: search unfolding levels the word isn't in). And as the query
     narrows or clears, branches the search opened that no longer lead to a hit
     close again — the tree relaxes back to the reader's own arrangement. The
     two refs above are what make that safe: a branch the reader opened is
     never search's to close, and one they closed mid-query stays closed.

     Big subtrees get the same skeleton beat a manual chevron click would — it's
     the same simulated fetch, just triggered by the search. Keyed on
     expandedIds as well as the query: opening or closing branches changes the
     set, the effect re-runs, finds nothing left to do, and stops. */
  useEffect(() => {
    if (!isExpandable) return
    const toOpen = new Set()
    if (revealQuery) {
      searchableOrgs.forEach((org) => {
        if (!org.name.toLowerCase().includes(revealQuery)) return
        // Ancestors only — the hit's own chevron stays as it was; opening it
        // would unfold a subtree nobody asked to see.
        pathIds(org.id).slice(0, -1).forEach((id) => toOpen.add(id))
      })
      readerClosedRef.current.forEach((id) => toOpen.delete(id))
    }
    const toClose = [...searchOpenedRef.current].filter((id) => !toOpen.has(id))
    const toAdd = [...toOpen].filter((id) => !expandedIds.has(id))
    if (toClose.length === 0 && toAdd.length === 0) return
    setExpandedIds((current) => {
      const next = new Set([...current].filter((id) => !toClose.includes(id)))
      toAdd.forEach((id) => next.add(id))
      return next
    })
    searchOpenedRef.current = new Set(
      [...searchOpenedRef.current, ...toAdd].filter((id) => toOpen.has(id)),
    )
    const bigOpens = toAdd.filter(
      (id) => getChildren(id, dataOptions).length > SKELETON_THRESHOLD,
    )
    if (toClose.length > 0 || bigOpens.length > 0) {
      setLoadingIds((current) => {
        const next = new Set(current)
        toClose.forEach((id) => next.delete(id))
        bigOpens.forEach((id) => next.add(id))
        return next
      })
    }
  }, [revealQuery, isExpandable, expandedIds, searchableOrgs, dataOptions])

  /* The increment is `rowCapChoice` — the Show control's own setting — rather than a
     fixed number, so "load the next batch" always means the same size batch the
     reader chose to see in the first place. */
  const handleScrollLoadTrigger = useCallback(
    (orgId, top) => {
      if (scrollLoadingOrgsRef.current.has(orgId)) return
      scrollLoadingOrgsRef.current.add(orgId)
      setScrollLoadingMap((current) => new Map(current).set(orgId, top))
      const timeoutId = setTimeout(() => {
        setScrollCapMap((current) => {
          const next = new Map(current)
          next.set(orgId, (next.get(orgId) ?? rowCapChoice) + rowCapChoice)
          return next
        })
        setScrollLoadingMap((current) => {
          const next = new Map(current)
          next.delete(orgId)
          return next
        })
        scrollLoadingOrgsRef.current.delete(orgId)
        scrollTimeoutsRef.current.delete(orgId)
      }, SCROLL_LOAD_BLINK_DURATION)
      scrollTimeoutsRef.current.set(orgId, timeoutId)
    },
    [rowCapChoice],
  )

  const removeLoading = (orgId) =>
    setLoadingIds((current) => {
      if (!current.has(orgId)) return current
      const next = new Set(current)
      next.delete(orgId)
      return next
    })

  const toggleExpanded = (orgId) => {
    const isOpening = !expandedIds.has(orgId)

    /* Search bookkeeping: a branch the reader touches is theirs from then on.
       One they open must never be closed by the reveal relaxing as the query
       narrows; one they close must not be reopened while this query stands. */
    searchOpenedRef.current.delete(orgId)
    if (isOpening) readerClosedRef.current.delete(orgId)
    else readerClosedRef.current.add(orgId)

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
     is V2's opening state rather than a blank one. Carrying an arbitrary set of
     expansions into V4 would land them on rows whose chevrons are dots and whose
     lists are paged — a different treatment reading as a bug rather than as a
     comparison — and coming back into V2 with everything shut would make the
     switch look like it had lost the reader's place.
     eslint-disable-next-line react-hooks/exhaustive-deps — deliberately not keyed on
     selectedId: a selection must not disturb what's open. That case is handled
     below, additively. */
  useEffect(() => {
    setExpandedIds(new Set(rootId ? [rootId] : pathIds(selectedId)))
    setLoadingIds(new Set())
    /* The tree was just rebuilt around the selection, so whatever search was
       holding open belongs to the old tree. Cleared here rather than left for
       the reveal to close: a stale ownership set could shut a branch the fresh
       seed just opened. The reveal reopens what the query still needs on its
       next pass. */
    searchOpenedRef.current = new Set()
    readerClosedRef.current = new Set()
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

  /* Two different trees, not one tree with a flag. V1 and V4 take their shape from
     `selectedId`; V2 takes its shape from `expandedIds` and uses `selectedId` only
     to highlight a row. That is the whole difference between navigating and
     expanding, and it is why they are separate builders. */
  const { rows, pagedTotal, pagedGroup, pagedFrom, pagedTo } = useMemo(
    () =>
      isExpandable
        ? buildExpandableRows(selectedId, showPeopleRows, expandedIds, loadingIds, {
            wide: isWideRoster,
            rowCap: isWideRoster && !uncapped ? rowCapChoice : null,
            rootId,
            // Paged only on the uncapped rooted page — that's the one showing a whole
            // long list, and the cap is the other answer to the same problem.
            page: uncapped && rootId ? page : null,
            capOverrides: !uncapped ? (isViewMore ? expandedCapMap : isScrollLoad ? scrollCapMap : null) : null,
            inlineExpand: (isViewMore || isScrollLoad) && !uncapped,
          })
        : buildFocusedRows(selectedId, showPeopleRows, dataOptions, page, {
            // V1.5 caps the selected organization's children at the Show child
            // orgs setting (or its View-more-grown override) and skeletons the
            // list while the re-centre "fetch" runs.
            cap: isCappedFocused ? (focusedCapMap.get(selectedId) ?? rowCapChoice) : null,
            loading: isCappedFocused && focusedLoading,
          }),
    [
      selectedId,
      showPeopleRows,
      dataOptions,
      page,
      isExpandable,
      isViewMore,
      isScrollLoad,
      isWideRoster,
      isCappedFocused,
      expandedIds,
      loadingIds,
      rootId,
      uncapped,
      rowCapChoice,
      expandedCapMap,
      scrollCapMap,
      focusedCapMap,
      focusedLoading,
    ],
  )

  /* Search match navigation. Matches are counted over the rows on screen — the
     reveal effects above keep that honest: a hit behind a cap or a closed
     chevron is surfaced into `rows`, so it lands in the count a render (or a
     skeleton beat) after the query that found it. */
  const matchCount = useMemo(
    () =>
      normalizedQuery
        ? rows.filter(
            (row) =>
              (row.kind === 'org' || row.kind === 'person') &&
              row.node.name.toLowerCase().includes(normalizedQuery),
          ).length
        : 0,
    [rows, normalizedQuery],
  )
  const [searchIndex, setSearchIndex] = useState(0)
  /* A scroll request waiting for its target to render. The cap reveal lands a
     render after the query changes, so the scroll can't fire in the same commit —
     it waits here and the every-render effect below retries until the mark
     exists. */
  const pendingMatchScrollRef = useRef(null)

  /* A new query starts at the first hit. Clearing the field cancels any pending
     scroll — there's nothing to land on. V1.5 is out of this entirely: its
     hits come from the typeahead, not the counter — see selectSearchHit. */
  useEffect(() => {
    setSearchIndex(0)
    pendingMatchScrollRef.current = normalizedQuery && !isCappedFocused ? 0 : null
  }, [normalizedQuery, isCappedFocused])

  /* The count can shrink out from under the position (deleting characters,
     matches scrolling off a re-centred tree) — keep the index inside it. */
  useEffect(() => {
    setSearchIndex((i) => Math.min(i, Math.max(matchCount - 1, 0)))
  }, [matchCount])

  useEffect(() => {
    const target = pendingMatchScrollRef.current
    if (target === null) return
    /* tbody marks sit in row order, one per matching row — the same order the
       counter counts, so the nth mark is the nth hit. */
    const el = rootRef.current?.querySelectorAll('tbody mark')[target]
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    pendingMatchScrollRef.current = null
  })

  const shownMatchIndex = Math.min(searchIndex, Math.max(matchCount - 1, 0))
  const goToMatch = (nextIndex) => {
    setSearchIndex(nextIndex)
    pendingMatchScrollRef.current = nextIndex
  }

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

     It briefly didn't: for one round V3 moved the count *into* the cell and dropped
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
    () => (showPeopleReach ? countPeopleAtOrBelow(selectedId, dataOptions) : 0),
    [selectedId, showPeopleReach, dataOptions],
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
          <SearchLabelRow>
            <SearchLabel>
              {/* V1.5's label names the scope — the selected organization, whose
                  direct children are all the search covers. It changes as the
                  view re-centres, with the page. */}
              {isCappedFocused
                ? `Search ${getOrganization(selectedId)?.name ?? 'organizations'}`
                : showPeopleRows
                  ? 'Search organizations and users'
                  : 'Search organizations'}
            </SearchLabel>
          </SearchLabelRow>
          <MediaInput
            ref={searchInputRef}
            start={<SearchIcon />}
            onBlur={isCappedFocused ? () => setSearchMenuDismissed(true) : undefined}
            onKeyDown={
              isCappedFocused
                ? (event) => {
                    /* Enter takes the top option; Escape closes the menu. */
                    if (event.key === 'Enter' && searchOptions.length > 0) {
                      event.preventDefault()
                      selectSearchHit(searchOptions[0])
                    } else if (event.key === 'Escape') {
                      setSearchMenuDismissed(true)
                    }
                  }
                : undefined
            }
            end={
              /* The match navigator rides inside the field, at its right end,
                 while a search is running. Down chevron first, then up —
                 Rusty's order. Not V1.5: its search answers through the
                 typeahead, so there's no count to navigate. */
              normalizedQuery === '' || isCappedFocused ? undefined : (
                <MatchNav>
                  {matchCount > 0 ? `${shownMatchIndex + 1} of ${matchCount}` : '0 of 0'}
                  <MatchNavButton
                    type="button"
                    aria-label="Next match"
                    disabled={matchCount === 0 || shownMatchIndex >= matchCount - 1}
                    onClick={() => goToMatch(shownMatchIndex + 1)}
                  >
                    <Chevron direction="down" />
                  </MatchNavButton>
                  <MatchNavButton
                    type="button"
                    aria-label="Previous match"
                    disabled={shownMatchIndex <= 0}
                    onClick={() => goToMatch(shownMatchIndex - 1)}
                  >
                    <Chevron direction="up" />
                  </MatchNavButton>
                </MatchNav>
              )
            }
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              if (isCappedFocused) {
                // Typing over a chosen hit retires its highlight — the yellow
                // row belongs to the option that was picked, not to what
                // replaced it — and reopens the menu it dismissed.
                setSearchHitId(null)
                setSearchMenuDismissed(false)
              }
            }}
          />
          {isCappedFocused && !searchMenuDismissed && normalizedQuery !== '' && searchOptions.length > 0 && (
            /* Preventing mousedown keeps the input focused through the click, so
               choosing an option never races the blur that would close the menu
               first. */
            <SearchMenu role="listbox" onMouseDown={(event) => event.preventDefault()}>
              {searchOptions.map((org) => (
                <SearchMenuItem
                  key={org.id}
                  type="button"
                  role="option"
                  aria-selected={org.id === searchHitId}
                  onClick={() => selectSearchHit(org)}
                >
                  <NameText name={org.name} query={normalizedQuery} />
                </SearchMenuItem>
              ))}
            </SearchMenu>
          )}
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
            {showPeopleReach && ` · ${peopleReach} ${peopleLabel}`}
          </>
        )}
      </Counts>

      <TableScroll ref={scrollRef} $flush={hideSearch}>
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
            <HeaderCell>
              Organization
              {/* *Show 50 | 75 | 100 records*, at the right-hand end of this cell —
                  V3, V3.5 and V3.75. V1.5 carries the same control with the plain
                  *Show* label — no noun, since the list below is one thing: the
                  selected organization's children. Not on the rooted page. */}
              {(isWide || isViewMore || isScrollLoad || isCappedFocused) && !uncapped && (
                <ShowRecords>
                  {'Show '}
                  {WIDE_ROW_CAP_OPTIONS.map((option, index) => (
                    <span key={option}>
                      {index > 0 && <ShowDivider aria-hidden="true">|</ShowDivider>}
                      {option === rowCapChoice ? (
                        <ShowCurrent aria-current="true">{option}</ShowCurrent>
                      ) : (
                        <ShowOption
                          href="#"
                          onClick={(event) => {
                            event.preventDefault()
                            setRowCapChoice(option)
                          }}
                        >
                          {option}
                        </ShowOption>
                      )}
                    </span>
                  ))}
                  {!isCappedFocused && ' records'}
                </ShowRecords>
              )}
            </HeaderCell>
            {/* No Organization type column. It carried Company / Cost Center /
                Supervisory for organizations and Agent / End user for people —
                two different things in one column, and the 22% it took came out
                of the Organization column, which is the one that has to absorb
                ten levels of indent. Note what went with it: Agent vs End user
                is no longer stated anywhere in the tree. */}
            {showChildCountColumn && <HeaderCell width="12%">Child orgs</HeaderCell>}
            {showPeopleColumn && <HeaderCell width="10%">People</HeaderCell>}
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
                  $noRule={noRowRules}
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
                  {showChildCountColumn && <Cell />}
                  {showPeopleColumn && <Cell />}
                </TreeRow>
              )
            }

            /* V3.75's escape hatch: no buttons at all. The sentinel below fires once
               when the reader scrolls it into view, and the batch that lands is
               `rowCapChoice` rows — whatever the Show control is set to — not a fixed
               step, so scrolling always reveals the same size chunk the reader chose
               to see up front. */
            if (row.kind === 'viewMore' && isScrollLoad) {
              return (
                <TreeRow key={row.key} $ruleInset={ruleInsetFor(row.depth)} $noRule={noRowRules}>
                  <NameCell>
                    <RowInner>
                      <TreeGutter row={row} />
                      <LeafArmContinuation aria-hidden="true" />
                      <ScrollLoadSentinel orgId={row.node.id} onTrigger={handleScrollLoadTrigger} />
                    </RowInner>
                  </NameCell>
                  {showChildCountColumn && <Cell />}
                  {showPeopleColumn && <Cell />}
                </TreeRow>
              )
            }

            /* V3.5's escape hatch: View more adds another batch the size of the
               Show control's setting, so "view more" always means "the next 50"
               (or 75, or 100) — the same chunk the reader chose up front. The
               count of what's still capped sits beside it. */
            if (row.kind === 'viewMore') {
              return (
                <TreeRow key={row.key} $ruleInset={ruleInsetFor(row.depth)} $noRule={noRowRules}>
                  <NameCell>
                    <RowInner>
                      <TreeGutter row={row} />
                      <LeafArmContinuation aria-hidden="true" />
                      <ViewAllArea>
                        <ViewAllButton
                          href="#"
                          onClick={(event) => {
                            event.preventDefault()
                            // V1.5's cap lives in focusedCapMap, V3.5's in
                            // expandedCapMap — each version's View more has to
                            // grow the map that version's builder reads.
                            const setCapMap = isCappedFocused ? setFocusedCapMap : setExpandedCapMap
                            setCapMap((prev) => {
                              const next = new Map(prev)
                              next.set(row.node.id, row.shownCount + rowCapChoice)
                              return next
                            })
                          }}
                        >
                          View more
                        </ViewAllButton>
                        <RemainderNote>
                          {row.hiddenCount} more not shown
                        </RemainderNote>
                      </ViewAllArea>
                    </RowInner>
                  </NameCell>
                  {showChildCountColumn && <Cell />}
                  {showPeopleColumn && <Cell />}
                </TreeRow>
              )
            }

            /* V3's escape hatch, in the row after the capped list. A text button
               plus the count it's hiding — the count is what makes the cap legible,
               since 50 rows of departments give no clue how many more there are. */
            if (row.kind === 'viewAll') {
              return (
                <TreeRow key={row.key} $ruleInset={ruleInsetFor(row.depth)} $noRule={noRowRules}>
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
                  {showChildCountColumn && <Cell />}
                  {showPeopleColumn && <Cell />}
                </TreeRow>
              )
            }

            const isPerson = row.kind === 'person'
            const isCurrent = !isPerson && row.node.id === selectedId
            /* V2: the chevron expands in place instead of drilling in, on every
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
                $noRule={noRowRules}
                $selected={isCurrent}
                /* V1.5's hit scroll finds its row by this — see selectSearchHit. */
                data-org-id={isPerson ? undefined : row.node.id}
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
                      /* V2's two-part row: this control opens and closes the
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
                          <NameText name={row.node.name} query={isCappedFocused ? (row.node.id === searchHitId ? normalizedQuery : '') : normalizedQuery} />
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
                          <NameText name={row.node.name} query={isCappedFocused ? (row.node.id === searchHitId ? normalizedQuery : '') : normalizedQuery} />
                        </NameLink>
                      )}
                      {(isSansLines || isCappedFocused) && !isPerson && row.childOrgCount > 0 && (
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
                {showChildCountColumn && (
                  <Cell>
                    {isPerson ? (
                      <Muted>—</Muted>
                    ) : (
                      `${row.childOrgCount} child ${row.childOrgCount === 1 ? 'org' : 'orgs'}`
                    )}
                  </Cell>
                )}
                {showPeopleColumn && <Cell>{isPerson ? <Muted>—</Muted> : row.peopleCount}</Cell>}
              </TreeRow>
            )
          })}
        </Body>
      </TreeTable>

      {/* Only appears once a list of child organizations runs past one page, which
          today only V4's does. The others end at the table, unchanged. */}
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
      </TableScroll>
      {[...scrollLoadingMap].map(([orgId, top]) => (
        <ScrollLoadIndicator key={orgId} style={{ top: top - SCROLL_INDICATOR_OFFSET }}>
          Loading more
        </ScrollLoadIndicator>
      ))}
    </Wrapper>
  )
}
