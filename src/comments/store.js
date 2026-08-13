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
 * policy grants a link holder read, post, resolve, and delete-your-own, and
 * nothing else. Do not put a service-role key here; that one is a real secret,
 * bypasses those policies entirely, and would be readable by anyone who opened
 * devtools.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/* One table, one row per comment or reply. A reply is a row with `parent_id` set
   — a thread rather than a separate table, since threads here are one level deep
   and a second table would buy nothing. */
const TABLE = 'prototype_comments'

/* Reads come from a view rather than the table, because the table holds the
   `author_key` that decides who may delete a row. Selecting that column would
   publish, to every reader, exactly the value they'd need in order to delete
   somebody else's comment. The view drops it and exposes `is_mine` instead — the
   answer to the only question the UI actually asks. */
const VIEW = 'prototype_comments_view'

/* What an insert asks for back. Everything except `author_key`. */
const RETURN_COLUMNS =
  'id,project,author,body,parent_id,number,anchor,resolved,created_at'

/* Namespaces the rows so several prototypes can share one Supabase project.
   Without it, dropping this into the next prototype would mix its comments in
   with this one's. Set this to the prototype's name when installing. */
export const PROJECT = 'organization-hierarchy'

export const isShared = Boolean(SUPABASE_URL && SUPABASE_KEY)

const LOCAL_KEY = `prototype-comments:${PROJECT}`

/* ---------- Who owns a comment ---------- */

/**
 * A random per-browser key, so a reviewer can delete their own comments and not
 * anyone else's.
 *
 * Not authentication, and not pretending to be: there is no login here, the
 * author *name* beside a comment is still self-declared, and this key lives in one
 * browser — so the same person on a laptop and a phone is two owners, and clearing
 * browser data means giving up the ability to delete what you already wrote. What
 * it does buy is that one reviewer can't delete another's feedback, which is the
 * accident actually worth preventing in a shared review link.
 *
 * Sent as a header, never in the request body. The database defaults the
 * `author_key` column from that header and its RLS policy requires the two to
 * match, so a caller can't claim a row they don't own — see schema.sql.
 *
 * Deliberately not namespaced by PROJECT: one identity per browser across every
 * prototype sharing the Supabase project, so the same person stays the same owner
 * as they move between them.
 */
const OWNER_KEY = 'prototype-comments:owner-key'

