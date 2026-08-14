import styled from 'styled-components'

/* The organization's properties rail — the left column of Support's profile.
 *
 * Shared between the organization profile and V3.75's full-page department view,
 * which both show it for whichever organization they're about. It was inlined in
 * OrganizationProfile until the department page needed the same rail; two copies of
 * a list of fields is exactly the kind of thing that drifts a field at a time.
 *
 * Every control here is drawn rather than wired. This prototype is about the
 * hierarchy tab, and live inputs would invite edits that go nowhere. */

const Panel = styled.aside`
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
   Group and Users. */
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
  `${org.name
    .toLowerCase()
    .replace(/\s+university$/, '')
    .replace(/[^a-z0-9]+/g, '')}.edu`

export default function OrganizationProperties({ org }) {
  return (
    <Panel>
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
    </Panel>
  )
}
