import { useEffect, useRef, useState } from 'react'
import { ThemeProvider } from './flora-theme/elements/ThemeProvider'
import { TopBar, MainNav } from 'zendesk-globalnav-template'
import styled from 'styled-components'
import OrganizationProfile from './components/OrganizationProfile'
import DepartmentPage from './components/DepartmentPage'
import AddNewUserModal from './components/AddNewUserModal'
import TabBar from './components/TabBar'
import CommentLayer from './comments/CommentLayer'
import PrototypeBar from './prototype-bar/PrototypeBar'
import { AT_SCALE_PARENT_ID, getOrganization, isAtScaleOrg } from './data/hierarchy'
import './App.css'

// The organization whose profile this prototype opens on. Clicking through the
// hierarchy moves off it.
const INITIAL_ORG_ID = 'bramblewick'

/* The bar sits above this; OuterShell is the 100vh wrapper. */
const OuterShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
`

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  background-color: #f8f9f9;
  overflow: hidden;
`

const ContentRow = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
`

const MainContent = styled.main`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #ffffff;
  border-radius: 8px 0px 0px 0px;
  box-shadow: 0px 0px 4px rgba(10, 13, 14, 0.16);
  overflow: hidden;
`

const TopBarRow = styled.div`
  position: relative;
  flex-shrink: 0;
`

const TabBarOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 140px;
  height: 100%;
  display: flex;
  align-items: center;
  z-index: 10;
`


/* The versions on the table, in the order they're offered.
   Renumbered on 17 Aug 2026, when two versions came off the table: the one that listed
   end users as rows in the tree, and the one whose only change was dropping the row
   dividers. They had been V2 and V3. What had been V3.5 — expansion in place — moved
   up into V2, and V3.75 into V3.

   The ids moved with the labels rather than being left where they were: an id that
   reads as one version and renders another is a trap for the next person in here. Note
   that makes both `v2` and `v3` *reused* ids: `v2` now names the expandable version
   rather than the end-users one, and `v3` the wide one rather than the sans-lines one.
   Safe only because the comments table was empty when this changed — no saved pin can
   mean the old thing by either. If that ever stops being true, mint a fresh id instead
   of reusing one.

   V4 keeps its number: it's still the widest case, and a decimal belongs on a version
   that is a variant of another, which it isn't.

   V3.5 is a variant of V3: same wide roster, same Show control, same cap. V3 sends
   to a new tab; V3.5 expands in place with a clickable View more button. V3.75 starts
   as a copy of V3.5 for scroll-to-load development. Ids are `v3b` and `v3c` — retired
   decimals from before the renumbering, safe to reuse now.

   V1.5 is a decimal variant of V1, per the convention above: V1's focused view
   plus a skeleton beat on re-centre, a Show child orgs cap with View more, and a
   search scoped to the selected organization's children.

   V5 replaced V1.5 as the version on the table: same mechanics, plus expand/collapse
   chevrons on the selected organization's children so their subtrees can be opened
   in place. V1.5 moved to ARCHIVE with it; V3.5 went with it too, since the two were
   being compared against each other and that comparison is over.

   V5.1 is `v5a` — V5's decimal, not V5's `.5`: a second variant sitting beside it
   rather than a refinement of it, so the id follows the same "letter suffix, no
   fixed meaning" rule as `v1b`/`v3b` rather than trying to encode ".1" itself. It
   swaps every row for the same empty state V1.5/V5 already show a filter with no
   matches — there was no existing "no hierarchy" design to reuse, so this reuses
   that one rather than inventing new copy for a state nobody's designed yet.

   Add new user (`add-user`) is not a hierarchy variant: selecting it keeps V5's
   tree on screen and opens the grant-access modal over it. Closing restores the
   version that was showing before. */
const VERSIONS = [
  { id: 'v5', label: 'V5 View more, search, chevron expand' },
  { id: 'v5a', label: 'V5.1 No org. hierarchy' },
  { id: 'add-user', label: 'Add new user' },
  { id: 'v1', label: 'V1 MVP', archived: true },
  { id: 'v1b', label: 'V1.5 View more, filter search', archived: true },
  { id: 'v2', label: 'V2 Expand all rows', archived: true },
  { id: 'v3', label: 'V3 View all with pagination', archived: true },
  { id: 'v3b', label: 'V3.5 View more in place', archived: true },
  { id: 'v3c', label: 'V3.75 Scroll to load', archived: true },
  { id: 'v4', label: 'V4 No chevrons', archived: true },
]

const ADD_USER_VERSION = 'add-user'
const DEFAULT_HIERARCHY_VERSION = 'v5'
const isAddUserVersion = (id) => id === ADD_USER_VERSION

