import { useEffect, useState } from 'react'
import { ThemeProvider } from './flora-theme/elements/ThemeProvider'
import { TopBar, MainNav } from 'zendesk-globalnav-template'
import styled from 'styled-components'
import OrganizationProfile from './components/OrganizationProfile'
import DepartmentPage from './components/DepartmentPage'
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
   to a new tab; V3.5 expands in place with clickable View more buttons. V3.75 starts
   as a copy of V3.5 for scroll-to-load development. Ids are `v3b` and `v3c` — retired
   decimals from before the renumbering, safe to reuse now. V4 is archived. */
const VERSIONS = [
  { id: 'v1', label: 'V1 MVP' },
  { id: 'v2', label: 'V2 Expand all rows' },
  { id: 'v3', label: 'V3 View all with pagination' },
  { id: 'v3b', label: 'V3.5 View more in place' },
  { id: 'v3c', label: 'V3.75 Scroll to load' },
  { id: 'v4', label: 'V4 No chevrons', archived: true },
]

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
  // V3.5 View more in place is V3 with the cap row replaced: clickable View more adds
  // 50 rows in place and View all drops the cap entirely.
  // V3.5 Scroll to load is the same cap-and-counter model, but loads 50 rows
  // automatically as you scroll near the bottom — no buttons, just a blue indicator
  // and infinite scroll.
  const [version, setVersion] = useState('v1')
  const [commentIsOn, setCommentIsOn] = useState(false)

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
    const hasDepartments = version === 'v4' || version === 'v3' || version === 'v3b' || version === 'v3c'
    if (!hasDepartments && isAtScaleOrg(orgId)) {
      setOrgId(getOrganization(orgId)?.parentId ?? AT_SCALE_PARENT_ID)
    }
  }, [version, orgId])

  // Browser tab follows whichever Support tab is in front, the way a real one does.
  useEffect(() => {
    const subject = isWideTabActive ? wideTabOrg.name : org.name
    document.title = `${subject} — Organization hierarchy`
  }, [org.name, isWideTabActive, wideTabOrg])

  return (
    <ThemeProvider>
      <OuterShell>
      <PrototypeBar
        title="Organization hierarchy"
        meta="Started July 2026"
        versions={VERSIONS}
        versionId={version}
        onVersionChange={setVersion}
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
                version={version}
                onOpenInNewTab={version === 'v3' ? openWideTab : undefined}
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
          context={{ version, orgId, wideTabOrgId, activeTabId }}
          onRestoreContext={(saved) => {
            if (isKnownVersion(saved.version)) setVersion(saved.version)
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
      </PageContainer>
      </OuterShell>
    </ThemeProvider>
  )
}
