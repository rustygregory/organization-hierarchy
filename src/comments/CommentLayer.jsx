import { useCallback, useEffect, useMemo, useState } from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import {
  describeAnchor,
  getRoot,
  pinPositionFor,
  resolveAnchor,
  sameContext,
} from './anchor'
import {
  addComment,
  deleteComment,
  getAuthor,
  isShared,
  loadComments,
  setAuthor,
  setResolved,
} from './store'

/**
 * Comment mode: a Figma-style annotation layer over the prototype.
 *
 * Off by default and entirely outside the prototype's own flow — when it's off
 * this renders one button and nothing else intercepts a click, so the prototype
 * behaves exactly as it did before. That separation is the point: a reviewer
 * should be able to use the design normally, then switch into commenting, rather
 * than having every click ambiguous between "use it" and "annotate it".
 *
 * The host supplies two props and gets no other coupling:
 * - `context` — a flat object describing the current view. Whatever state has to
 *   be restored for a pin to point at the right thing: a version, a selected id,
 *   a route, a tab.
 * - `onRestoreContext` — called with a stored context so the host can put the app
 *   back into the state a comment was made in
 *
 * Neither this file nor anchor.js interprets what's in `context` — it is compared
 * for equality and handed back verbatim. That is what makes the whole directory
 * droppable into another prototype unedited.
 */

/* Layer sits above the app but below nothing else. z-index chosen to clear
   Garden's own overlays (its menus sit in the low thousands) without racing
   them. */
const Z = 9000

/* Bottom-left rather than bottom-right, which is where a floating action button
   conventionally sits. Two reasons it moved: the sidebar opens from the right and
   slides the app out from under a right-hand button, so the toggle ended up
   sitting on top of the panel it had just opened; and the right-hand end of a page
   is where the design's own content runs to, while the left edge is usually nav
   chrome the review is not about.

   `left` is supplied at render from the measured nav rail (see leftNavWidth) so the
   button clears it instead of covering a nav item. */
const ToggleButton = styled.button`
  position: fixed;
  bottom: 24px;
  z-index: ${Z + 2};
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid ${(props) => (props.$active ? '#284173' : '#dcdcda')};
  border-radius: 20px;
  background-color: ${(props) => (props.$active ? '#406cc4' : '#ffffff')};
  color: ${(props) => (props.$active ? '#ffffff' : '#2f3130')};
  box-shadow: 0 2px 8px rgba(10, 13, 14, 0.16);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background-color: ${(props) => (props.$active ? '#284173' : '#f7f7f7')};
  }
`

/* Catches clicks over the design while comment mode is on — which is what makes
   "click any part of it to comment" work without every element needing its own
   handler.

   Deliberately covers only the commentable root's box rather than the whole
   viewport. Covering everything was the first attempt and it made comment mode a
   dead end: a version switcher or a nav sitting outside the design area became
   unreachable, so a reviewer could only comment on whichever view they happened
   to be on when they entered the mode. Chrome stays live; only the design is
   pinnable.

   Inside the design area, a plain click drops a pin and a modifier-click
   (⌘/Ctrl/Alt) passes through to the prototype, so you can still navigate without
   leaving the mode. */
const ClickCatcher = styled.div`
  position: fixed;
  z-index: ${Z};
  cursor: crosshair;
  /* No background at all: a tint over the design would change the colours being
     reviewed, which is the one thing a design review can't tolerate. */
  background-color: transparent;
`

const Pin = styled.button`
  position: fixed;
  z-index: ${Z + 1};
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  /* Figma's teardrop: round except for the corner that points at the anchor. */
  border: 2px solid #ffffff;
  border-radius: 50% 50% 50% 2px;
  background-color: ${(props) => (props.$resolved ? '#999b97' : '#406cc4')};
  box-shadow: 0 2px 6px rgba(10, 13, 14, 0.28);
  color: #ffffff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  /* The anchor point is the pin's bottom-left corner, so the pin sits above and
     right of what it points at rather than covering it. */
  transform: translate(0, -100%);
  opacity: ${(props) => (props.$dimmed ? 0.45 : 1)};

  &:hover {
    background-color: ${(props) => (props.$resolved ? '#646864' : '#284173')};
  }
`

