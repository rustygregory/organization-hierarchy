import { useMemo, useState } from 'react'
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
import { Menu, Item } from '@zendeskgarden/react-dropdowns'
import { Field, Label, MediaInput } from '@zendeskgarden/react-forms'
import { SM } from '@zendeskgarden/react-typography'
import SubtleTag from './SubtleTag'
import {
  getOrganization,
  getChildren,
  getPeopleIn,
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

/* Where a row's name text begins, measured from the left edge of the name
   cell — the point its horizontal rule starts from. */
const ruleInsetFor = (depth) => CELL_PADDING + depth * INDENT_STEP + CHEVRON_SLOT + ARM_GAP

/**
 * Side-by-side comparison of the two rail treatments, so the difference can be
 * judged in one screenshot rather than two.
 *
 * Listed here → *attached*: the row draws a descender from its own chevron down
 * to its children's rail, so the guide line runs unbroken from parent node to
 * last descendant. Not listed → *detached*: the children's rail begins at the
 * top of the first child row, leaving a half-row gap under the parent chevron.
 *
 * Bramblewick and Computer Science are attached (a continuous line from the
 * university down to Amara Diallo); Mathematics is deliberately left detached
 * as the contrast case. Temporary — collapses to one treatment once picked.
 */
const ATTACHED_ORG_IDS = new Set(['bramblewick', 'computer-science'])


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
   header cells inherit a smaller size, so it's set on the table to cover both. */
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
`

/* The rule is a pseudo-element rather than a border so the name cell's copy can
   be inset by its own indent while every cell to the right stays flush. Drawn
   on all cells from the same `bottom: 0`, so the segments line up exactly.
   V3 drops it entirely: the only line left running across the page is the one
   under the header, so the tree's own vertical guides carry the structure. */
const TreeRow = styled(Row)`
  &:hover {
    background-color: #f7f7f7;
  }

  td {
    position: relative;
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

/* V3's replacement for the Child orgs column: the bare count in parentheses,
   right after the name. Reads as part of the node rather than as a column of
   repeated "child orgs" copy, which is what let the column go away. */
const ChildCount = styled.span`
  font-size: 14px;
  color: #646864;
  white-space: nowrap;
`

/* The bulk control: a bordered chevron box in the header, sitting directly
   above the depth-0 rows' chevrons so it reads as the master switch for that
   column of disclosures. */
const BulkButton = styled.button`
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid #dcdcda;
  border-radius: 4px;
  background: #ffffff;
  cursor: pointer;
  color: #646864;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    border-color: #b7b7b3;
    color: #2f3130;
  }

  &:focus-visible {
    outline: 2px solid #406cc4;
    outline-offset: 1px;
  }
`

const HeaderCellInner = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

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
 * Walks the tree from `rootId`, emitting only rows that are currently visible,
 * and carrying the geometry each row needs to draw its guide lines:
 *
 *   depth          how far to indent
 *   isLast         terminate the parent's vertical with an elbow, not a tee
 *   ancestorIsLast one entry per depth, indexed by depth: was the ancestor at
 *                  that depth its own parent's last child? Where it was, the
 *                  vertical above it has already closed, so the corresponding
 *                  rail draws nothing. Index `depth` is the row itself.
 */
const buildRows = (rootId, expandedIds, showPeople = true) => {
  const rows = []

  const walk = (orgId, depth, isLast, ancestorIsLast, ancestorIds) => {
    const org = getOrganization(orgId)
    if (!org) return

    const childOrgs = getChildren(orgId)
    // V1 MVP is an organizations-only view, so people never enter the tree.
    const people = showPeople ? getPeopleIn(orgId) : []
    const isExpandable = childOrgs.length > 0 || people.length > 0
    const isExpanded = expandedIds.has(orgId)

    // This row's own chain: everything above it, plus whether it is itself a
    // last child. Children inherit this as their ancestor chain.
    const chain = [...ancestorIsLast, isLast]
    // Parallel chain of ids, so a row can tell which branch it sits in — used
    // by the row-rule comparison below.
    const idChain = [...ancestorIds, orgId]

    rows.push({
      key: `org-${orgId}`,
      kind: 'org',
      node: org,
      depth,
      isLast,
      ancestorIsLast: chain,
      ancestorIds: idChain,
      isExpandable,
      isExpanded,
      childOrgCount: childOrgs.length,
      peopleCount: countPeopleAtOrBelow(orgId),
    })

    if (!isExpanded) return

    // Child organizations first so the structure reads as a skeleton, then the
    // people who sit directly at this level — people are always the last
    // group under an org, so only they can close the subtree.
    childOrgs.forEach((child, index) => {
      const isLastChild = index === childOrgs.length - 1 && people.length === 0
      walk(child.id, depth + 1, isLastChild, chain, idChain)
    })

    people.forEach((person, index) => {
      const isLastPerson = index === people.length - 1
      rows.push({
        key: `person-${person.id}-${orgId}`,
        kind: 'person',
        node: person,
        depth: depth + 1,
        isLast: isLastPerson,
        ancestorIsLast: [...chain, isLastPerson],
        ancestorIds: [...idChain, person.id],
        isExpandable: false,
        isExpanded: false,
      })
    })
  }

  walk(rootId, 0, true, [], [])
  return rows
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

export default function OrganizationHierarchyTab({ persona, initialExpandedIds, version = 'v1' }) {
  // V1 MVP and V3: organizations only — no people rows, no type/people columns.
  const showPeople = version === 'v2'
  // V3 Sans lines: no row dividers, and the child count moves out of its own
  // column into a parenthetical beside each organization's name.
  const isSansLines = version === 'v3'
  const rootId = persona.attachedOrgId
  const accessibleOrgIds = useMemo(() => [rootId, ...getDescendantIds(rootId)], [rootId])

  // Fully expanded on load, so the shape of the tree — and the reach the
  // cascade grants — is the first thing you see. `initialExpandedIds` overrides
  // it (pass `[]` for the collapsed state).
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(initialExpandedIds ?? accessibleOrgIds),
  )
  const peopleReach = useMemo(
    () => (showPeople ? countPeopleAtOrBelow(rootId) : 0),
    [rootId, showPeople],
  )
  const rows = useMemo(
    () => buildRows(rootId, expandedIds, showPeople),
    [rootId, expandedIds, showPeople],
  )

  const toggle = (orgId) => {
    setExpandedIds((previous) => {
      const next = new Set(previous)
      if (next.has(orgId)) {
        next.delete(orgId)
      } else {
        next.add(orgId)
      }
      return next
    })
  }

  // Open all / Collapse all are always available. If the tree is already fully
  // open, Open all simply lands on the same state — no disabled states to
  // reason about, and nothing breaks.
  //
  // Garden reports the chosen item as `value` on the change object for both
  // click and keyboard selection (`selectedItems` is only populated for
  // radio/checkbox items), so switching on `value` covers both paths.
  const handleBulkChange = ({ value }) => {
    if (value === 'open-all') {
      setExpandedIds(new Set(accessibleOrgIds))
    } else if (value === 'collapse-all') {
      setExpandedIds(new Set())
    }
  }

  const orgLabel = accessibleOrgIds.length === 1 ? 'organization' : 'organizations'
  const peopleLabel = peopleReach === 1 ? 'person' : 'people'

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
        {accessibleOrgIds.length} {orgLabel}
        {showPeople && ` · ${peopleReach} ${peopleLabel}`}
      </Counts>

      <TreeTable>
        <HiddenCaption>Organizations and people this user can access</HiddenCaption>
        <Head>
          <HeaderRow>
            <HeaderCell>
              <HeaderCellInner>
                <Menu
                  placement="bottom-start"
                  onChange={handleBulkChange}
                  button={(props) => (
                    <BulkButton
                      {...props}
                      type="button"
                      aria-label="Expand or collapse the whole hierarchy"
                    >
                      {/* Flips up while the menu is open, back down when it
                          closes — the chevron reports the menu's state, which is
                          what the click acts on. Garden puts `aria-expanded` on
                          the trigger props, so no second copy of that state. */}
                      <Chevron direction={props['aria-expanded'] ? 'up' : 'down'} />
                    </BulkButton>
                  )}
                >
                  <Item value="open-all">Open all</Item>
                  <Item value="collapse-all">Collapse all</Item>
                </Menu>
                <span>Organization</span>
              </HeaderCellInner>
            </HeaderCell>
            {showPeople && <HeaderCell width="22%">Organization type</HeaderCell>}
            {!isSansLines && <HeaderCell width="12%">Child orgs</HeaderCell>}
            {showPeople && <HeaderCell width="10%">People</HeaderCell>}
          </HeaderRow>
        </Head>
        <Body>
          {rows.map((row) => {
            const isPerson = row.kind === 'person'
            const isCurrent = !isPerson && row.node.id === rootId

            return (
              <TreeRow
                key={row.key}
                $ruleInset={ruleInsetFor(row.depth)}
                $noRule={isSansLines}
              >
                <NameCell>
                  <RowInner>
                    {row.isExpanded && ATTACHED_ORG_IDS.has(row.node.id) && (
                      <ParentDescender $depth={row.depth} aria-hidden="true" />
                    )}
                    <TreeGutter row={row} />

                    {row.isExpandable ? (
                      <ChevronButton
                        type="button"
                        onClick={() => toggle(row.node.id)}
                        aria-expanded={row.isExpanded}
                        aria-label={`${row.isExpanded ? 'Collapse' : 'Expand'} ${row.node.name}`}
                      >
                        <Chevron direction={row.isExpanded ? 'down' : 'right'} />
                      </ChevronButton>
                    ) : (
                      <LeafArmContinuation aria-hidden="true" />
                    )}

                    <NameArea>
                      <NameLink
                        href="#"
                        onClick={(event) => event.preventDefault()}
                        title={row.node.name}
                      >
                        {row.node.name}
                      </NameLink>
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
    </Wrapper>
  )
}
