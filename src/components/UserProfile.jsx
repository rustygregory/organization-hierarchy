import { useState } from 'react'
import styled from 'styled-components'
import { Avatar } from '@zendeskgarden/react-avatars'
import { Button } from '@zendeskgarden/react-buttons'
import { XXL } from '@zendeskgarden/react-typography'
import OrganizationHierarchyTab from './OrganizationHierarchyTab'
import { getOrganization } from '../data/hierarchy'

const Container = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`

const PropertiesPanel = styled.aside`
  width: 280px;
  min-width: 280px;
  border-right: 1px solid #eae9e8;
  padding: 20px 16px;
  overflow-y: auto;
`

const PropertyGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
`

const PropertyLabel = styled.div`
  width: 88px;
  min-width: 88px;
  font-size: 14px;
  color: #646864;
  text-align: right;
  padding-top: 1px;
`

const PropertyValue = styled.div`
  font-size: 14px;
  color: #2f3130;
  word-break: break-word;
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

/* Garden's `user-solo-stroke`, inlined at 26px so it fills the large avatar the
   way the real profile header does. Generic on purpose — the prototype switches
   personas, and initials made each one look like a different account. */
const PersonIcon = () => (
  <svg width="26" height="26" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="8" cy="5" r="3.5" />
      <path strokeLinecap="round" d="M2.5 15.5c.3-2.8 2.6-5 5.5-5s5.2 2.2 5.5 5" />
    </g>
  </svg>
)

export default function UserProfile({ persona, version = 'v1' }) {
  const [activeTab, setActiveTab] = useState('hierarchy')

  // The one organization this person is attached to. Under today's flat model
  // they would have to be added to every org below it as well.
  const attachedOrg = getOrganization(persona.attachedOrgId)

  const tabs = [
    { id: 'tickets', label: `Tickets (${persona.ticketCount})` },
    { id: 'help-center', label: 'Help center (0)' },
    { id: 'related', label: 'Related' },
    { id: 'security', label: 'Security settings' },
    { id: 'hierarchy', label: 'Organization hierarchy' },
  ]

  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.label

  return (
    <Container>
      <PropertiesPanel>
        <PropertyGroup>
          <PropertyLabel>User type</PropertyLabel>
          <PropertyValue>{persona.userType}</PropertyValue>
        </PropertyGroup>
        <PropertyGroup>
          <PropertyLabel>Access</PropertyLabel>
          <PropertyValue>{persona.access}</PropertyValue>
        </PropertyGroup>
        <PropertyGroup>
          <PropertyLabel>Primary email</PropertyLabel>
          <PropertyValue>{persona.email}</PropertyValue>
        </PropertyGroup>
        <PropertyGroup>
          <PropertyLabel>Tags</PropertyLabel>
          <PropertyValue>
            <Muted>—</Muted>
          </PropertyValue>
        </PropertyGroup>
        <PropertyGroup>
          <PropertyLabel>Org.</PropertyLabel>
          <PropertyValue>{attachedOrg?.name}</PropertyValue>
        </PropertyGroup>
        <PropertyGroup>
          <PropertyLabel>User segments</PropertyLabel>
          <PropertyValue>
            <Muted>—</Muted>
          </PropertyValue>
        </PropertyGroup>
        <PropertyGroup>
          <PropertyLabel>Language</PropertyLabel>
          <PropertyValue>{persona.language}</PropertyValue>
        </PropertyGroup>
        <PropertyGroup>
          <PropertyLabel>Time zone</PropertyLabel>
          <PropertyValue>{persona.timeZone}</PropertyValue>
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
      </PropertiesPanel>

      <MainSection>
        <ProfileHeader>
          <Avatar size="large" backgroundColor="#646864" foregroundColor="#ffffff">
            <PersonIcon />
          </Avatar>
          <NameBlock>
            <XXL tag="h1" style={{ color: '#2f3130' }}>
              {persona.name}
            </XXL>
          </NameBlock>
          <Button isPrimary>New ticket</Button>
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
          <OrganizationHierarchyTab persona={persona} version={version} />
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