/* A pin whose anchor can't be found in the current view. Rendered in the
   sidebar rather than on the page — see the note on `orphaned` below. */
const Thread = styled.div`
  position: fixed;
  z-index: ${Z + 2};
  box-sizing: border-box;
  width: 300px;
  padding: 12px;
  border-radius: 8px;
  background-color: #17494d;
  box-shadow: 0 6px 20px rgba(10, 13, 14, 0.32);
  color: #ffffff;
  font-size: 14px;
`

const ThreadHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #c2f0e0;
  font-size: 12px;
`

const ThreadActions = styled.div`
  display: flex;
  gap: 4px;
`

const IconButton = styled.button`
  box-sizing: border-box;
  padding: 2px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #c2f0e0;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.14);
    color: #ffffff;
  }
`

const Message = styled.div`
  margin-bottom: 10px;

  & + & {
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.16);
  }
`

const Byline = styled.div`
  margin-bottom: 2px;
  color: #c2f0e0;
  font-size: 12px;
`

const Body = styled.div`
  white-space: pre-wrap;
  word-break: break-word;
`

const Composer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const TextArea = styled.textarea`
  box-sizing: border-box;
  width: 100%;
  min-height: 60px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
`

const NameInput = styled.input`
  box-sizing: border-box;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
`

const SubmitRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const Submit = styled.button`
  box-sizing: border-box;
  min-height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  background-color: #406cc4;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const AnchorNote = styled.div`
  margin-bottom: 8px;
  color: #c2f0e0;
  font-size: 12px;
  word-break: break-word;
`

/* Squeezes the app while the sidebar is open, rather than letting the sidebar
   cover it.
   The panel is fixed-position, so by default it sits on top of the rightmost 320px
   of the design — typically the right-hand columns of a table, which is often
   exactly what the comment is about. Narrowing #root instead means the design
   reflows into the space it has and stays wholly visible.
   Applied to #root and not to the sidebar's own layout because the sidebar has to
   stay fixed: it must not scroll away with the content.
   If the host app doesn't mount into #root, change both selectors here. */
const SqueezeApp = createGlobalStyle`
  #root {
    width: calc(100% - 320px);
    transition: width 120ms ease-out;
  }

  /* Neutralises viewport-relative widths inside the app. A page container set to
     width: 100vw ignores a narrower #root entirely and keeps sliding under the
     sidebar — max-width re-anchors it to its parent without the app needing to
     know the comment layer exists. */
  #root > * {
    max-width: 100%;
  }
`

const Sidebar = styled.aside`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: ${Z + 3};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 320px;
  border-left: 1px solid #dcdcda;
  background-color: #ffffff;
  box-shadow: -4px 0 16px rgba(10, 13, 14, 0.12);
`

const SidebarHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  padding: 16px;
  border-bottom: 1px solid #eae9e8;
  font-size: 14px;
  font-weight: 600;
`

const SidebarList = styled.div`
  flex: 1;
  box-sizing: border-box;
  padding: 8px;
  overflow-y: auto;
`

const SidebarItem = styled.button`
  box-sizing: border-box;
  display: block;
  width: 100%;
  margin-bottom: 4px;
  padding: 10px;
  border: 0;
  border-left: 2px solid ${(props) => (props.$resolved ? '#dcdcda' : '#406cc4')};
  border-radius: 0 4px 4px 0;
  background-color: ${(props) => (props.$active ? '#f3f6fb' : 'transparent')};
  color: #2f3130;
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background-color: #f7f7f7;
  }
`

const ItemMeta = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
  color: #646864;
  font-size: 12px;
`

const ItemBody = styled.div`
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`

const ItemAnchor = styled.div`
  margin-top: 4px;
  overflow: hidden;
  color: #646864;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Empty = styled.div`
  padding: 16px;
  color: #646864;
  font-size: 14px;
