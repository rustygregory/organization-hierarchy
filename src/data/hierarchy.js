/**
 * Organization hierarchy mock data.
 *
 * Mirrors the FigJam board from the discovery meeting:
 *
 *   TD Synnex                    (Reseller Network)
 *   └─ Reseller A                (Service Provider)
 *      ├─ University             (Company)
 *      │  ├─ Computer Science    (Cost Center)
 *      │  ├─ Mathematics         (Cost Center)
 *      │  └─ Engineering         (Cost Center Hierarchy)
 *      │     ├─ Mobile App Team  (Supervisory)
 *      │     └─ 380 Applications (Cost Center)
 *      └─ SaaS Product           (Company)
 *         ├─ Dept 1 / Dept 2 / Dept 3
 *
 * Organizations are stored flat with a `parentId` — the same shape the real
 * feature proposes (a parent field on the organization record). Everything
 * else is derived, so a persona can be re-rooted anywhere in the tree without
 * duplicating data.
 */

export const ORGANIZATIONS = [
  { id: 'td-synnex', name: 'TD Synnex', type: 'Reseller Network', parentId: null },
  { id: 'reseller-a', name: 'Reseller A', type: 'Service Provider', parentId: 'td-synnex' },

  { id: 'university', name: 'University', type: 'Company', parentId: 'reseller-a' },
  { id: 'computer-science', name: 'Computer Science', type: 'Cost Center', parentId: 'university' },
  { id: 'mathematics', name: 'Mathematics', type: 'Cost Center', parentId: 'university' },
  { id: 'engineering', name: 'Engineering', type: 'Cost Center Hierarchy', parentId: 'university' },
  { id: 'mobile-app-team', name: 'Mobile App Team', type: 'Supervisory', parentId: 'engineering' },
  { id: '380-applications', name: '380 Applications', type: 'Cost Center', parentId: 'engineering' },

  { id: 'saas-product', name: 'SaaS Product', type: 'Company', parentId: 'reseller-a' },
  { id: 'dept-1', name: 'Dept 1', type: 'Cost Center', parentId: 'saas-product' },
  { id: 'dept-2', name: 'Dept 2', type: 'Cost Center', parentId: 'saas-product' },
  { id: 'dept-3', name: 'Dept 3', type: 'Cost Center', parentId: 'saas-product' },
]

/**
 * People sit in organizations. `orgIds` is an array because a supporting role
 * is, today, manually added to many organizations — that manual fan-out is the
 * pain this feature removes. Head of Engineering below is attached only to
 * University; under the proposed model that single attachment is enough.
 */
export const PEOPLE = [
  // University-level staff
  { id: 'marcus-chen', name: 'Marcus Chen', type: 'Agent', title: 'Head of Engineering', orgIds: ['university'] },
  { id: 'priya-raman', name: 'Priya Raman', type: 'Agent', title: 'IT Director', orgIds: ['university'] },
  { id: 'helen-osei', name: 'Helen Osei', type: 'End user', title: 'Registrar', orgIds: ['university'] },

  // Computer Science
  { id: 'rachel-martinez', name: 'Rachel Martinez', type: 'End user', title: 'Professor', orgIds: ['computer-science'] },
  { id: 'daniel-okafor', name: 'Daniel Okafor', type: 'End user', title: 'Associate Professor', orgIds: ['computer-science'] },
  { id: 'sofia-almeida', name: 'Sofia Almeida', type: 'End user', title: 'Lab Manager', orgIds: ['computer-science'] },
  { id: 'wei-zhang', name: 'Wei Zhang', type: 'End user', title: 'Teaching Assistant', orgIds: ['computer-science'] },
  { id: 'amara-diallo', name: 'Amara Diallo', type: 'End user', title: 'Graduate Researcher', orgIds: ['computer-science'] },

  // Mathematics
  { id: 'jonas-lindqvist', name: 'Jonas Lindqvist', type: 'End user', title: 'Professor', orgIds: ['mathematics'] },
  { id: 'nadia-haddad', name: 'Nadia Haddad', type: 'End user', title: 'Lecturer', orgIds: ['mathematics'] },
  { id: 'tomas-varga', name: 'Tomas Varga', type: 'End user', title: 'Teaching Assistant', orgIds: ['mathematics'] },
  { id: 'grace-mbeki', name: 'Grace Mbeki', type: 'End user', title: 'Department Coordinator', orgIds: ['mathematics'] },

  // Engineering (department level, above its two sub-teams)
  { id: 'oliver-brandt', name: 'Oliver Brandt', type: 'End user', title: 'Department Administrator', orgIds: ['engineering'] },
  { id: 'dana-whitfield', name: 'Dana Whitfield', type: 'End user', title: 'Faculty Lead', orgIds: ['engineering'] },
  { id: 'samir-patel', name: 'Samir Patel', type: 'End user', title: 'Professor', orgIds: ['engineering'] },

  // Mobile App Team
  { id: 'tim-mclean', name: 'Tim McLean', type: 'End user', title: 'Engineering Manager', orgIds: ['mobile-app-team'] },
  { id: 'yuki-tanaka', name: 'Yuki Tanaka', type: 'End user', title: 'iOS Developer', orgIds: ['mobile-app-team'] },
  { id: 'lucas-ferreira', name: 'Lucas Ferreira', type: 'End user', title: 'Android Developer', orgIds: ['mobile-app-team'] },
  { id: 'hannah-mcgrath', name: 'Hannah McGrath', type: 'End user', title: 'QA Engineer', orgIds: ['mobile-app-team'] },

  // 380 Applications
  { id: 'ines-moreau', name: 'Ines Moreau', type: 'End user', title: 'Applications Analyst', orgIds: ['380-applications'] },
  { id: 'kofi-mensah', name: 'Kofi Mensah', type: 'End user', title: 'Systems Engineer', orgIds: ['380-applications'] },
  { id: 'elena-petrova', name: 'Elena Petrova', type: 'End user', title: 'Integrations Lead', orgIds: ['380-applications'] },
  { id: 'ryan-doyle', name: 'Ryan Doyle', type: 'End user', title: 'Support Analyst', orgIds: ['380-applications'] },
  { id: 'aisha-karim', name: 'Aisha Karim', type: 'End user', title: 'Database Administrator', orgIds: ['380-applications'] },

  // Reseller / service provider staff
  { id: 'gordon-alvarez', name: 'Gordon Alvarez', type: 'Agent', title: 'Service Provider Support Engineer', orgIds: ['reseller-a'] },
  { id: 'beatrice-nowak', name: 'Beatrice Nowak', type: 'Agent', title: 'Account Manager', orgIds: ['reseller-a'] },

  // SaaS Product
  { id: 'victor-hale', name: 'Victor Hale', type: 'End user', title: 'Operations Lead', orgIds: ['saas-product'] },
  { id: 'mei-lin', name: 'Mei Lin', type: 'End user', title: 'Product Owner', orgIds: ['dept-1'] },
  { id: 'andre-silva', name: 'Andre Silva', type: 'End user', title: 'Support Specialist', orgIds: ['dept-1'] },
  { id: 'claire-dubois', name: 'Claire Dubois', type: 'End user', title: 'Billing Analyst', orgIds: ['dept-2'] },
  { id: 'omar-farouk', name: 'Omar Farouk', type: 'End user', title: 'Implementation Consultant', orgIds: ['dept-2'] },
  { id: 'natalie-cross', name: 'Natalie Cross', type: 'End user', title: 'Customer Success Manager', orgIds: ['dept-3'] },
  { id: 'peter-shaw', name: 'Peter Shaw', type: 'End user', title: 'Technical Writer', orgIds: ['dept-3'] },
]

