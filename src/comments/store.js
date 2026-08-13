/**
 * Where comments live.
 *
 * Two backends behind one interface. Which one is active depends purely on
 * whether Supabase credentials were present at build time:
 *
 * - **Supabase** — shared. Everyone with the link reads and writes the same
 *   threads. This is the mode that makes the feature worth having.
 * - **localStorage** — private to one browser. Used when no credentials are
 *   configured, so the prototype still runs (and the interaction can still be
 *   demonstrated) without any setup at all.
 *
 * Talking to Supabase over plain `fetch` against its REST API rather than
 * through `@supabase/supabase-js`: the SDK is ~40kB gzipped and brings a
 * realtime client this doesn't use, and keeping the dependency count at zero is
 * most of what makes this layer droppable into another prototype unchanged.
 *
 * On the anon key being visible in the built bundle: that is what it is for. It
 * is a public identifier, not a secret, and what actually governs access is the
 * row-level security policy on the table (see the SQL in the setup doc). The
 * policy grants anonymous insert and select and nothing else — so a link holder
 * can read and post, but cannot drop the table. Do not put a service-role key
 * here; that one is a real secret and would be readable by anyone who opened
 * devtools.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/* One table, one row per comment or reply. A reply is a row with `parent_id` set
   — a thread rather than a separate table, since threads here are one level deep
   and a second table would buy nothing. */
const TABLE = 'prototype_comments'

/* Namespaces the rows so several prototypes can share one Supabase project.
   Without it, dropping this into the next prototype would mix its comments in
   with this one's. */
export const PROJECT = 'organization-hierarchy'

export const isShared = Boolean(SUPABASE_URL && SUPABASE_KEY)

const LOCAL_KEY = `prototype-comments:${PROJECT}`

/* ---------- localStorage backend ---------- */

const localRead = () => {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) || '[]')
  } catch {
    // Corrupt or unparseable storage is treated as empty rather than fatal: a
    // broken comment store should not take the prototype down with it.
    return []
  }
}

const localWrite = (rows) => {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
  } catch {
    // Quota exceeded, or Safari private mode. Nothing useful to do, and throwing
    // would lose the comment the user just typed from the UI as well as from
    // storage.
  }
}

/* ---------- Supabase backend ---------- */

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

const rest = async (path, options = {}) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  if (!response.ok) {
    // Surfaced to the UI rather than swallowed. The overwhelmingly likely cause
    // is a missing table or an RLS policy that doesn't grant anon access, and
    // both are setup mistakes worth showing plainly instead of appearing as an
    // empty comment list.
    const detail = await response.text()
    throw new Error(`Supabase ${response.status}: ${detail.slice(0, 200)}`)
  }
  if (response.status === 204) return null
  return response.json()
}

/* ---------- Public interface ---------- */

/** Every comment for this project, oldest first. */
export const loadComments = async () => {
  // Local rows go through fromRow too. They are stored in the same snake_case
  // shape as Supabase's so the two backends are interchangeable, which means a
  // reply read back from localStorage has `parent_id` and not `parentId` — skip
  // the mapping and every reply reads as a top-level comment after a reload.
  if (!isShared) return localRead().map(fromRow)
  const rows = await rest(
    `${TABLE}?project=eq.${encodeURIComponent(PROJECT)}&order=created_at.asc`,
  )
  return rows.map(fromRow)
}

/**
 * Add a comment, or a reply when `parentId` is set.
 *
 * Returns the stored comment including its server-assigned id and timestamp, so
 * the caller can render it without a refetch.
 */
export const addComment = async ({ author, body, anchor, parentId = null, number = null }) => {
  const record = {
    project: PROJECT,
    author,
    body,
    parent_id: parentId,
    number,
    // The anchor travels as JSON: the storage layer has no opinion about what a
    // pin points at, which is what lets a different prototype supply a
    // completely different context shape without touching this file.
    anchor: anchor || null,
    resolved: false,
  }
  if (!isShared) {
    const rows = localRead()
    const stored = {
      ...record,
      id: `local-${rows.length + 1}-${String(rows.length)}`,
      created_at: new Date().toISOString(),
    }
    localWrite([...rows, stored])
    return fromRow(stored)
  }
  const [row] = await rest(TABLE, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(record),
  })
  return fromRow(row)
}

/** Mark a thread resolved, or un-resolve it. */
export const setResolved = async (id, resolved) => {
  if (!isShared) {
    localWrite(localRead().map((row) => (row.id === id ? { ...row, resolved } : row)))
    return
  }
  await rest(`${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved }),
  })
}

/** Delete a comment and, when it's a thread root, its replies. */
export const deleteComment = async (id) => {
  if (!isShared) {
    localWrite(localRead().filter((row) => row.id !== id && row.parent_id !== id))
    return
  }
  // Replies first: the table has no cascade, and orphaned replies would keep
  // showing in the sidebar attached to nothing.
  await rest(`${TABLE}?parent_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
  await rest(`${TABLE}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' })
}

/* Row shape → app shape. Kept explicit so a column rename is a one-line change
   here rather than a hunt through the components. */
const fromRow = (row) => ({
  id: row.id,
  author: row.author,
  body: row.body,
  parentId: row.parent_id ?? null,
  number: row.number ?? null,
  anchor: row.anchor ?? null,
  resolved: Boolean(row.resolved),
  createdAt: row.created_at,
})

/**
 * Who is commenting.
 *
 * Deliberately just a remembered name rather than authentication. The people
 * reviewing this are named colleagues in a Figma-style thread, and asking a PM
 * to create an account to leave a note would cost more than it protects. It does
 * mean anyone can type any name — fine for design review, not fine for anything
 * that needs attribution to be trustworthy.
 */
const NAME_KEY = 'prototype-comments:author'
export const getAuthor = () => {
  try {
    return window.localStorage.getItem(NAME_KEY) || ''
  } catch {
    return ''
  }
}
export const setAuthor = (name) => {
  try {
    window.localStorage.setItem(NAME_KEY, name)
  } catch {
    // Private browsing. The name simply won't persist between reloads.
  }
}
