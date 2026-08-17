import { useState } from 'react'
import styled from 'styled-components'
import { Avatar } from '@zendeskgarden/react-avatars'
import { Button } from '@zendeskgarden/react-buttons'
import { XXL } from '@zendeskgarden/react-typography'
import OrganizationHierarchyTab from './OrganizationHierarchyTab'
import OrganizationProperties from './OrganizationProperties'
import { getOrganization, getPeopleIn } from '../data/hierarchy'

/* Support's organization profile, the page you land on after clicking an
   organization from a user's record. Same shell as the user profile it replaces —
   properties rail, header, tab strip — but the subject is the organization, so
   the properties are org fields and the primary action is the Actions menu
   rather than New ticket. */

const Container = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

/* The scroll container for the whole work area: the organization's name, the tab
   strip, the search field and the tree all scroll together. It used to be the tree
   alone, with the header and tabs pinned above it — which reads as a pane inside a
   page rather than as a page, and puts two scroll regions on screen (this and the
   properties rail) for a reader to work out which one their wheel is over.
   The rail keeps its own scroll: it's a separate column of a fixed width, and in
   Support it stays put while the record's content moves. */
const MainSection = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow-y: auto;
`

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 32px 0;
  flex-shrink: 0;
`

const NameBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-right: auto;
  min-width: 0;
`

const TabList = styled.div`
  display: flex;
  gap: 4px;
  padding: 0 32px;
  border-bottom: 1px solid #eae9e8;
  margin-top: 16px;
  flex-shrink: 0;
`

const TabButton = styled.button`
  position: relative;
  border: none;
  background: transparent;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 14px;
  font-weight: ${(props) => (props.$active ? 600 : 400)};
  color: ${(props) => (props.$active ? '#2f3130' : '#646864')};
  cursor: pointer;

  &::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -1px;
    height: 2px;
    background: ${(props) => (props.$active ? '#406cc4' : 'transparent')};
  }

  &:hover {
    color: #2f3130;
  }
`

const Placeholder = styled.div`
  margin: 32px;
  padding: 32px;
  border: 1px dashed #dcdcda;
  border-radius: 8px;
  background: #f7f7f7;
  color: #646864;
  font-size: 14px;
  text-align: center;
`

/* Garden's `building-stroke`, inlined at 26px — the org counterpart to the
   person glyph the user profile used. */
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

export default function OrganizationProfile({
  orgId,
  onSelectOrganization,
  version = 'v1',
  // V3 only — see the View all row in OrganizationHierarchyTab.
  onOpenInNewTab,
}) {
  const [activeTab, setActiveTab] = useState('hierarchy')

  const org = getOrganization(orgId)
  // The Users tab counts direct members only — the reach below this node is what
  // the hierarchy tab is for. V4 scales the child organizations rather than the
  // people, so this count is the same in every version.
  const directUserCount = getPeopleIn(orgId).length

  const tabs = [
    { id: 'tickets', label: 'Tickets (0)' },
    { id: 'users', label: `Users (${directUserCount})` },
    { id: 'related', label: 'Related' },
    { id: 'hierarchy', label: 'Organization hierarchy' },
  ]

  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label

  return (
    <Container>
      <OrganizationProperties org={org} />

      <MainSection>
        <ProfileHeader>
          <Avatar isSystem size="large" backgroundColor="#646864" foregroundColor="#ffffff">
            <OrganizationIcon />
          </Avatar>
          <NameBlock>
            <XXL tag="h1" style={{ color: '#2f3130' }}>
              {org.name}
            </XXL>
          </NameBlock>
          <Button>
            Actions
            <span style={{ marginLeft: 8, display: 'inline-flex', verticalAlign: 'middle' }}>
              <CaretIcon />
            </span>
          </Button>
        </ProfileHeader>

        <TabList>
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              $active={tab.id === activeTab}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </TabList>

        {activeTab === 'hierarchy' ? (
          /* Clicking an organization in the tree re-centres this whole page on
             it — the header, properties, and tab counts follow, because in
             Support that click opens that organization's own profile. */
          <OrganizationHierarchyTab
            selectedId={orgId}
            onSelectOrganization={onSelectOrganization}
            version={version}
            onOpenInNewTab={onOpenInNewTab}
          />
        ) : (
          <Placeholder>
            {activeLabel} is out of scope for this prototype — the exploration
            lives in the Organization hierarchy tab.
          </Placeholder>
        )}
      </MainSection>
    </Container>
  )
}