/**
 * The personas the prototype can switch between. `attachedOrgId` is the single
 * node a person is attached to; their visible tree is that node plus every
 * descendant — the cascade this feature is meant to deliver.
 */
export const PERSONAS = [
  {
    id: 'head-of-engineering',
    personId: 'marcus-chen',
    name: 'Marcus Chen',
    role: 'Head of Engineering',
    attachedOrgId: 'university',
    userType: 'Agent',
    access: 'Can view tickets in this org and below',
    email: 'marcus.chen@university.edu',
    timeZone: '(GMT-05:00) Eastern Time',
    language: 'English (United States)',
    ticketCount: 6,
  },
  {
    id: 'service-provider-support-eng',
    personId: 'gordon-alvarez',
    name: 'Gordon Alvarez',
    role: 'Service Provider Support Engineer',
    attachedOrgId: 'reseller-a',
    userType: 'Agent',
    access: 'Can view tickets in this org and below',
    email: 'g.alvarez@resellera.com',
    timeZone: '(GMT-08:00) Pacific Time',
    language: 'English (United States)',
    ticketCount: 24,
  },
  {
    id: 'compsci-professor',
    personId: 'rachel-martinez',
    name: 'Rachel Martinez',
    role: 'Professor, Computer Science',
    attachedOrgId: 'computer-science',
    userType: 'End user',
    access: 'Can view and edit own tickets',
    email: 'rachel.martinez@university.edu',
    timeZone: '(GMT+10:00) Melbourne',
    language: 'English (United States)',
    ticketCount: 1,
  },
]

/* ---------------------------------------------------------------- selectors */

export const getOrganization = (orgId) => ORGANIZATIONS.find((org) => org.id === orgId)

export const getChildren = (orgId) => ORGANIZATIONS.filter((org) => org.parentId === orgId)

export const getPeopleIn = (orgId) => PEOPLE.filter((person) => person.orgIds.includes(orgId))

/** Every organization beneath `orgId`, at any depth. Excludes `orgId` itself. */
export const getDescendantIds = (orgId) =>
  getChildren(orgId).flatMap((child) => [child.id, ...getDescendantIds(child.id)])

/** Root-to-node path, inclusive of `orgId`. */
export const getPath = (orgId) => {
  const org = getOrganization(orgId)
  if (!org) return []
  return org.parentId ? [...getPath(org.parentId), org] : [org]
}

/** Count of people in `orgId` and everything below it — the "reach" of a node. */
export const countPeopleAtOrBelow = (orgId) =>
  [orgId, ...getDescendantIds(orgId)].reduce((total, id) => total + getPeopleIn(id).length, 0)

export const getPersona = (personaId) =>
  PERSONAS.find((persona) => persona.id === personaId) || PERSONAS[0]
