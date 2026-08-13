/**
 * Anchoring: how a comment pin remembers what it was pointing at.
 *
 * This is the hard part of commenting on a prototype rather than on a static
 * image. A Figma pin can be an x/y coordinate because the canvas never changes
 * underneath it. A prototype's does: the same screen position shows completely
 * different content depending on which version is selected, which tab is open,
 * which record is loaded. A pin dropped on a row in one state would float over
 * blank space in another. So a pin stores three things:
 *
 * 1. `context` — the app state the commenter was looking at, supplied by the
 *    host prototype (whatever state it needs to restore: a version, a selected
 *    id, a route). Opening the comment restores this first, so the pin can only
 *    ever be resolved against the view it was made in.
 * 2. `path` — a structural route to the element, from a marked root down.
 * 3. `label` + `fraction` — the element's text at the time, used to sanity-check
 *    that the path still lands on the same thing, and where inside the element
 *    the click fell, as a fraction of its box, so the pin keeps its position
 *    when the element reflows to a different size.
 *
 * Nothing here knows anything about the host's state. The host passes its own
 * context object in and gets it back unchanged, which is the seam that lets this
 * drop into a different prototype without edits.
 */

/* The attribute marking the subtree pins are allowed to anchor inside. Anything
   outside it — the global nav, the comment UI itself — is not a legitimate
   target: the nav is chrome rather than design under review, and letting pins
   attach to the comment layer would let them anchor to each other. */
export const ROOT_ATTR = 'data-comment-root'

/* An explicit, stable id an element can volunteer. Preferred over a structural
   path whenever present, because it survives the element moving. Nothing in this
   prototype sets it yet; it is here so that a host with genuinely stable ids
   (a row keyed by record id, say) can opt into the stronger anchor. */
const ID_ATTR = 'data-comment-anchor'

/* Elements worth anchoring to, in preference order. A click lands on whatever
   leaf is under the cursor — often a text node's span, or the padding of a cell
   — and anchoring to that leaf makes for brittle pins and useless labels
   ("—"). Walking up to the nearest meaningful container instead gives a pin a
   name a reader recognises: the table row, the field, the button. */
const PREFERRED = ['[data-comment-anchor]', 'tr', 'th', 'button', 'a[href]', 'label', 'input', 'select', 'section', 'nav']

/** The commentable subtree, or null when the host hasn't marked one. */
export const getRoot = () => document.querySelector(`[${ROOT_ATTR}]`)

/**
 * The element a click at (clientX, clientY) should anchor to.
 *
 * Returns null when the click is outside the commentable root, which the caller
 * treats as "not a valid place for a pin" rather than as an error.
 */
export const anchorTargetAt = (clientX, clientY) => {
  const root = getRoot()
  if (!root) return null
  /* elementsFromPoint (plural) rather than elementFromPoint.
     The singular version returns the topmost element, which while comment mode is
     on is always the transparent click-catcher covering the viewport — so it would
     never find the row underneath and every click would be rejected as "outside
     the commentable area". The plural version returns the whole stack front to
     back, and the first entry inside the commentable root is the thing actually
     under the cursor. */
  const hit = document.elementsFromPoint(clientX, clientY).find((el) => root.contains(el))
  if (!hit) return null

  // Nearest preferred container, but never past the root: a pin anchored to the
  // root itself is the fallback, not a reason to give up.
  for (const selector of PREFERRED) {
    const match = hit.closest(selector)
    if (match && root.contains(match)) return match
  }
  return hit
}

/**
 * A structural route from the commentable root down to `el`.
 *
 * `nth-of-type` rather than `nth-child` because Garden's tables interleave
 * elements the host doesn't control, and rather than a class-based selector
 * because styled-components regenerates its class names on every build — a
 * class-based path would break on the next deploy, which is exactly the kind of
 * silent decay that makes prototype comments untrustworthy.
 */
