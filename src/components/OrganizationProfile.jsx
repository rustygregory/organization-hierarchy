import { useState } from 'react'
import styled from 'styled-components'
import { Avatar } from '@zendeskgarden/react-avatars'
import { Button } from '@zendeskgarden/react-buttons'
import { XXL } from '@zendeskgarden/react-typography'
import OrganizationHierarchyTab from './OrganizationHierarchyTab'
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

const PropertiesPanel = styled.aside`
  width: 280px;
  min-width: 280px;
  padding: 16px;
  overflow-y: auto;
`

/* The org profile groups its editable fields inside a bordered card, unlike the
   user profile's bare list. Timestamps sit outside it, below. */
const PropertiesCard = styled.div`
  border: 1px solid #eae9e8;
  border-radius: 8px;
  padding: 12px 12px 4px;
`

const PropertyGroup = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
`

const PropertyLabel = styled.div`
  width: 68px;
  min-width: 68px;
  font-size: 14px;
  color: #646864;
  text-align: right;
  padding-top: 3px;
`

const PropertyValue = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: #2f3130;
  word-break: break-word;
  padding-top: 3px;
`

/* Fields the real page renders as controls: a text input for Tags, selects for
   Group and Users. Drawn rather than wired — this prototype is about the
   hierarchy tab, and live controls here would invite edits that go nowhere. */
const FauxInput = styled.div`
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  min-height: 28px;
  padding: 4px 8px;
  border: 1px solid #dcdcda;
  border-radius: 4px;
  font-size: 14px;
  color: #2f3130;
`

const FauxSelect = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-sizing: border-box;
  min-height: 28px;
  padding: 4px 0;
  font-size: 14px;
  color: #2f3130;
`

const SelectCaret = styled.span`
  color: #646864;
  flex-shrink: 0;
  display: inline-flex;
`

const Timestamps = styled.div`
  margin-top: 16px;
  padding: 0 4px;
`

const TimestampRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 14px;
`

const TimestampLabel = styled.span`
  color: #646864;
`

const Muted = styled.span`
  color: #999b97;
`

const MainSection = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
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

/** `Bramblewick University` → `bramblewick.edu`-style support domain. */
const domainFor = (org) =>
  `${org.name.toLowerCase().replace(/\s+university$/, '').replace(/[^a-z0-9]+/g, '')}.edu`

export default function OrganizationProfile({ orgId, onSelectOrganization, version = 'v1' }) {
  const [activeTab, setActiveTab] = useState('hierarchy')

  const org = getOrganization(orgId)
  // The Users tab counts direct members only — the reach below this node is what
  // the hierarchy tab is for. V4 swaps in the 100-user roster, and the tab count
  // has to move with it or the page contradicts its own tree.
  const directUserCount = getPeopleIn(orgId, { atScale: version === 'v4' }).length

  const tabs = [
    { id: 'tickets', label: 'Tickets (0)' },
    { id: 'users', label: `Users (${directUserCount})` },
    { id: 'related', label: 'Related' },
    { id: 'hierarchy', label: 'Organization hierarchy' },
  ]

  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label

  return (
    <Container>
      <PropertiesPanel>
        <PropertiesCard>
          <PropertyGroup>
            <PropertyLabel>Tags</PropertyLabel>
            <FauxInput>
              <Muted>—</Muted>
            </FauxInput>
          </PropertyGroup>
          <PropertyGroup>
            <PropertyLabel>Domains</PropertyLabel>
            <PropertyValue>{domainFor(org)}</PropertyValue>
          </PropertyGroup>
          <PropertyGroup>
            <PropertyLabel>Group</PropertyLabel>
            <FauxSelect>
              <Muted>—</Muted>
              <SelectCaret>
                <CaretIcon />
              </SelectCaret>
            </FauxSelect>
          </PropertyGroup>
          <PropertyGroup>
            <PropertyLabel>Users</PropertyLabel>
            {/* The third access option this feature proposes — the one that
                cascades ticket permissions down the tree. */}
            <FauxSelect>
              <span>Can view tickets in this org and below</span>
              <SelectCaret>
                <CaretIcon />
              </SelectCaret>
            </FauxSelect>
          </PropertyGroup>
          <PropertyGroup>
            <PropertyLabel>Details</PropertyLabel>
            <PropertyValue>
              <Muted>—</Muted>
            </PropertyValue>
          </PropertyGroup>
          <PropertyGroup>
            <PropertyLabel>Notes</PropertyLabel>
            <PropertyValue>
              <Muted>—</Muted>
            </PropertyValue>
          </PropertyGroup>
        </PropertiesCard>

        <Timestamps>
          <TimestampRow>
            <TimestampLabel>Created</TimestampLabel>
            <span>1 minute ago</span>
          </TimestampRow>
          <TimestampRow>
            <TimestampLabel>Updated</TimestampLabel>
            <span>1 minute ago</span>
          </TimestampRow>
        </Timestamps>
      </PropertiesPanel>

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
