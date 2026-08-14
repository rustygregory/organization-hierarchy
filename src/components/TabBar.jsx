import styled from 'styled-components'

/* Support's tab strip, overlaid on the global TopBar. Usually one tab — the
   organization profile being viewed — but V3.75's *View all* opens a second one for
   a single department, so the strip takes a list and marks which is in front. Only
   an opened tab is closeable; the profile tab is the prototype itself. */

const Bar = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  gap: 8px;
`

/* The inactive tab reverses the active one's fill: Support draws the tab in front
   as a solid dark chip and the others as outlines on the bar behind it.
 *
 * Both fills are opaque, including the "outline" one. The strip is overlaid on the
 * global TopBar, which has its own Add button underneath — a transparent tab lets
 * that label read straight through the org name. */
const TabItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 7px 12px;
  box-sizing: border-box;
  border: 1px solid ${(props) => (props.$active ? '#2f3130' : '#d8dcde')};
  border-radius: 8px;
  background: ${(props) => (props.$active ? '#2f3130' : '#ffffff')};
  color: ${(props) => (props.$active ? '#ffffff' : '#2f3130')};
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: ${(props) => (props.$active ? 'default' : 'pointer')};
  max-width: 260px;

  &:hover {
    background: ${(props) => (props.$active ? '#2f3130' : '#eae9e8')};
  }
`

const TabLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* Sits inside the tab, so it inherits the tab's colour on both fills. */
const CloseTab = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin: -2px -4px -2px 0;
  border-radius: 3px;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
  opacity: 0.75;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.18);
  }
`

const TabIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const AddTab = styled.button`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b8e89;
  font-size: 20px;

  &:hover {
    background: #eae9e8;
    color: #2f3130;
  }
`

/* An organization, not a person — the tab's subject is the org whose page is open. */
const OrgTabIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    aria-hidden="true"
  >
    <path d="M3 14.5V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v12.5" />
    <path d="M1.5 14.5h13" strokeLinecap="round" />
    <path d="M5.75 4h1.5m1.5 0h1.5m-4.5 3h1.5m1.5 0h1.5" strokeLinecap="round" />
    <path d="M6.75 14.5v-2.5h2.5v2.5" />
  </svg>
)

export default function TabBar({
  // A single `title` is still accepted, so the versions that only ever show one tab
  // are unchanged at their call sites.
  title,
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}) {
  const items = tabs ?? [{ id: 'profile', title }]
  const active = activeTabId ?? items[0]?.id

  return (
    <Bar>
      {items.map((tab) => {
        const isActive = tab.id === active
        return (
          <TabItem
            key={tab.id}
            type="button"
            $active={isActive}
            onClick={() => !isActive && onSelectTab?.(tab.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <TabIcon>
              <OrgTabIcon />
            </TabIcon>
            <TabLabel title={tab.title}>{tab.title}</TabLabel>
            {tab.isCloseable && (
              /* A span rather than a nested button — a button inside a button is
                 invalid, and the outer one is the tab. The click is stopped from
                 reaching the tab so closing doesn't also select. */
              <CloseTab
                role="button"
                tabIndex={0}
                aria-label={`Close ${tab.title}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onCloseTab?.(tab.id)
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  event.stopPropagation()
                  onCloseTab?.(tab.id)
                }}
              >
                ×
              </CloseTab>
            )}
          </TabItem>
        )
      })}
      <AddTab type="button" aria-label="Add tab">
        +
      </AddTab>
    </Bar>
  )
}