`

/* Three tones, because they say three different kinds of thing and painting them
   all yellow made a standing instruction ("click the design to comment") look
   like something had gone wrong:
   - error: a Supabase failure, red.
   - warn:  comments are only in this browser, yellow. Worth noticing.
   - info:  how to use the mode, grey. Not a problem. */
const TONES = {
  error: { background: '#fff0f1', color: '#2f3130' },
  warn: { background: '#fff7d6', color: '#2f3130' },
  info: { background: '#f7f7f7', color: '#646864' },
}

const Banner = styled.div`
  box-sizing: border-box;
  padding: 8px 16px;
  background-color: ${(props) => (TONES[props.$tone] || TONES.info).background};
  color: ${(props) => (TONES[props.$tone] || TONES.info).color};
  font-size: 12px;
`

/* How far in from the left edge the toggle sits, measured rather than assumed.
 *
 * The button lives bottom-left, and most of these prototypes put a global nav rail
 * there — 56px in the globalnav template, wider in an expanded nav. Hard-coding
 * that would make the button cover a nav item in any prototype whose rail differs,
 * and this file is meant to drop in unedited.
 *
 * So: find a `nav` touching the left edge and clear its width. Nothing else is
 * consulted — the commentable root would be the obvious candidate but it often sits
 * behind a properties or filter panel, which would push the button 300px in.
 *
 * Capped in case a nav turns out to be the full width of the page.
 *
 * A host that wants the button somewhere specific passes `toggleLeft` and none of
 * this runs. Measuring is the default because it's the safe one for a drop-in; an
 * explicit number is better when the host knows its own layout. */
const TOGGLE_GUTTER = 24
const TOGGLE_MAX_LEFT = 200

const toggleLeftOffset = () => {
  const rail = [...document.querySelectorAll('nav')]
    .map((el) => el.getBoundingClientRect())
    .find((box) => box.left <= 0 && box.width > 0)
  return Math.min((rail?.width || 0) + TOGGLE_GUTTER, TOGGLE_MAX_LEFT)
}

/* Relative time, because an absolute timestamp on a design comment is noise —
   "2 months ago" is what Figma shows and what a reader actually wants. */
const relativeTime = (iso, now) => {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 31) return `${days}d ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