const randomKey = () => {
  // randomUUID needs a secure context. Any localhost or https deploy has one, but
  // a prototype opened over plain http on a LAN address doesn't, and an exception
  // here would take the whole comment layer down.
  try {
    return crypto.randomUUID()
  } catch {
    return `k-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  }
}

const ownerKey = () => {
  try {
    const existing = window.localStorage.getItem(OWNER_KEY)
    if (existing) return existing
    const created = randomKey()
    window.localStorage.setItem(OWNER_KEY, created)
    return created
  } catch {
    /* Private browsing, or storage disabled. A fresh key per call means comments
       still post — losing the ability to delete them is a smaller failure than
       being unable to comment at all. */
    return randomKey()
  }
}

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

/* Built per request rather than once at module load: `ownerKey()` touches
   localStorage, and doing that at import time would run it before the app has
   mounted — and on a reload it also has to pick up a key written by an earlier
   visit. */
const buildHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  /* Read by the table's column default and by its RLS policies. Sent on reads too,
     which is what lets the view answer `is_mine`. */
  'x-comment-key': ownerKey(),
})

const rest = async (path, options = {}) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...buildHeaders(), ...options.headers },
  })
  if (!response.ok) {
    // Surfaced to the UI rather than swallowed. The overwhelmingly likely cause
    // is a missing table or an RLS policy that doesn't grant anon access, and
    // both are setup mistakes worth showing plainly instead of appearing as an
    // empty comment list.
    const detail = await response.text()
    /* A 403 on a write is almost always the ownership rules rejecting the row
       rather than anything a reviewer could act on, and the raw PostgREST text
       ("new row violates row-level security policy") reads as a crash. Named
       plainly instead, since it points at one specific setup mistake: the header
       the policy checks never arrived. */
    if (response.status === 403) {
      throw new Error(
        'Supabase 403: the comment was rejected by its access rules. ' +
          'If this happens on every comment, see src/comments/SETUP.md.',
      )
    }
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
  /* Everything in this browser's own storage is by definition yours, including
     rows written before `is_mine` existed — so it's forced on here rather than
     read, which would hide Delete on every pre-existing local comment. */
  if (!isShared) return localRead().map((row) => fromRow({ ...row, is_mine: true }))
  const query = `project=eq.${encodeURIComponent(PROJECT)}&order=created_at.asc`
  try {
    const rows = await rest(`${VIEW}?${query}`)
    return rows.map(fromRow)
  } catch (viewError) {
    /* No view yet — a project set up before the owner-only upgrade, or a deploy
       that landed before the SQL was run. Falling back to the table keeps comments
       readable in that window instead of showing a 404 where the threads should
       be. `is_mine` comes back undefined, so Delete hides on everything, which is
       the safe way to be wrong: nobody can remove anyone's comment until the SQL
       is run, rather than everybody being able to.

       Only for a missing relation. A 401 or a network failure still surfaces —
       those aren't fixed by asking a different question. */
    if (!/\b404\b/.test(viewError.message)) throw viewError
    const rows = await rest(`${TABLE}?${query}&select=${RETURN_COLUMNS}`)
    return rows.map(fromRow)
  }
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
      // Nobody else can reach this browser's storage, so everything in it is yours.
      is_mine: true,
    }
    localWrite([...rows, stored])
    return fromRow(stored)
  }
  /* `author_key` is deliberately absent from `record` — the column defaults from
     the `x-comment-key` header, and the insert grant doesn't include it, so it
     can't be set from here even by accident.

     The explicit select list keeps `author_key` out of the response as well. Only
     your own key could come back, so this leaks nothing, but a row shape that
     matches the view's is one less thing to get wrong. */
  const [row] = await rest(`${TABLE}?select=${RETURN_COLUMNS}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(record),
  })
  // You just wrote it, so it's yours — the view isn't consulted on the way back.
  return fromRow({ ...row, is_mine: true })
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

/**
 * Delete a comment, and its replies when it's a thread root.
 *
 * Only your own comments; the RLS policy enforces that. Note what that means for a
 * thread: deleting a root you own also removes replies you *don't* own, via the
 * foreign key's `on delete cascade`, which runs as the table owner rather than as
 * you. That's the right behaviour — a reply can't outlive the comment it answers,
 * and the alternative is an orphan pointing at nothing — but it does mean owning a
 * thread carries more weight than owning a single note.
 */
export const deleteComment = async (id) => {
  if (!isShared) {
    localWrite(localRead().filter((row) => row.id !== id && row.parent_id !== id))
    return
  }
  /* Replies are left to the foreign key's cascade rather than deleted first. The
     old explicit pass would now silently skip anyone else's replies, since the
     policy doesn't grant them — and then the root delete would cascade them away
     anyway. One statement, one rule.

     `return=representation` because a delete that matches no rows is not an error:
     PostgREST reports 204 whether the policy withheld the row or the row was
     already gone. Without the returned body, deleting someone else's comment would
     look like it worked and the pin would come back on the next load. */
  const deleted = await rest(`${TABLE}?id=eq.${encodeURIComponent(id)}&select=id`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  })
  if (!deleted || deleted.length === 0) {
    throw new Error("That comment belongs to someone else, so it can't be deleted here.")
  }
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
  /* Computed by the view from the owner key, never the key itself. Defaults false
     so that a table predating the owner-only upgrade — no view, no `is_mine` —
     hides Delete rather than offering a button that fails. */
  isMine: Boolean(row.is_mine),
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