/* Restoring a comment's saved version, guarded against ids that no longer exist.
   A pin carrying an id no version answers to would leave the switcher with no matching
   option — a blank field and a tree built by no version's rules. Falls back to leaving
   the version alone, so the comment opens on whatever is on screen instead of nothing.

   Worth knowing what this does *not* catch: the two retired versions were `v2` and
   `v3`, and the renumbering handed both ids to versions that still exist. An old pin
   naming either would restore a version that isn't the one it was made on, silently
   and without tripping this guard. Harmless only because the table was empty at rename
   time; it's the second reason not to reuse an id again. */
const isKnownVersion = (id) => VERSIONS.some((option) => option.id === id)

export default function App() {
  // Product switcher stays pinned to Support for this prototype.
  const [currentProduct, setCurrentProduct] = useState('support')
  const [activeNavItem, setActiveNavItem] = useState(2)
  const [isSubnavExpanded, setIsSubnavExpanded] = useState(false)

  // V1 MVP shows organizations only, with row dividers and a Child orgs column.
  // V2 Expand all rows drops the dividers, moves the child count inline beside each
  // name, and splits the chevron off as an expand control, so any row's subtree can be
  // opened without selecting its node. V3 View all with pagination is V2 against 175
  // departments, capping any one list at 50 rows with a View all that opens the
  // department in its own tab — and that page is where the pagination is, showing the
  // full list 100 rows at a time.
  // V4 No chevrons is V1's columns against Bramblewick's full 150 child departments,
  // paged 100 at a time and marking rows with a dot rather than a chevron.
  // V3.5 View more in place is V3 with the cap row replaced: a clickable View more
  // adds another Show-sized batch in place, with the capped remainder counted beside it.
  // V3.5 Scroll to load is the same cap-and-counter model, but loads 50 rows
  // automatically as you scroll near the bottom — no buttons, just a blue indicator
  // and infinite scroll.
  const [version, setVersion] = useState(DEFAULT_HIERARCHY_VERSION)
  const [commentIsOn, setCommentIsOn] = useState(false)
  /* Version to restore when leaving an add-user modal. Ref rather than state so
     picking Add new user doesn't re-render solely to remember where we came from. */
  const versionBeforeAddUser = useRef(DEFAULT_HIERARCHY_VERSION)
  const isAddUser = isAddUserVersion(version)
  const hierarchyVersion = isAddUser ? DEFAULT_HIERARCHY_VERSION : version

  const handleVersionChange = (nextId) => {
    if (isAddUserVersion(nextId) && !isAddUserVersion(version)) {
      versionBeforeAddUser.current = version
    }
    setVersion(nextId)
  }

  const closeAddUserModal = () => {
    const restore = versionBeforeAddUser.current
    setVersion(isAddUserVersion(restore) ? DEFAULT_HIERARCHY_VERSION : restore)
  }

  // Which organization's profile is open. Lives here because the tab strip and
  // the profile header both name it, and the hierarchy tab re-points it.
  const [orgId, setOrgId] = useState(INITIAL_ORG_ID)
  const org = getOrganization(orgId)

  /* V3's second tab: an organization opened from a *View all*, shown as its own
     full page rather than inside the focused tree. Null when only the profile tab is
     open, which is every other version.

     It lives here rather than in the hierarchy tab because a Support tab is
     chrome — the tab strip at the top of the window is what makes this read as "a
     new tab" rather than as a panel — and the strip is a sibling of the profile,
     not a child of the tree. */
  const [wideTabOrgId, setWideTabOrgId] = useState(null)
  // Which of the two tabs is in front. 'profile' is the organization profile;
  // 'wide' is the full-page department list.
  const [activeTabId, setActiveTabId] = useState('profile')

  const wideTabOrg = wideTabOrgId ? getOrganization(wideTabOrgId) : null
  const isWideTabActive = Boolean(wideTabOrg) && activeTabId === 'wide'

  const openWideTab = (targetId) => {
    setWideTabOrgId(targetId)
    setActiveTabId('wide')
  }

  const closeWideTab = () => {
    setWideTabOrgId(null)
    setActiveTabId('profile')
  }

  /* Leaving V3 closes its extra tab. The full-page department view only exists
     in that version, so a tab left standing would either vanish under the reader or
     show a page the current version can't produce. */
  useEffect(() => {
    if (version !== 'v3' && wideTabOrgId) closeWideTab()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, wideTabOrgId])

  /* Leaving the wide versions while sitting on one of their departments.
     V4 and V3 are the only versions carrying the generated departments, so
     switching away while centred on, say, Palaeontology would leave the page on an
     organization the others cannot show: a tree of one row, and no way back except
     reloading.

     Falls back to the department's own parent, read off the record rather than assumed
     to be Bramblewick. This used to set AT_SCALE_PARENT_ID outright, which was right
     while every generated department hung off Bramblewick and became wrong the moment
     Mathematics got a roster of its own — leaving V3 on Knot Theory would have landed
     the reader on the university instead of on Mathematics, several levels from where
     they were. The `??` still covers the old case, since a department whose parent
     can't be resolved is exactly the situation the fallback exists for. */
  useEffect(() => {
    // V1 shows the V3.5 roster, so a generated department is a legitimate place
    // to stand there too (and in V1.5, which inherits that roster) — only V2
    // still bounces.
    const hasDepartments =
      hierarchyVersion === 'v5' ||
      hierarchyVersion === 'v5a' ||
      hierarchyVersion === 'v4' ||
      hierarchyVersion === 'v3' ||
      hierarchyVersion === 'v3b' ||
      hierarchyVersion === 'v3c' ||
      hierarchyVersion === 'v1' ||
      hierarchyVersion === 'v1b'
    if (!hasDepartments && isAtScaleOrg(orgId)) {
      setOrgId(getOrganization(orgId)?.parentId ?? AT_SCALE_PARENT_ID)
    }
  }, [hierarchyVersion, orgId])

  // Browser tab follows whichever Support tab is in front, the way a real one does.
  useEffect(() => {
    const subject = isWideTabActive ? wideTabOrg.name : org.name
    document.title = `${subject} — Organization hierarchy`
  }, [org.name, isWideTabActive, wideTabOrg])

  /* The globalnav template hardcodes a red "1" badge on the notifications bell —
     no prop, no aria hook. A pinned unread count promises a feature the prototype
     doesn't have, so it comes off here, keyed on the badge's exact red since the
     element carries no stable selector. */
  useEffect(() => {
    document.querySelectorAll('div').forEach((el) => {
      if (getComputedStyle(el).backgroundColor === 'rgb(217, 63, 76)') {
        el.style.display = 'none'
      }
    })
  }, [])

  return (
    <ThemeProvider>
      <OuterShell>
      <PrototypeBar
        title="Organization hierarchy"
        meta="Started July 2026"
        versions={VERSIONS}
        versionId={version}
        onVersionChange={handleVersionChange}
        commentIsOn={commentIsOn}
        onCommentToggle={() => {
          setCommentIsOn((v) => !v)
        }}
      />
      <PageContainer>
        <TopBarRow>
          <TopBar currentProduct={currentProduct} onProductChange={setCurrentProduct} />
          <TabBarOverlay>
            {/* Two tabs at most, and only in V3 — a View all opens the second.
                Clicking between them swaps the page under the strip, which is the
                whole point of doing this as a tab rather than a drawer. */}
            <TabBar
              tabs={[
                { id: 'profile', title: org.name },
                ...(wideTabOrg ? [{ id: 'wide', title: wideTabOrg.name, isCloseable: true }] : []),
              ]}
              activeTabId={wideTabOrg ? activeTabId : 'profile'}
              onSelectTab={setActiveTabId}
              onCloseTab={closeWideTab}
            />
          </TabBarOverlay>
        </TopBarRow>
        <ContentRow>
          <MainNav
            currentProduct="support"
            activeNavItem={activeNavItem}
            setActiveNavItem={setActiveNavItem}
            isSubnavExpanded={isSubnavExpanded}
            setIsSubnavExpanded={setIsSubnavExpanded}
          />
          <MainContent>
            {isWideTabActive ? (
              /* V3's full page for one department: that organization and all of
                 its children, nothing above or beside it. Not a second copy of the
                 hierarchy tab — the point of View all is that the 50-row cap is
                 lifted, so this page shows the lot. */
              <DepartmentPage orgId={wideTabOrgId} onSelectOrganization={setOrgId} />
            ) : (
              <OrganizationProfile
                orgId={orgId}
                onSelectOrganization={setOrgId}
                version={hierarchyVersion}
                onOpenInNewTab={hierarchyVersion === 'v3' ? openWideTab : undefined}
              />
            )}
          </MainContent>
        </ContentRow>

        {/* Comment mode. Sits outside the prototype's own flow: while it's off
            nothing here intercepts a click and the prototype behaves exactly as
            it did before it was added.

            `context` is what a pin remembers about the view it was made in, and
            `onRestoreContext` puts the app back into that view when someone
            opens a comment from another one. That matters because this page
            re-centres on click — the same screen position holds different
            content depending on the version and the selected organization, so a
            pin without this context would point at the wrong row. */}
        <CommentLayer
          context={{ version: hierarchyVersion, orgId, wideTabOrgId, activeTabId }}
          onRestoreContext={(saved) => {
            if (isKnownVersion(saved.version) && !isAddUserVersion(saved.version)) {
              setVersion(saved.version)
            }
            if (saved.orgId) setOrgId(saved.orgId)
            /* V3's second tab is part of the view a pin was made in: the same
               screen position holds a department list on one tab and the profile on
               the other. Restored after the version, because switching version
               closes the extra tab. */
            setWideTabOrgId(saved.wideTabOrgId ?? null)
            setActiveTabId(saved.activeTabId ?? 'profile')
          }}
          isOn={commentIsOn}
          onIsOnChange={setCommentIsOn}
        />
        {isAddUser && (
          <AddNewUserModal orgName={org.name} onClose={closeAddUserModal} />
        )}
      </PageContainer>
      </OuterShell>
    </ThemeProvider>
  )
}
