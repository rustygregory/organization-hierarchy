import { useState } from 'react'
import styled from 'styled-components'
import { Avatar } from '@zendeskgarden/react-avatars'
import { Button } from '@zendeskgarden/react-buttons'
import { XL } from '@zendeskgarden/react-typography'
import { Tag } from '@zendeskgarden/react-tags'
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
  font-size: 12px;
  color: #646864;
  text-align: right;
  padding-top: 1px;
`

const PropertyValue = styled.div`
  font-size: 13px;
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

const RoleLine = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #646864;
  font-size: 13px;
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
  font-size: 13px;
  text-align: center;
`

const initials = (name) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')

export default function UserProfile({ persona }) {
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
          <Avatar size="large">
            <Avatar.Text>{initials(persona.name)}</Avatar.Text>
          </Avatar>
          <NameBlock>
            <XL tag="h1" style={{ fontWeight: 600, color: '#2f3130' }}>
              {persona.name}
            </XL>
            <RoleLine>
              <span>{persona.role}</span>
              <Tag hue="grey">{persona.userType}</Tag>
            </RoleLine>
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
          <OrganizationHierarchyTab persona={persona} />
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
