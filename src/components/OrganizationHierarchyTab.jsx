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
import { Tag } from '@zendeskgarden/react-tags'
import { MD, SM } from '@zendeskgarden/react-typography'
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

const Wrapper = styled.div`
  padding: 24px 32px 40px;
  overflow-y: auto;
  flex: 1;
`

const HeaderBlock = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 4px;
`

const Counts = styled(SM)`
  color: #646864;
  white-space: nowrap;
`

const Subhead = styled(SM)`
  color: #646864;
  margin-bottom: 20px;
  display: block;
`

/* Garden's table draws a full-width rule under every row. The whole point of
   the tree treatment is that those rules compete with the vertical guides, so
   they come off here — only the header keeps its rule. Rows separate by
   whitespace and hover instead. */
const TreeTable = styled(Table)`
  table-layout: fixed;

  tbody tr,
  tbody td {
    border-bottom: none;
  }
`

const TreeRow = styled(Row)`
  &:hover {
    background-color: #f7f7f7;
  }
`

const NameCell = styled(Cell)`
  padding-top: 0;
  padding-bottom: 0;
`

const RowInner = styled.div`
  display: flex;
  align-items: stretch;
  min-height: 36px;
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

const PersonTitle = styled.span`
  font-size: 13px;
  color: #8b8e89;
  white-space: nowrap;
`

const Muted = styled.span`
  color: #999b97;
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
      transform: direction === 'right' ? 'rotate(-90deg)' : 'none',
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
const buildRows = (rootId, expandedIds) => {
  const rows = []

  const walk = (orgId, depth, isLast, ancestorIsLast) => {
    const org = getOrganization(orgId)
    if (!org) return

    const childOrgs = getChildren(orgId)
    const people = getPeopleIn(orgId)
    const isExpandable = childOrgs.length > 0 || people.length > 0
    const isExpanded = expandedIds.has(orgId)

    // This row's own chain: everything above it, plus whether it is itself a
    // last child. Children inherit this as their ancestor chain.
    const chain = [...ancestorIsLast, isLast]

    rows.push({
      key: `org-${orgId}`,
      kind: 'org',
      node: org,
      depth,
      isLast,
      ancestorIsLast: chain,
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
      walk(child.id, depth + 1, isLastChild, chain)
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
        isExpandable: false,
        isExpanded: false,
      })
    })
  }

  walk(rootId, 0, true, [])
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
        return <Rail key={level}>{!row.ancestorIsLast[level + 1] && <RailVertical />}</Rail>
      })}
    </>
  )
}

export default function OrganizationHierarchyTab({ persona, initialExpandedIds }) {
  const rootId = persona.attachedOrgId
  // Collapsed by default — a tree can be ten deep and hundreds wide, so
  // nothing opens until asked. `initialExpandedIds` is an override seam.
  const [expandedIds, setExpandedIds] = useState(() => new Set(initialExpandedIds))

  const rootOrg = getOrganization(rootId)
  const accessibleOrgIds = useMemo(() => [rootId, ...getDescendantIds(rootId)], [rootId])
  const peopleReach = useMemo(() => countPeopleAtOrBelow(rootId), [rootId])
  const rows = useMemo(() => buildRows(rootId, expandedIds), [rootId, expandedIds])

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
      <HeaderBlock>
        <MD tag="h2" style={{ fontWeight: 600, color: '#2f3130' }}>
          Organizations this user can access
        </MD>
        <Counts>
          {accessibleOrgIds.length} {orgLabel} · {peopleReach} {peopleLabel}
        </Counts>
      </HeaderBlock>
      <Subhead>
        Access granted at {rootOrg?.name} — includes every organization and person below it.
      </Subhead>

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
                      <Chevron direction={expandedIds.size > 0 ? 'down' : 'right'} />
                    </BulkButton>
                  )}
                >
                  <Item value="open-all">Open all</Item>
                  <Item value="collapse-all">Collapse all</Item>
                </Menu>
                <span>Organization</span>
              </HeaderCellInner>
            </HeaderCell>
            <HeaderCell width="22%">Organization type</HeaderCell>
            <HeaderCell width="12%">Child orgs</HeaderCell>
            <HeaderCell width="10%">People</HeaderCell>
          </HeaderRow>
        </Head>
        <Body>
          {rows.map((row) => {
            const isPerson = row.kind === 'person'
            const isCurrent = !isPerson && row.node.id === rootId

            return (
              <TreeRow key={row.key}>
                <NameCell>
                  <RowInner>
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
                      {isCurrent && <Tag hue="grey">current</Tag>}
                      {isPerson && row.node.title && (
                        <PersonTitle>{row.node.title}</PersonTitle>
                      )}
                    </NameArea>
                  </RowInner>
                </NameCell>
                <Cell>{row.node.type}</Cell>
                <Cell>
                  {isPerson ? (
                    <Muted>—</Muted>
                  ) : (
                    `${row.childOrgCount} child ${row.childOrgCount === 1 ? 'org' : 'orgs'}`
                  )}
                </Cell>
                <Cell>{isPerson ? <Muted>—</Muted> : row.peopleCount}</Cell>
              </TreeRow>
            )
          })}
        </Body>
      </TreeTable>
    </Wrapper>
  )
}