export default function CommentLayer({
  context,
  onRestoreContext,
  // Pixels from the left edge for the Comment toggle. Omit to measure the host's nav
  // rail instead — see toggleLeftOffset.
  toggleLeft: toggleLeftProp,
}) {
  const [isOn, setIsOn] = useState(false)
  const [comments, setComments] = useState([])
  const [error, setError] = useState(null)
  const [author, setAuthorState] = useState(getAuthor)
  /* Whether to show the name field, decided once rather than derived from
     `author` being empty.
     Deriving it was a real bug: the field unmounted the moment the first
     character made `author` truthy, so a name typed into it was stored as "R"
     and the rest of the keystrokes went nowhere. Whether we need to *ask* for a
     name is a fact about this session, not about the current value of the
     field. */
  const [needsName, setNeedsName] = useState(() => !getAuthor())
  // A pin being placed but not yet saved: an anchor with no comment behind it.
  const [draft, setDraft] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [draftBody, setDraftBody] = useState('')
  const [replyBody, setReplyBody] = useState('')
  /* Recomputed on scroll, resize and re-render to reposition pins. Held as a
     counter rather than as positions so the positions themselves stay derived
     from the DOM — the anchored element is the source of truth, not a cache that
     can go stale. */
  const [tick, setTick] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  /* The toggle's distance from the left edge. Held in state rather than measured
     inline because the nav rail is 0px wide on the first paint — the host hasn't
     laid out yet — and a button that starts at the far left and jumps right is
     worse than one that arrives correct a frame late. */
  const [measuredLeft, setMeasuredLeft] = useState(TOGGLE_GUTTER)
  const toggleLeft = toggleLeftProp ?? measuredLeft

  useEffect(() => {
    let cancelled = false
    loadComments()
      .then((rows) => {
        if (!cancelled) setComments(rows)
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* Pins are positioned from live element geometry, so anything that can move an
     element has to trigger a recompute: scrolling, resizing the window, and the
     app re-rendering after a state change.

     Note the capture-phase scroll listener. In an app laid out as
     `height: 100vh; overflow: hidden` — which most of these prototypes are — the
     document doesn't scroll at all; some inner container does, often the comment
     root itself. A plain window scroll listener never fires and pins get
     stranded. Capture catches scroll from any container, and the ResizeObserver
     covers layout changes that involve no scrolling at all. */
  useEffect(() => {
    if (!isOn) return undefined
    const bump = () => setTick((value) => value + 1)
    const root = getRoot()
    window.addEventListener('scroll', bump, true)
    window.addEventListener('resize', bump)
    const observer = new ResizeObserver(bump)
    if (root) observer.observe(root)
    // One recompute after mount, once Garden's tables have settled their widths.
    const timer = setTimeout(bump, 60)
    return () => {
      window.removeEventListener('scroll', bump, true)
      window.removeEventListener('resize', bump)
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [isOn])

  /* Position the toggle clear of the nav rail. Not gated on `isOn` — the button is
     visible whether or not comment mode is running, so this has to track a resize
     either way. Measured after a frame, since on the very first paint the host's
     nav has no width yet. Skipped entirely when the host gave us a number. */
  useEffect(() => {
    if (toggleLeftProp !== undefined) return undefined
    const measure = () => setMeasuredLeft(toggleLeftOffset())
    const frame = requestAnimationFrame(measure)
    const timer = setTimeout(measure, 200)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [toggleLeftProp])

  // Keeps "2m ago" honest without re-rendering constantly.
  useEffect(() => {
    if (!isOn) return undefined
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [isOn])

  // Escape closes whatever is open, then leaves comment mode: the ordering means
  // a stray Escape never drops you out of comment mode with a thread still open.
  useEffect(() => {
    if (!isOn) return undefined
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return
      if (draft) setDraft(null)
      else if (openId) setOpenId(null)
      else setIsOn(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOn, draft, openId])

  const roots = useMemo(() => comments.filter((comment) => !comment.parentId), [comments])
  const repliesOf = useCallback(
    (id) => comments.filter((comment) => comment.parentId === id),
    [comments],
  )

  /* Which pins belong on screen right now.
   *
   * A comment made in a different context — another version, another selected
   * record — is *not* drawn: its anchor would resolve against different content
   * and the pin would point at the wrong thing, which is worse than not showing
   * it. Those stay listed in the sidebar, and clicking one restores its context
   * first. This is the whole reason a pin stores context rather than just
   * coordinates.
   */
  const placed = useMemo(() => {
    // `tick` is read so this recomputes on scroll/resize; the value is unused.
    void tick
    return roots
      .map((comment) => {
        if (!sameContext(comment.anchor?.context, context)) return null
        const position = pinPositionFor(comment.anchor)
        if (!position) return null
        return { comment, position }
      })
      .filter(Boolean)
  }, [roots, context, tick])

  /* Comments belonging to a view other than the current one. Surfaced as a count
      rather than hidden, so it's obvious that the thread list is longer than the
      pins on screen — a reviewer who can't see a colleague's comment because they
      are on V1 and it was made on V4 would otherwise have no way to know. */
  const elsewhere = useMemo(
    () => roots.filter((comment) => !sameContext(comment.anchor?.context, context)),
    [roots, context],
  )

  /* The catcher's box, tracking the commentable root. Recomputed with the pins,
     so it follows a layout change rather than being measured once at mount. */
  const catcherBox = useMemo(() => {
    void tick
    const root = getRoot()
    if (!root) return null
    const box = root.getBoundingClientRect()
    return { left: box.left, top: box.top, width: box.width, height: box.height }
  }, [tick])

  const draftPosition = useMemo(() => {
    void tick
    return draft ? pinPositionFor(draft.anchor) : null
  }, [draft, tick])

  const openComment = openId ? comments.find((comment) => comment.id === openId) : null
  const openPosition = useMemo(() => {
    void tick
    return openComment ? pinPositionFor(openComment.anchor) : null
  }, [openComment, tick])

  const onCatcherClick = (event) => {
    /* Modifier-click passes the click through to the prototype instead of
       dropping a pin, so a reviewer can drill into the tree — and therefore
       comment on a node three levels down — without toggling comment mode off and
       on again at every step. Implemented by hiding the catcher for the duration
       of one synthesised click on whatever is underneath. */
    if (event.metaKey || event.ctrlKey || event.altKey) {
      const beneath = document
        .elementsFromPoint(event.clientX, event.clientY)
        .find((el) => getRoot()?.contains(el))
      const clickable = beneath?.closest('a[href], button, input, select, [role="button"]')
      if (clickable) clickable.click()
      return
    }

    const anchor = describeAnchor(event.clientX, event.clientY, context)
    if (!anchor) {
      // Clicked outside the commentable area — the nav, or the page margin.
      // Closing whatever is open is the useful interpretation, rather than an
      // error message about where pins are allowed.
      setOpenId(null)
      setDraft(null)
      return
    }
    setOpenId(null)
    setDraftBody('')
    setDraft({ anchor })
  }

  const submitDraft = async (event) => {
    event.preventDefault()
    if (!draftBody.trim() || !author.trim()) return
    setAuthor(author.trim())
    // The name is now remembered, so stop asking on the next comment. Done on
    // submit rather than on keystroke: mid-typing, the field still has to exist.
    setNeedsName(false)
    try {
      const created = await addComment({
        author: author.trim(),
        body: draftBody.trim(),
        anchor: draft.anchor,
        // Sequential per project, for "#63"-style references in conversation.
        number: roots.length + 1,
      })
      setComments((current) => [...current, created])
      setDraft(null)
      setDraftBody('')
      setOpenId(created.id)
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const submitReply = async (event) => {
    event.preventDefault()
    if (!replyBody.trim() || !author.trim() || !openComment) return
    setAuthor(author.trim())
    setNeedsName(false)
    try {
      const created = await addComment({
        author: author.trim(),
        body: replyBody.trim(),
        anchor: null,
        parentId: openComment.id,
      })
      setComments((current) => [...current, created])
      setReplyBody('')
    } catch (submitError) {
      setError(submitError.message)
    }
  }

  const toggleResolved = async (comment) => {
    try {
      await setResolved(comment.id, !comment.resolved)
      setComments((current) =>
        current.map((row) => (row.id === comment.id ? { ...row, resolved: !comment.resolved } : row)),
      )
    } catch (resolveError) {
      setError(resolveError.message)
    }
  }

  const removeComment = async (comment) => {
    try {
      await deleteComment(comment.id)
      setComments((current) =>
        current.filter((row) => row.id !== comment.id && row.parentId !== comment.id),
      )
      if (openId === comment.id) setOpenId(null)
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  /* Opening a comment from the sidebar: restore its view, then bring its anchor
     on screen. */
  const goToComment = (comment) => {
    const target = comment.anchor?.context
    if (target && !sameContext(target, context)) onRestoreContext?.(target)
    setOpenId(comment.id)
    setDraft(null)
    setReplyBody('')
    /* Scroll the anchored element into view.

       Restoring the context is not enough on its own: V4's tree is ~4600px inside
       a ~920px window, so a comment on the eightieth user resolves correctly and
       still sits far below the fold — the sidebar item would appear to do nothing.

       Retried across a few frames rather than attempted once: when the context
       changed, the host re-renders asynchronously and one frame is sometimes too
       early — a V4 switch has 107 rows to lay out. It gives up after ~10 frames,
       which is the honest outcome for an anchor that no longer resolves.

       `block: 'center'` so the pin lands mid-window rather than hugging the top
       edge under the header. */
    let attempts = 0
    const tryScroll = () => {
      const el = resolveAnchor(comment.anchor)
      if (el) {
        el.scrollIntoView({ block: 'center', inline: 'nearest' })
        setTick((value) => value + 1)
        return
      }
      if (attempts++ < 10) requestAnimationFrame(tryScroll)
    }
    requestAnimationFrame(tryScroll)
  }

  const unresolvedCount = roots.filter((comment) => !comment.resolved).length

  return (
    <>
      <ToggleButton
        type="button"
        style={{ left: toggleLeft }}
        $active={isOn}
        onClick={() => {
          setIsOn((value) => !value)
          setDraft(null)
          setOpenId(null)
        }}
        aria-pressed={isOn}
      >
        {isOn ? 'Exit comment mode' : 'Comment'}
        {!isOn && unresolvedCount > 0 ? ` (${unresolvedCount})` : ''}
      </ToggleButton>

      {isOn && (
        <>
          <SqueezeApp />
          {catcherBox && (
            <ClickCatcher
              onClick={onCatcherClick}
              style={{
                left: catcherBox.left,
                top: catcherBox.top,
                width: catcherBox.width,
                height: catcherBox.height,
              }}
            />
          )}

          {placed.map(({ comment, position }) => (
            <Pin
              key={comment.id}
              type="button"
              style={{ left: position.x, top: position.y }}
              $resolved={comment.resolved}
              $dimmed={openId !== null && openId !== comment.id}
              onClick={(event) => {
                // Stops the catcher underneath from reading this as a new pin.
                event.stopPropagation()
                setDraft(null)
                setReplyBody('')
                setOpenId(comment.id === openId ? null : comment.id)
              }}
              aria-label={`Comment ${comment.number ?? ''} by ${comment.author}`}
            >
              {comment.number ?? '•'}
            </Pin>
          ))}

          {draft && draftPosition && (
            <>
              <Pin
                as="div"
                style={{ left: draftPosition.x, top: draftPosition.y }}
                aria-hidden="true"
              >
                +
              </Pin>
              <Thread
                style={clampThread(draftPosition)}
                onClick={(event) => event.stopPropagation()}
              >
                <ThreadHead>
                  <span>New comment</span>
                  <ThreadActions>
                    <IconButton type="button" onClick={() => setDraft(null)}>
                      Cancel
                    </IconButton>
                  </ThreadActions>
                </ThreadHead>
                {draft.anchor.label && <AnchorNote>On: {draft.anchor.label}</AnchorNote>}
                <Composer onSubmit={submitDraft}>
                  {needsName && (
                    <NameInput
                      value={author}
                      onChange={(event) => setAuthorState(event.target.value)}
                      placeholder="Your name"
                      aria-label="Your name"
                    />
                  )}
                  <TextArea
                    value={draftBody}
                    onChange={(event) => setDraftBody(event.target.value)}
                    placeholder="Add a comment"
                    aria-label="Comment"
                    autoFocus
                  />
                  <SubmitRow>
                    <Submit type="submit" disabled={!draftBody.trim() || !author.trim()}>
                      Comment
                    </Submit>
                  </SubmitRow>
                </Composer>
              </Thread>
            </>
          )}

          {openComment && openPosition && !draft && (
            <Thread style={clampThread(openPosition)} onClick={(event) => event.stopPropagation()}>
              <ThreadHead>
                <span>
                  #{openComment.number ?? '—'}
                  {openPosition.drifted ? ' · content changed since' : ''}
                </span>
                <ThreadActions>
                  <IconButton type="button" onClick={() => toggleResolved(openComment)}>
                    {openComment.resolved ? 'Unresolve' : 'Resolve'}
                  </IconButton>
                  {/* On every comment, not just your own. This was owner-gated for a
                      while, and the gate mostly caught the wrong person: ownership
                      without a login identifies a browser, so your own notes stopped
                      being yours across a deploy or a cleared cache and the button
                      quietly vanished from them. In a review link among colleagues,
                      not being able to tidy up your own comment is the worse
                      failure. `isMine` is still read from the view — it just doesn't
                      gate anything now. */}
                  <IconButton type="button" onClick={() => removeComment(openComment)}>
                    Delete
                  </IconButton>
                  <IconButton type="button" onClick={() => setOpenId(null)}>
                    Close
                  </IconButton>
                </ThreadActions>
              </ThreadHead>
              <Message>
                <Byline>
                  {openComment.author} · {relativeTime(openComment.createdAt, now)}
                </Byline>
                <Body>{openComment.body}</Body>
              </Message>
              {repliesOf(openComment.id).map((reply) => (
                <Message key={reply.id}>
                  <Byline>
                    {reply.author} · {relativeTime(reply.createdAt, now)}
                  </Byline>
                  <Body>{reply.body}</Body>
                </Message>
              ))}
              <Composer onSubmit={submitReply}>
                {needsName && (
                  <NameInput
                    value={author}
                    onChange={(event) => setAuthorState(event.target.value)}
                    placeholder="Your name"
                    aria-label="Your name"
                  />
                )}
                <TextArea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  placeholder="Reply"
                  aria-label="Reply"
                />
                <SubmitRow>
                  <Submit type="submit" disabled={!replyBody.trim() || !author.trim()}>
                    Reply
                  </Submit>
                </SubmitRow>
              </Composer>
            </Thread>
          )}

          {/* data-comment-sidebar rather than relying on the `aside` tag. The host
              design may well have its own aside — a properties or filter panel —
              in which case a tag selector matches the wrong element. Cost me a
              spurious test failure once. */}
          <Sidebar data-comment-sidebar="true" onClick={(event) => event.stopPropagation()}>
            <SidebarHead>
              <span>Comments ({roots.length})</span>
              <IconButton
                type="button"
                style={{ color: '#646864' }}
                onClick={() => setIsOn(false)}
              >
                Close
              </IconButton>
            </SidebarHead>
            {isShared ? (
              /* Says who can delete what, because the rule shows up in the UI as a
                 *missing* button on other people's threads, which reads as a bug
                 unless it's stated. */
              <Banner $tone="info">
                Shared — everyone with this link sees these comments. You can delete your own.
              </Banner>
            ) : (
              <Banner $tone="warn">
                Stored in this browser only — others won&apos;t see these. See
                src/comments/SETUP.md to share them.
              </Banner>
            )}
            {error && <Banner $tone="error">{error}</Banner>}
            {elsewhere.length > 0 && (
              <Banner $tone="info">
                {elsewhere.length} comment{elsewhere.length === 1 ? '' : 's'} on another view —
                click to jump there.
              </Banner>
            )}
            {/* The modifier-click pass-through is not discoverable on its own,
                and without knowing it a reviewer can only comment on the one view
                they entered comment mode on. */}
            <Banner $tone="info">
              Click the design to comment. ⌘-click (or Ctrl-click) to navigate
              without leaving comment mode.
            </Banner>
            <SidebarList>
              {roots.length === 0 ? (
                <Empty>Click anywhere on the design to leave a comment.</Empty>
              ) : (
                roots.map((comment) => (
                  <SidebarItem
                    key={comment.id}
                    type="button"
                    $active={comment.id === openId}
                    $resolved={comment.resolved}
                    onClick={() => goToComment(comment)}
                  >
                    <ItemMeta>
                      <span>#{comment.number ?? '—'}</span>
                      <span>{comment.author}</span>
                      <span>{relativeTime(comment.createdAt, now)}</span>
                      {comment.resolved && <span>· resolved</span>}
                    </ItemMeta>
                    <ItemBody>{comment.body}</ItemBody>
                    {comment.anchor?.label && <ItemAnchor>On: {comment.anchor.label}</ItemAnchor>}
                  </SidebarItem>
                ))
              )}
            </SidebarList>
          </Sidebar>
        </>
      )}
    </>
  )
}

/* Keep a thread panel inside the viewport, and clear of the sidebar.
   Without this, a pin near the bottom or the right edge opens a panel that runs
   off screen — which in a 4600px-tall tree is most of them. */
const THREAD_WIDTH = 300
const THREAD_MAX_HEIGHT = 320
const SIDEBAR_WIDTH = 320
const GUTTER = 12

const clampThread = (position) => {
  const maxLeft = window.innerWidth - SIDEBAR_WIDTH - THREAD_WIDTH - GUTTER
  const left = Math.max(GUTTER, Math.min(position.x + 16, maxLeft))
  const maxTop = window.innerHeight - THREAD_MAX_HEIGHT - GUTTER
  const top = Math.max(GUTTER, Math.min(position.y, maxTop))
  return { left, top }
}
