import styled from 'styled-components'

/* Support's tab strip, overlaid on the global TopBar. This prototype only ever
   shows one tab — the profile being viewed — so it is not closeable. */

const Bar = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  gap: 8px;
`

const TabItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 7px 12px;
  box-sizing: border-box;
  border: 1px solid #2f3130;
  border-radius: 8px;
  background: #2f3130;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
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

export default function TabBar({ title }) {
  return (
    <Bar>
      <TabItem>
        <TabIcon>
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="8" cy="5.5" r="2.5" />
            <path d="M3 13c0-2.2 2.2-3.5 5-3.5s5 1.3 5 3.5" strokeLinecap="round" />
          </svg>
        </TabIcon>
        <span>{title}</span>
      </TabItem>
      <AddTab type="button" aria-label="Add tab">
        +
      </AddTab>
    </Bar>
  )
}