const pathTo = (el) => {
  const root = getRoot()
  if (!root || !root.contains(el)) return null
  const steps = []
  let node = el
  while (node && node !== root) {
    const parent = node.parentElement
    if (!parent) return null
    const tag = node.tagName.toLowerCase()
    const sameTag = [...parent.children].filter((child) => child.tagName === node.tagName)
    // Only qualify with an index when the tag alone is ambiguous, which keeps
    // paths short and readable in stored data.
    steps.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(node) + 1})` : tag)
    node = parent
  }
  return steps.join(' > ')
}

/* The pieces of visible text inside an element, in order.
   Built by walking children rather than reading textContent, because textContent
   concatenates with nothing in between: a table row comes back as
   "Mathematics3 child orgs14" — the right row, but a label a reader has to
   decode. Walking gives ["Mathematics", "3 child orgs", "14"] to join.
   Recursive because the nesting varies. A person row keeps the name and the job
   title in separate spans inside one cell, so stopping at the cell would produce
   "Astrid LundLecturer" and reintroduce the problem one level down.
   Em dashes are dropped along with empty text: the tree uses "—" for "not
   applicable", and "Astrid Lund · Lecturer · — · —" is noise where
   "Astrid Lund · Lecturer" is a label. */
const textSegments = (el) => {
  if (!el.children.length) {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
    return text && text !== '—' ? [text] : []
  }
  return [...el.children].flatMap(textSegments)
}

/** A short human label for an element, for the sidebar and for verification. */
export const labelFor = (el) => {
  if (!el) return ''
  const aria = el.getAttribute('aria-label')
  if (aria) return aria.replace(/\s+/g, ' ').trim().slice(0, 80)
  const segments = textSegments(el)
  if (segments.length) return segments.join(' · ').slice(0, 80)
  // No element children with text — a plain text node, or an element whose text
  // is all em dashes.
  return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

/**
 * Build the stored descriptor for a click.
 *
 * `context` is whatever the host handed over — opaque here, restored verbatim
 * later.
 */
export const describeAnchor = (clientX, clientY, context) => {
  const el = anchorTargetAt(clientX, clientY)
  if (!el) return null
  const box = el.getBoundingClientRect()
  return {
    context,
    id: el.getAttribute(ID_ATTR) || null,
    path: pathTo(el),
    label: labelFor(el),
    // Where in the element the click fell, 0–1 on each axis. Stored as a
    // fraction rather than a pixel offset so a pin keeps its relative position
    // when the element changes size — which happens here every time a column is
    // added or removed.
    fraction: {
      x: box.width ? (clientX - box.left) / box.width : 0.5,
      y: box.height ? (clientY - box.top) / box.height : 0.5,
    },
  }
}

/**
 * Find the element a stored anchor refers to, in the DOM as it stands now.
 *
 * Returns null when the anchor's context doesn't match what's on screen — the
 * caller is expected to restore the context first and try again.
 */
export const resolveAnchor = (anchor) => {
  const root = getRoot()
  if (!root || !anchor) return null
  if (anchor.id) {
    const byId = root.querySelector(`[${ID_ATTR}="${CSS.escape(anchor.id)}"]`)
    if (byId) return byId
  }
  if (!anchor.path) return null
  let el = null
  try {
    el = root.querySelector(anchor.path)
  } catch {
    // A path stored by an older version of this code that no longer parses.
    // Treated as an unresolvable pin rather than allowed to throw.
    return null
  }
  return el
}

/**
 * Viewport position for a resolved anchor, or null when it isn't on screen.
 *
 * Deliberately returns viewport coordinates: pins live in a fixed overlay, so
 * they follow scrolling without the overlay needing to know the page height.
 */
export const pinPositionFor = (anchor) => {
  const el = resolveAnchor(anchor)
  if (!el) return null
  const box = el.getBoundingClientRect()
  // A zero box means the element is present but not rendered — inside a
  // collapsed section, or on a table that hasn't laid out yet.
  if (!box.width && !box.height) return null
  const fraction = anchor.fraction || { x: 0.5, y: 0.5 }
  return {
    x: box.left + fraction.x * box.width,
    y: box.top + fraction.y * box.height,
    // Whether the anchored element still says what it said when the pin was
    // dropped. A mismatch doesn't hide the pin — the row may legitimately have
    // been renamed — but it's worth surfacing rather than pretending the pin is
    // certainly still correct.
    drifted: Boolean(anchor.label) && labelFor(el) !== anchor.label,
  }
}

/** Do two context objects describe the same view? Shallow by design. */
export const sameContext = (a, b) => {
  if (!a || !b) return false
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) if (a[key] !== b[key]) return false
  return true
}
