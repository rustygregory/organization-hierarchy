import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

/* Reviewer chrome: a compact dark strip above the product prototype.
   Keeps identity (title + meta) and controls (version switcher, comment toggle)
   visible without interfering with the design being reviewed. */

const Bar = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  height: 48px;
  padding: 0 16px;
  background-color: #1a1f24;
  font-family: inherit;
  user-select: none;
`

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
`

const Title = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Pipe = styled.span`
  flex-shrink: 0;
  color: #363d44;
`

const Meta = styled.span`
  font-size: 12px;
  color: #7c8590;
  white-space: nowrap;
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

const DropdownWrapper = styled.div`
  position: relative;
`

const TriggerButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid #363d44;
  border-radius: 4px;
  background: transparent;
  color: #c8cdd0;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background-color: #262c32;
    border-color: #555e66;
    color: #ffffff;
  }
`

const CaretIcon = () => (
  <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor" aria-hidden="true">
    <path d="M0 0 L4 5 L8 0 Z" />
  </svg>
)

/* Grows to fit its longest item — items are white-space: nowrap so there is no
   risk of wrapping. No min-width needed. */
const DropMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 9999;
  padding: 4px 0;
  border: 1px solid #363d44;
  border-radius: 4px;
  background-color: #262c32;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
`

const DropItem = styled.button`
  display: block;
  width: 100%;
  padding: 6px 14px;
  border: 0;
  background: ${(props) => (props.$selected ? '#323b44' : 'transparent')};
  color: ${(props) => (props.$selected ? '#ffffff' : '#c8cdd0')};
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background-color: #323b44;
    color: #ffffff;
  }
`

const ArchiveDivider = styled.div`
  margin: 4px 0;
  border-top: 1px solid #363d44;
`

const ArchiveLabel = styled.div`
  padding: 4px 14px 2px;
  color: #555e66;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
`

/* Matches the TriggerButton geometry so the two controls read as a set. Active
   state matches CommentLayer's existing blue to keep the visual language
   consistent across bar and toggle. */
const CommentButton = styled.button`
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border: 1px solid ${(props) => (props.$active ? '#4d7fd4' : '#363d44')};
  border-radius: 4px;
  background-color: ${(props) => (props.$active ? '#406cc4' : 'transparent')};
  color: ${(props) => (props.$active ? '#ffffff' : '#c8cdd0')};
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background-color: ${(props) => (props.$active ? '#284173' : '#262c32')};
    border-color: ${(props) => (props.$active ? '#4d7fd4' : '#555e66')};
    color: #ffffff;
  }
`

export default function PrototypeBar({
  title,
  meta,
  versions,
  versionId,
  onVersionChange,
  // Comment controls. Omit both to hide the comment button entirely.
  commentIsOn,
  onCommentToggle,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const selectedLabel = versions?.find((v) => v.id === versionId)?.label

  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointerDown = (e) => {
      if (!dropdownRef.current?.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <Bar>
      <Identity>
        <Title>{title}</Title>
        {meta && (
          <>
            <Pipe aria-hidden="true">|</Pipe>
            <Meta>{meta}</Meta>
          </>
        )}
      </Identity>
      <Controls>
        {versions && versions.length > 0 && (
          <DropdownWrapper ref={dropdownRef}>
            <TriggerButton
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
            >
              {selectedLabel ?? 'Select version'}
              <CaretIcon />
            </TriggerButton>
            {menuOpen && (
              <DropMenu role="listbox">
                {versions.filter((v) => !v.archived).map((version) => (
                  <DropItem
                    key={version.id}
                    type="button"
                    role="option"
                    aria-selected={version.id === versionId}
                    $selected={version.id === versionId}
                    onClick={() => {
                      onVersionChange(version.id)
                      setMenuOpen(false)
                    }}
                  >
                    {version.label}
                  </DropItem>
                ))}
                {versions.some((v) => v.archived) && (
                  <>
                    <ArchiveDivider />
                    <ArchiveLabel>Archive</ArchiveLabel>
                    {versions.filter((v) => v.archived).map((version) => (
                      <DropItem
                        key={version.id}
                        type="button"
                        role="option"
                        aria-selected={version.id === versionId}
                        $selected={version.id === versionId}
                        onClick={() => {
                          onVersionChange(version.id)
                          setMenuOpen(false)
                        }}
                      >
                        {version.label}
                      </DropItem>
                    ))}
                  </>
                )}
              </DropMenu>
            )}
          </DropdownWrapper>
        )}
        {onCommentToggle !== undefined && (
          <CommentButton
            type="button"
            $active={commentIsOn}
            onClick={onCommentToggle}
            aria-pressed={commentIsOn}
          >
            {commentIsOn ? 'Exit comment mode' : 'Comment'}
          </CommentButton>
        )}
      </Controls>
    </Bar>
  )
}
