import { useEffect, useMemo, useState } from 'react'
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
import { Field, Label, MediaInput } from '@zendeskgarden/react-forms'
import { SM } from '@zendeskgarden/react-typography'
import SubtleTag from './SubtleTag'
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

/* The selected row's background: blue.100, the faintest step on Flora's primary
   ramp. It's a tint rather than a fill — enough to read as a band across the row
   at a glance, not enough to compete with the names sitting on it. It's the whole
   selection marking now: a blue bar used to sit at the left edge as well, and two
   blue marks for one state was one too many. The tree's own guide lines already
   show where the row sits.

   Hover stays grey.100 so hovering a row never imitates selection; the selected
   row keeps its own tint on hover rather than reverting to grey. */
const SELECTED_ROW_BG = '#f3f6fb'
const HOVER_ROW_BG = '#f7f7f7'

/* How many people rows one page of the tree shows before the pager takes over.
   Only V4 has a roster big enough to reach it. 100 is high for a page size —
   Support's own lists sit at 30 — and that is the thing under test: whether a
   hundred rows of one department is a scroll a reader will accept in exchange for
   never paging, or whether the number wants to come down. */
const PEOPLE_PER_PAGE = 100

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


const Wrapper = styled.div`
  padding: 24px 32px 40px;
  overflow-y: auto;
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

/* The counts sit directly above the table's bulk-expand control, 8px clear of
   it — close enough to read as a caption for the table rather than a second
   line of page copy. */
/* 20px above comes from SearchField's margin-bottom; no top margin here, so the
   two don't stack. 8px below keeps it tight to the bulk-expand control. */
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

  thead th {
    font-size: 14px;
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

`

const NameCell = styled(Cell)`
  padding-top: 0;
  padding-bottom: 0;
`

const RowInner = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 36px;
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

/* Sits above the pager, left-aligned with the table: which slice of the roster is
   on screen. Without it the tree shows a hundred names under a node whose People
   column reads 150, and the two look like they disagree. */
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
 * `page` windows the selected organization's *people* only. The ancestors,
 * children, and siblings are the structure of the view rather than its contents,
 * so they stay on every page — paging away the path would leave a page-two reader
 * with a list of names and no indication of whose they are.
 *
 * Returns `{ rows, peopleTotal, peopleFrom, peopleTo }` so the caller can caption
 * the slice without recounting it.
 */
