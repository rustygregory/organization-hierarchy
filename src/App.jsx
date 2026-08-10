import { useEffect, useState } from 'react'
import { ThemeProvider } from './flora-theme/elements/ThemeProvider'
import { TopBar, MainNav } from 'zendesk-globalnav-template'
import { Combobox, Field, Option } from '@zendeskgarden/react-dropdowns'
import styled from 'styled-components'
import OrganizationProfile from './components/OrganizationProfile'
import TabBar from './components/TabBar'
import { getOrganization } from './data/hierarchy'
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
  { id: 'v4', label: 'V4 100 end users' },
]

export default function App() {
  // Product switcher stays pinned to Support for this prototype.
  const [currentProduct, setCurrentProduct] = useState('support')
  const [activeNavItem, setActiveNavItem] = useState(2)
  const [isSubnavExpanded, setIsSubnavExpanded] = useState(false)

  // V1 MVP shows organizations only; V2 adds the end users inside them; V3 is
  // V1 without row dividers, with the child count moved beside each name; V4 is
  // V2 against a department of 100 end users.
  const [version, setVersion] = useState('v1')
  const versionLabel = VERSIONS.find((option) => option.id === version)?.label

  // Which organization's profile is open. Lives here because the tab strip and
  // the profile header both name it, and the hierarchy tab re-points it.
  const [orgId, setOrgId] = useState(INITIAL_ORG_ID)
  const org = getOrganization(orgId)

  // Browser tab follows the organization, the way a real Support tab does.
  useEffect(() => {
    document.title = `${org.name} — Organization hierarchy`
  }, [org.name])

  return (
    <ThemeProvider>
      <PageContainer>
        <TopBarRow>
          <TopBar currentProduct={currentProduct} onProductChange={setCurrentProduct} />
          <TabBarOverlay>
            <TabBar title={org.name} />
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
            <OrganizationProfile
              orgId={orgId}
              onSelectOrganization={setOrgId}
              version={version}
            />
          </MainContent>
        </ContentRow>
      </PageContainer>
    </ThemeProvider>
  )
}
