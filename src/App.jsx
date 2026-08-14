import { useEffect, useState } from 'react'
import { ThemeProvider } from './flora-theme/elements/ThemeProvider'
import { TopBar, MainNav } from 'zendesk-globalnav-template'
import { Combobox, Field, Option } from '@zendeskgarden/react-dropdowns'
import styled from 'styled-components'
import OrganizationProfile from './components/OrganizationProfile'
import DepartmentPage from './components/DepartmentPage'
import TabBar from './components/TabBar'
import CommentLayer from './comments/CommentLayer'
import { AT_SCALE_PARENT_ID, getOrganization, isAtScaleOrg } from './data/hierarchy'
import './App.css'

// The organization whose profile this prototype opens on. Clicking through the
// hierarchy moves off it.
const INITIAL_ORG_ID = 'bramblewick'

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
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

// Version switcher overlaid on the top bar, positioned the way the version menus
// in our other prototypes are: the TopBar search box (320px) starts 404px from
// the right edge, so 428px leaves a 24px gap beside it.
const VersionOverlay = styled.div`
  position: absolute;
  top: 0;
  right: 428px;
  height: 100%;
  display: flex;
  align-items: center;
  z-index: 10;
`

const VersionFieldWrapper = styled.div`
  min-width: 200px;
`

const VERSIONS = [
  { id: 'v1', label: 'V1 MVP' },
  { id: 'v2', label: 'V2 with end-users' },
  { id: 'v3', label: 'V3 Sans lines' },
  { id: 'v3-5', label: 'V3.5 Expandable' },
  { id: 'v3-75', label: 'V3.75 175 departments' },
  { id: 'v4', label: 'V4 100 departments' },
]

export default function App() {
  // Product switcher stays pinned to Support for this prototype.
  const [currentProduct, setCurrentProduct] = useState('support')
  const [activeNavItem, setActiveNavItem] = useState(2)
  const [isSubnavExpanded, setIsSubnavExpanded] = useState(false)

  // V1 MVP shows organizations only; V2 adds the end users inside them; V3 is
  // V1 without row dividers, with the child count moved beside each name; V3.5
  // is V3 with the chevron split off as an expand control, so a subtree can be
  // opened without selecting its node; V3.75 is V3.5 against 175 departments,
  // capping any one list at 50 rows with a View all that opens the department in
  // its own tab; V4 is V2 against Bramblewick's full 150 child departments, paged
  // 100 at a time.
  const [version, setVersion] = useState('v1')
  const versionLabel = VERSIONS.find((option) => option.id === version)?.label

  // Which organization's profile is open. Lives here because the tab strip and
  // the profile header both name it, and the hierarchy tab re-points it.
  const [orgId, setOrgId] = useState(INITIAL_ORG_ID)
  const org = getOrganization(orgId)

  /* V3.75's second tab: an organization opened from a *View all*, shown as its own
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

  /* Leaving V3.75 closes its extra tab. The full-page department view only exists
     in that version, so a tab left standing would either vanish under the reader or
     show a page the current version can't produce. */
  useEffect(() => {
    if (version !== 'v3-75' && wideTabOrgId) closeWideTab()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, wideTabOrgId])

  /* Leaving the wide versions while sitting on one of their departments.
     V4 and V3.75 are the only versions carrying the generated departments, so
     switching away while centred on, say, Palaeontology would leave the page on an
     organization the others cannot show: a tree of one row, and no way back except
     reloading. Falls back to the department's parent, which every version has. */
  useEffect(() => {
    const hasDepartments = version === 'v4' || version === 'v3-75'
    if (!hasDepartments && isAtScaleOrg(orgId)) setOrgId(AT_SCALE_PARENT_ID)
  }, [version, orgId])

  // Browser tab follows whichever Support tab is in front, the way a real one does.
  useEffect(() => {
    const subject = isWideTabActive ? wideTabOrg.name : org.name
    document.title = `${subject} — Organization hierarchy`
  }, [org.name, isWideTabActive, wideTabOrg])

  return (
    <ThemeProvider>
      <PageContainer>
        <TopBarRow>
          <TopBar currentProduct={currentProduct} onProductChange={setCurrentProduct} />
          <TabBarOverlay>
            {/* Two tabs at most, and only in V3.75 — a View all opens the second.
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
          <VersionOverlay>
            <VersionFieldWrapper>
              <Field>
                <Combobox
                  isCompact
                  isEditable={false}
                  inputValue={versionLabel}
                  selectionValue={version}
                  onChange={({ selectionValue }) => {
                    if (selectionValue) setVersion(selectionValue)
                  }}
                >
                  {VERSIONS.map((option) => (
                    <Option key={option.id} value={option.id} label={option.label}>
                      {option.label}
                    </Option>
                  ))}
                </Combobox>
              </Field>
            </VersionFieldWrapper>
          </VersionOverlay>
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
              /* V3.75's full page for one department: that organization and all of
                 its children, nothing above or beside it. Not a second copy of the
                 hierarchy tab — the point of View all is that the 50-row cap is
                 lifted, so this page shows the lot. */
              <DepartmentPage orgId={wideTabOrgId} onSelectOrganization={setOrgId} />
            ) : (
              <OrganizationProfile
                orgId={orgId}
                onSelectOrganization={setOrgId}
                version={version}
                onOpenInNewTab={version === 'v3-75' ? openWideTab : undefined}
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
          // 32px from the left edge, over the nav rail rather than clear of it.
          // The rail's own icons stop well above the bottom of the window, so the
          // space is free — and measuring the rail put the button 80px in, far
          // enough that it read as belonging to the page content.
          toggleLeft={32}
          context={{ version, orgId, wideTabOrgId, activeTabId }}
          onRestoreContext={(saved) => {
            if (saved.version) setVersion(saved.version)
            if (saved.orgId) setOrgId(saved.orgId)
            /* V3.75's second tab is part of the view a pin was made in: the same
               screen position holds a department list on one tab and the profile on
               the other. Restored after the version, because switching version
               closes the extra tab. */
            setWideTabOrgId(saved.wideTabOrgId ?? null)
            setActiveTabId(saved.activeTabId ?? 'profile')
          }}
        />
      </PageContainer>
    </ThemeProvider>
  )
}