const buildFocusedRows = (selectedId, showPeople = true, atScale = false, page = 1) => {
  const rows = []
  const empty = { rows, peopleTotal: 0, peopleFrom: 0, peopleTo: 0 }
  const path = getPath(selectedId)
  const selected = path[path.length - 1]
  if (!selected) return empty

  const peopleOptions = { atScale }

  const hasChildren = (orgId) =>
    getChildren(orgId).length > 0 || (showPeople && getPeopleIn(orgId, peopleOptions).length > 0)

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
      childOrgCount: getChildren(org.id).length,
      peopleCount: countPeopleAtOrBelow(org.id, peopleOptions),
    })
  })

  const ancestorChain = chain
  const ancestorIdChain = idChain
  const selectedDepth = ancestors.length

  const childOrgs = getChildren(selected.id)
  // V1 MVP and V3 are organizations-only views, so people never enter the tree.
  const allPeople = showPeople ? getPeopleIn(selected.id, peopleOptions) : []
  // The window on screen. `isOpen` is decided by the full roster, not the slice,
  // so a node with people always reads as open even on a page that shows none.
  const pageStart = (page - 1) * PEOPLE_PER_PAGE
  const people = allPeople.slice(pageStart, pageStart + PEOPLE_PER_PAGE)
  const isOpen = childOrgs.length > 0 || allPeople.length > 0

  // The whole sibling group in its own order, with the selected organization
  // sitting wherever it actually sits. Hoisting it to the top of the group would
  // make a click reorder the rows around it — you click the third of four pods
  // and it jumps to first, which reads as the list rearranging itself rather
  // than as one row being selected. The tree holds still; only the highlight and
  // the `current` tag move.
  const siblingGroup = selected.parentId ? getChildren(selected.parentId) : [selected]

  siblingGroup.forEach((org, index) => {
    const isLast = index === siblingGroup.length - 1
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
      childOrgCount: getChildren(org.id).length,
      peopleCount: countPeopleAtOrBelow(org.id, peopleOptions),
    })

    if (!isSelected) return

    // Direct children, nested under the selected organization. Each is a leaf
    // *here* — whatever hangs below it stays out of the view until it is clicked.
    childOrgs.forEach((child, childIndex) => {
      const isLastChild = childIndex === childOrgs.length - 1 && people.length === 0
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
        childOrgCount: getChildren(child.id).length,
        peopleCount: countPeopleAtOrBelow(child.id, peopleOptions),
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
    peopleTotal: allPeople.length,
    // 1-indexed and inclusive, for "Showing 101–150 of 150". Zero when the slice
    // is empty, so the caption can be left off entirely.
    peopleFrom: people.length > 0 ? pageStart + 1 : 0,
    peopleTo: pageStart + people.length,
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

/* Centred on `selectedId` — the organization whose profile this tab is on.
   Clicking another organization re-centres the whole page, so selection lives
   above this component rather than being tracked here. */
export default function OrganizationHierarchyTab({
  selectedId,
  onSelectOrganization,
  version = 'v1',
}) {
  // V4 is V2's treatment against an organization with a real roster — same
  // columns, same people rows, one organization's user list swapped for a
  // full-sized one. It hangs off Bramblewick, the node the prototype opens on, so
  // the at-scale case is what V4 shows first rather than something to drill for.
  // The long scroll it produces is the point: centring the view bounds how deep
  // the tree goes, not how many people sit in one node, so this is the case the
  // focused view does not answer.
  const atScale = version === 'v4'
  // V1 MVP and V3: organizations only — no people rows, no type/people columns.
  const showPeople = version === 'v2' || atScale
  // V3 Sans lines: no row dividers, and the child count moves out of its own
  // column into a parenthetical beside each organization's name.
  const isSansLines = version === 'v3'

  // Which page of the selected organization's people is on screen.
  const [page, setPage] = useState(1)

  // Back to page one whenever the subject changes. Landing on page 3 of a
  // department you just navigated to — because the last one happened to have that
  // many — would look like rows had gone missing.
  useEffect(() => {
    setPage(1)
  }, [selectedId, version])

  const { rows, peopleTotal, peopleFrom, peopleTo } = useMemo(
    () => buildFocusedRows(selectedId, showPeople, atScale, page),
    [selectedId, showPeople, atScale, page],
  )

  const totalPages = Math.ceil(peopleTotal / PEOPLE_PER_PAGE)
  const isPaginated = totalPages > 1

  // The counter still describes reach, not the rows on screen: the point of the
  // feature is how far access cascades below the selected organization, and that
  // is a number the focused view no longer shows in full.
  const reachOrgCount = useMemo(() => 1 + getDescendantIds(selectedId).length, [selectedId])
  const peopleReach = useMemo(
    () => (showPeople ? countPeopleAtOrBelow(selectedId, { atScale }) : 0),
    [selectedId, showPeople, atScale],
  )

  // Drill-in. Every organization in the view is a link to its own context; the
  // page re-centres and the row set is rebuilt from that node's perspective.
  const select = (orgId) => {
    if (orgId !== selectedId) onSelectOrganization?.(orgId)
  }

  const orgLabel = reachOrgCount === 1 ? 'organization' : 'organizations'
  const peopleLabel = peopleReach === 1 ? 'person' : 'people'
  // Named in the pager's caption and its accessible label, so a reader arriving at
  // the control knows which node's roster it walks.
  const selectedName = getOrganization(selectedId)?.name

  return (
    <Wrapper>
      {/* No Hint — the label carries the explanation, and a hint line here
          pushed the counts and the table down for no added meaning. */}
      <SearchField>
        <SearchLabel>
          {showPeople ? 'Search organizations and users' : 'Search organizations'}
        </SearchLabel>
        <MediaInput start={<SearchIcon />} />
      </SearchField>

      <Counts>
        {reachOrgCount} {orgLabel}
        {showPeople && ` · ${peopleReach} ${peopleLabel}`}
      </Counts>

      <TreeTable isReadOnly>
        <HiddenCaption>
          Hierarchy around the selected organization: its ancestors, direct children, and
          direct siblings
        </HiddenCaption>
        <Head>
          <HeaderRow>
            <HeaderCell>Organization</HeaderCell>
            {showPeople && <HeaderCell width="22%">Organization type</HeaderCell>}
            {!isSansLines && <HeaderCell width="12%">Child orgs</HeaderCell>}
            {showPeople && <HeaderCell width="10%">People</HeaderCell>}
          </HeaderRow>
        </Head>
        <Body>
          {rows.map((row) => {
            const isPerson = row.kind === 'person'
            const isCurrent = !isPerson && row.node.id === selectedId

            return (
              <TreeRow
                key={row.key}
                $ruleInset={ruleInsetFor(row.depth)}
                $noRule={isSansLines}
                $selected={isCurrent}
              >
                <NameCell>
                  <RowInner>
                    {row.isOpen && <ParentDescender $depth={row.depth} aria-hidden="true" />}
                    <TreeGutter row={row} />

                    {/* Three states, no expand/collapse: a down chevron on the
                        rows whose children are already in view (the path and the
                        selected node), a clickable right chevron on rows with a
                        subtree the focused view is holding back, and the plain
                        arm on true leaves. */}
                    {row.isOpen ? (
                      <ChevronSlot aria-hidden="true">
                        <Chevron direction="down" />
                      </ChevronSlot>
                    ) : row.hasChildren ? (
                      <ChevronButton
                        type="button"
                        onClick={() => select(row.node.id)}
                        aria-label={`Show the hierarchy around ${row.node.name}`}
                      >
                        <Chevron direction="right" />
                      </ChevronButton>
                    ) : (
                      <LeafArmContinuation aria-hidden="true" />
                    )}

                    <NameArea>
                      {isPerson || isCurrent ? (
                        /* The centre of the view is not a link to itself. */
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
                      {isCurrent && <SubtleTag>current</SubtleTag>}
                      {isPerson && row.node.title && (
                        <PersonTitle>{row.node.title}</PersonTitle>
                      )}
                    </NameArea>
                  </RowInner>
                </NameCell>
                {showPeople && <Cell>{row.node.type}</Cell>}
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

      {/* Only appears once a roster runs past one page, which today only V4's
          does. V1–V3 end at the table, unchanged. */}
      {isPaginated && (
        <>
          <PageStatus>
            Showing users {peopleFrom}–{peopleTo} of {peopleTotal} in {selectedName}
          </PageStatus>
          <PaginationRow>
            <OffsetPagination
              currentPage={page}
              totalPages={totalPages}
              onChange={setPage}
              aria-label={`Pages of users in ${selectedName}`}
            />
          </PaginationRow>
        </>
      )}
    </Wrapper>
  )
}
