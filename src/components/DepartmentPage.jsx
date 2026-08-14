import styled from 'styled-components'
import { XXL, SM } from '@zendeskgarden/react-typography'
import { Avatar } from '@zendeskgarden/react-avatars'
import { Button } from '@zendeskgarden/react-buttons'
import { Field, Label, MediaInput } from '@zendeskgarden/react-forms'
import OrganizationHierarchyTab from './OrganizationHierarchyTab'
import { getChildren, getOrganization, getDescendantIds } from '../data/hierarchy'

/* V3.75's *View all* destination: a full page for one department showing that
   department and all of its children.
 *
 * The distinction that makes this worth building rather than reusing the profile:
 * **this is not the hierarchy tab with a different selection.** The profile's tree is
 * a view of the whole hierarchy — ancestors above, siblings beside — and its job is
 * to place one organization in context. This page has one subject and shows what is
 * *inside* it. Nothing above the department appears, and neither do its siblings, so
 * a reader who arrived here looking for a department among 175 isn't reading past
 * the rest of the university to find it.
 *
 * What it does share is the tree itself: the same OrganizationHierarchyTab, rooted at
 * this department and with the 50-row cap lifted. Same geometry, same chevrons, same
 * expansion, so a child that has children of its own still opens in place. Rebuilding
 * the table here would have meant two copies of the rail arithmetic, and they would
 * have drifted the first time either was touched.
 *
 * It is deliberately not a full profile: no properties rail, no Tickets/Users/Related
 * tabs. Those describe an organization as a record, and this page is about one
 * relationship — what the department contains. The profile is a click away in the
 * other tab, which is still open.
 */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 32px 16px;
  border-bottom: 1px solid #eae9e8;
  flex-shrink: 0;
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-right: auto;
  min-width: 0;
`

/* The path down to this department, as text rather than links. This page has no
   ancestors in its tree by design, so the trail is the only thing saying where the
   department sits — and making it navigable would turn the page back into a browser
   for the whole hierarchy, which is the thing it exists to avoid. */
const Trail = styled(SM)`
  color: #646864;
`

const Subject = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
`

const ChildTotal = styled(SM)`
  color: #646864;
  white-space: nowrap;
`

const Toolbar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 16px 32px 0;
  flex-shrink: 0;
`

const SearchField = styled(Field)`
  width: 320px;
`

const SearchLabel = styled(Label)`
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #2f3130;
`

const TreeScroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

/* Garden's building-stroke, at 26px — the same glyph the organization profile uses,
   so the two tabs read as being about the same kind of thing. */
const OrganizationIcon = () => (
  <svg width="26" height="26" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
    <g fill="none" stroke="currentColor">
      <path d="M2.5 15.5V1.5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v14" />
      <path strokeLinecap="round" d="M.5 15.5h15" />
      <path d="M5.5 3.5h2m1 0h2m-5 3h2m1 0h2m-5 3h2m1 0h2" strokeLinecap="round" />
      <path d="M6.5 15.5v-3h3v3" />
    </g>
  </svg>
)

const CaretIcon = () => (
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
  >
    <path d="M2.5 4.5 6 8l3.5-3.5" />
  </svg>
)

// V3.75's data options. This page only ever exists in that version, so they're fixed
// rather than threaded through as props.
const WIDE = { atScale: true, wide: true }

export default function DepartmentPage({ orgId, onSelectOrganization }) {
  const org = getOrganization(orgId)
  if (!org) return null

  const directChildren = getChildren(orgId, WIDE)
  // Everything below, at any depth — the number the cascade actually reaches. Stated
  // beside the direct count only when they differ, since for a flat department they
  // are the same number and printing both invites the reader to look for a
  // distinction that isn't there.
  const reach = getDescendantIds(orgId, WIDE).length

  // Ancestors, top down, excluding the department itself.
  const trail = []
  let cursor = org.parentId ? getOrganization(org.parentId) : null
  while (cursor) {
    trail.unshift(cursor.name)
    cursor = cursor.parentId ? getOrganization(cursor.parentId) : null
  }

  return (
    <Page>
      <Header>
        <Avatar isSystem size="large" backgroundColor="#646864" foregroundColor="#ffffff">
          <OrganizationIcon />
        </Avatar>
        <TitleBlock>
          {trail.length > 0 && <Trail>{trail.join(' › ')}</Trail>}
          <Subject>
            <XXL tag="h1" style={{ color: '#2f3130' }}>
              {org.name}
            </XXL>
            <ChildTotal>
              {directChildren.length} child{' '}
              {directChildren.length === 1 ? 'organization' : 'organizations'}
              {reach !== directChildren.length && ` · ${reach} below in total`}
            </ChildTotal>
          </Subject>
        </TitleBlock>
        <Button>
          Actions
          <span style={{ marginLeft: 8, display: 'inline-flex', verticalAlign: 'middle' }}>
            <CaretIcon />
          </span>
        </Button>
      </Header>

      {/* Search belongs here more than anywhere else in the prototype — this is the
          page with 175 rows on it. Still inert, like the one on the profile. */}
      <Toolbar>
        <SearchField>
          {/* Not "in {org.name}" — the department is named twice already, in the tab
              and the heading, and a long one wraps the label onto two lines. */}
          <SearchLabel>Search this organization</SearchLabel>
          <MediaInput start={<SearchIcon />} />
        </SearchField>
      </Toolbar>

      <TreeScroll>
        {/* The same tree as the profile tab, rooted here and uncapped: this is the
            page the cap sends people to, so a cap on it would be circular. Its own
            search is hidden because the toolbar above already has one scoped to this
            department. */}
        <OrganizationHierarchyTab
          selectedId={orgId}
          onSelectOrganization={onSelectOrganization}
          version="v3-75"
          rootId={orgId}
          uncapped
          hideSearch
        />
      </TreeScroll>
    </Page>
  )
}
