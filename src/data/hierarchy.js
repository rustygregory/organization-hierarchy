/**
 * Organization hierarchy mock data.
 *
 * Mirrors the FigJam board from the discovery meeting:
 *
 *   TD Synnex                          (Reseller Network)
 *   └─ Reseller A                      (Service Provider)
 *      ├─ Bramblewick University       (Company)
 *      │  ├─ Computer Science          (Cost Center)
 *      │  │  └─ Artificial Intelligence (Cost Center)
 *      │  │     └─ Machine Learning Lab (Supervisory)
 *      │  ├─ Mathematics               (Cost Center)
 *      │  │  └─ Applied Mathematics    (Cost Center)
 *      │  └─ Engineering               (Cost Center Hierarchy)
 *      │     ├─ Mobile App Team        (Supervisory)
 *      │     │  └─ iOS Squad           (Supervisory)
 *      │     │     └─ Build & Release  (Supervisory)
 *      │     └─ 380 Applications       (Cost Center)
 *      └─ SaaS Product                 (Company)
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

  { id: 'bramblewick', name: 'Bramblewick University', type: 'Company', parentId: 'reseller-a' },
  // Computer Science goes two levels deeper — the attached-rail branch, so the
  // continuous guide line can be judged over more than one step.
  // The Computer Science chain runs ten levels deep counting Bramblewick as
  // level 1, so the continuous rail can be judged over a long descent rather
  // than a couple of steps:
  //   1 Bramblewick → 2 Computer Science → 3 Artificial Intelligence →
  //   4 Machine Learning Lab → 5 Neural Networks Group → 6 Deep Learning Unit →
  //   7 Computer Vision Team → 8 Image Recognition Squad →
  //   9 Model Training Pod → 10 GPU Cluster Ops
  { id: 'computer-science', name: 'Computer Science', type: 'Cost Center', parentId: 'bramblewick' },
  { id: 'artificial-intelligence', name: 'Artificial Intelligence', type: 'Cost Center', parentId: 'computer-science' },
  { id: 'machine-learning-lab', name: 'Machine Learning Lab', type: 'Supervisory', parentId: 'artificial-intelligence' },
  // Two siblings beside Machine Learning Lab, so that level has breadth as well
  // as the depth below it.
  { id: 'natural-language-lab', name: 'Natural Language Lab', type: 'Supervisory', parentId: 'artificial-intelligence' },
  { id: 'robotics-lab', name: 'Robotics Lab', type: 'Supervisory', parentId: 'artificial-intelligence' },
  // The first of those siblings goes two levels deeper.
  { id: 'speech-processing-group', name: 'Speech Processing Group', type: 'Supervisory', parentId: 'natural-language-lab' },
  { id: 'transcription-team', name: 'Transcription Team', type: 'Supervisory', parentId: 'speech-processing-group' },

  { id: 'neural-networks-group', name: 'Neural Networks Group', type: 'Supervisory', parentId: 'machine-learning-lab' },
  { id: 'deep-learning-unit', name: 'Deep Learning Unit', type: 'Supervisory', parentId: 'neural-networks-group' },
  { id: 'computer-vision-team', name: 'Computer Vision Team', type: 'Supervisory', parentId: 'deep-learning-unit' },
  // A sibling beside Computer Vision Team.
  { id: 'speech-recognition-team', name: 'Speech Recognition Team', type: 'Supervisory', parentId: 'deep-learning-unit' },
  { id: 'image-recognition-squad', name: 'Image Recognition Squad', type: 'Supervisory', parentId: 'computer-vision-team' },
  { id: 'model-training-pod', name: 'Model Training Pod', type: 'Supervisory', parentId: 'image-recognition-squad' },
  { id: 'gpu-cluster-ops', name: 'GPU Cluster Ops', type: 'Supervisory', parentId: 'model-training-pod' },
  // Three siblings beside GPU Cluster Ops — the widest point at the deepest level.
  { id: 'dataset-curation-pod', name: 'Dataset Curation Pod', type: 'Supervisory', parentId: 'model-training-pod' },
  { id: 'evaluation-pod', name: 'Evaluation Pod', type: 'Supervisory', parentId: 'model-training-pod' },
  { id: 'inference-serving-pod', name: 'Inference Serving Pod', type: 'Supervisory', parentId: 'model-training-pod' },

  // Mathematics goes one level deeper than the FigJam board did.
  { id: 'mathematics', name: 'Mathematics', type: 'Cost Center', parentId: 'bramblewick' },
  { id: 'applied-mathematics', name: 'Applied Mathematics', type: 'Cost Center', parentId: 'mathematics' },
  // Two siblings beside Applied Mathematics.
  { id: 'pure-mathematics', name: 'Pure Mathematics', type: 'Cost Center', parentId: 'mathematics' },
  { id: 'statistics', name: 'Statistics', type: 'Cost Center', parentId: 'mathematics' },
  // Applied Mathematics goes two levels deeper.
  { id: 'numerical-analysis-group', name: 'Numerical Analysis Group', type: 'Cost Center', parentId: 'applied-mathematics' },
  { id: 'simulation-team', name: 'Simulation Team', type: 'Supervisory', parentId: 'numerical-analysis-group' },

  // Engineering goes two levels deeper again, so the tree is asymmetric and the
  // rail geometry gets exercised at depth 5 under the university persona.
  { id: 'engineering', name: 'Engineering', type: 'Cost Center Hierarchy', parentId: 'bramblewick' },
  { id: 'mobile-app-team', name: 'Mobile App Team', type: 'Supervisory', parentId: 'engineering' },
  { id: 'ios-squad', name: 'iOS Squad', type: 'Supervisory', parentId: 'mobile-app-team' },
  { id: 'build-release', name: 'Build & Release', type: 'Supervisory', parentId: 'ios-squad' },
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
 * Bramblewick; under the proposed model that single attachment is enough.
 */
export const PEOPLE = [
  // University-level staff
  { id: 'adrian-whitlock', name: 'Adrian Whitlock', type: 'Agent', title: 'Head of Engineering', orgIds: ['bramblewick'] },
  { id: 'priya-raman', name: 'Priya Raman', type: 'Agent', title: 'IT Director', orgIds: ['bramblewick'] },
  { id: 'helen-osei', name: 'Helen Osei', type: 'End user', title: 'Registrar', orgIds: ['bramblewick'] },

  // Computer Science
  { id: 'rachel-martinez', name: 'Rachel Martinez', type: 'End user', title: 'Professor', orgIds: ['computer-science'] },
  { id: 'daniel-okafor', name: 'Daniel Okafor', type: 'End user', title: 'Associate Professor', orgIds: ['computer-science'] },
  { id: 'sofia-almeida', name: 'Sofia Almeida', type: 'End user', title: 'Lab Manager', orgIds: ['computer-science'] },
  { id: 'wei-zhang', name: 'Wei Zhang', type: 'End user', title: 'Teaching Assistant', orgIds: ['computer-science'] },
  { id: 'amara-diallo', name: 'Amara Diallo', type: 'End user', title: 'Graduate Researcher', orgIds: ['computer-science'] },

  // Artificial Intelligence (below Computer Science)
  { id: 'theodore-abiodun', name: 'Theodore Abiodun', type: 'End user', title: 'Research Director', orgIds: ['artificial-intelligence'] },
  { id: 'saoirse-flanagan', name: 'Saoirse Flanagan', type: 'End user', title: 'Senior Researcher', orgIds: ['artificial-intelligence'] },
  { id: 'hiroshi-nakamura', name: 'Hiroshi Nakamura', type: 'End user', title: 'Lecturer', orgIds: ['artificial-intelligence'] },

  // Machine Learning Lab (below Artificial Intelligence)
  { id: 'valentina-rossi', name: 'Valentina Rossi', type: 'End user', title: 'Lab Director', orgIds: ['machine-learning-lab'] },
  { id: 'obinna-eze', name: 'Obinna Eze', type: 'End user', title: 'Research Engineer', orgIds: ['machine-learning-lab'] },
  { id: 'freya-lindholm', name: 'Freya Lindholm', type: 'End user', title: 'Doctoral Candidate', orgIds: ['machine-learning-lab'] },

  // The deep Computer Science chain below Machine Learning Lab
  { id: 'anneke-vos', name: 'Anneke Vos', type: 'End user', title: 'Group Lead', orgIds: ['neural-networks-group'] },
  { id: 'mateo-guerrero', name: 'Mateo Guerrero', type: 'End user', title: 'Research Scientist', orgIds: ['neural-networks-group'] },
  { id: 'lena-fischer', name: 'Lena Fischer', type: 'End user', title: 'Unit Lead', orgIds: ['deep-learning-unit'] },
  { id: 'kwame-asante', name: 'Kwame Asante', type: 'End user', title: 'ML Engineer', orgIds: ['deep-learning-unit'] },
  { id: 'siobhan-doherty', name: 'Siobhan Doherty', type: 'End user', title: 'Team Lead', orgIds: ['computer-vision-team'] },
  { id: 'raul-mendoza', name: 'Raul Mendoza', type: 'End user', title: 'Vision Researcher', orgIds: ['computer-vision-team'] },
  { id: 'thandiwe-mokoena', name: 'Thandiwe Mokoena', type: 'End user', title: 'Postdoctoral Researcher', orgIds: ['computer-vision-team'] },
  { id: 'georgi-ivanov', name: 'Georgi Ivanov', type: 'End user', title: 'Research Assistant', orgIds: ['neural-networks-group'] },
  { id: 'amelie-caron', name: 'Amelie Caron', type: 'End user', title: 'Doctoral Candidate', orgIds: ['deep-learning-unit'] },
  { id: 'chiara-bellini', name: 'Chiara Bellini', type: 'End user', title: 'Squad Lead', orgIds: ['image-recognition-squad'] },
  { id: 'tobias-lang', name: 'Tobias Lang', type: 'End user', title: 'Data Annotator', orgIds: ['image-recognition-squad'] },
  { id: 'nour-haddad', name: 'Nour Haddad', type: 'End user', title: 'Training Lead', orgIds: ['model-training-pod'] },
  { id: 'evgeni-petrov', name: 'Evgeni Petrov', type: 'End user', title: 'Pipeline Engineer', orgIds: ['model-training-pod'] },
  { id: 'marisol-reyes', name: 'Marisol Reyes', type: 'End user', title: 'Cluster Administrator', orgIds: ['gpu-cluster-ops'] },
  { id: 'declan-byrne', name: 'Declan Byrne', type: 'End user', title: 'Infrastructure Engineer', orgIds: ['gpu-cluster-ops'] },

  // The AI-level siblings and their descent
  { id: 'ingrid-halvorsen', name: 'Ingrid Halvorsen', type: 'End user', title: 'Lab Director', orgIds: ['natural-language-lab'] },
  { id: 'oscar-delgado', name: 'Oscar Delgado', type: 'End user', title: 'Computational Linguist', orgIds: ['natural-language-lab'] },
  { id: 'yara-nasser', name: 'Yara Nasser', type: 'End user', title: 'Lab Director', orgIds: ['robotics-lab'] },
  { id: 'pavel-novak', name: 'Pavel Novak', type: 'End user', title: 'Robotics Engineer', orgIds: ['robotics-lab'] },
  { id: 'linnea-berg', name: 'Linnea Berg', type: 'End user', title: 'Group Lead', orgIds: ['speech-processing-group'] },
  { id: 'hassan-qureshi', name: 'Hassan Qureshi', type: 'End user', title: 'Speech Scientist', orgIds: ['speech-processing-group'] },
  { id: 'juliet-adeyinka', name: 'Juliet Adeyinka', type: 'End user', title: 'Transcription Lead', orgIds: ['transcription-team'] },

  // Sibling of Computer Vision Team
  { id: 'karin-lindgren', name: 'Karin Lindgren', type: 'End user', title: 'Team Lead', orgIds: ['speech-recognition-team'] },
  { id: 'diego-salazar', name: 'Diego Salazar', type: 'End user', title: 'Audio Engineer', orgIds: ['speech-recognition-team'] },

  // Siblings of GPU Cluster Ops
  { id: 'noor-rahman', name: 'Noor Rahman', type: 'End user', title: 'Curation Lead', orgIds: ['dataset-curation-pod'] },
  { id: 'esther-mwangi', name: 'Esther Mwangi', type: 'End user', title: 'Data Steward', orgIds: ['dataset-curation-pod'] },
  { id: 'viktor-sorensen', name: 'Viktor Sorensen', type: 'End user', title: 'Evaluation Lead', orgIds: ['evaluation-pod'] },
  { id: 'aria-behzadi', name: 'Aria Behzadi', type: 'End user', title: 'Serving Engineer', orgIds: ['inference-serving-pod'] },

  // Mathematics siblings and the Applied Mathematics descent
  { id: 'ottoline-frank', name: 'Ottoline Frank', type: 'End user', title: 'Professor', orgIds: ['pure-mathematics'] },
  { id: 'mikael-sundberg', name: 'Mikael Sundberg', type: 'End user', title: 'Lecturer', orgIds: ['pure-mathematics'] },
  { id: 'chandra-iyer', name: 'Chandra Iyer', type: 'End user', title: 'Head of Statistics', orgIds: ['statistics'] },
  { id: 'lorna-fitzgerald', name: 'Lorna Fitzgerald', type: 'End user', title: 'Biostatistician', orgIds: ['statistics'] },
  { id: 'emeka-nwosu', name: 'Emeka Nwosu', type: 'End user', title: 'Group Lead', orgIds: ['numerical-analysis-group'] },
  { id: 'sanne-de-vries', name: 'Sanne de Vries', type: 'End user', title: 'Numerical Analyst', orgIds: ['numerical-analysis-group'] },
  { id: 'gustavo-pinto', name: 'Gustavo Pinto', type: 'End user', title: 'Simulation Engineer', orgIds: ['simulation-team'] },

  // Mathematics
  { id: 'jonas-lindqvist', name: 'Jonas Lindqvist', type: 'End user', title: 'Professor', orgIds: ['mathematics'] },
  { id: 'nadia-haddad', name: 'Nadia Haddad', type: 'End user', title: 'Lecturer', orgIds: ['mathematics'] },
  { id: 'tomas-varga', name: 'Tomas Varga', type: 'End user', title: 'Teaching Assistant', orgIds: ['mathematics'] },
  { id: 'grace-mbeki', name: 'Grace Mbeki', type: 'End user', title: 'Department Coordinator', orgIds: ['mathematics'] },

  // Applied Mathematics (one level below Mathematics)
  { id: 'ruth-castellanos', name: 'Ruth Castellanos', type: 'End user', title: 'Research Fellow', orgIds: ['applied-mathematics'] },
  { id: 'benedikt-hofer', name: 'Benedikt Hofer', type: 'End user', title: 'Statistician', orgIds: ['applied-mathematics'] },
  { id: 'priscilla-adeyemi', name: 'Priscilla Adeyemi', type: 'End user', title: 'Postdoctoral Researcher', orgIds: ['applied-mathematics'] },

  // Engineering (department level, above its two sub-teams)
  { id: 'oliver-brandt', name: 'Oliver Brandt', type: 'End user', title: 'Department Administrator', orgIds: ['engineering'] },
  { id: 'dana-whitfield', name: 'Dana Whitfield', type: 'End user', title: 'Faculty Lead', orgIds: ['engineering'] },
  { id: 'samir-patel', name: 'Samir Patel', type: 'End user', title: 'Professor', orgIds: ['engineering'] },

  // Mobile App Team
  { id: 'tim-mclean', name: 'Tim McLean', type: 'End user', title: 'Engineering Manager', orgIds: ['mobile-app-team'] },
  { id: 'yuki-tanaka', name: 'Yuki Tanaka', type: 'End user', title: 'iOS Developer', orgIds: ['mobile-app-team'] },
  { id: 'lucas-ferreira', name: 'Lucas Ferreira', type: 'End user', title: 'Android Developer', orgIds: ['mobile-app-team'] },
  { id: 'hannah-mcgrath', name: 'Hannah McGrath', type: 'End user', title: 'QA Engineer', orgIds: ['mobile-app-team'] },

  // iOS Squad (below Mobile App Team)
  { id: 'felix-nordstrom', name: 'Felix Nordstrom', type: 'End user', title: 'Squad Lead', orgIds: ['ios-squad'] },
  { id: 'rosalind-akana', name: 'Rosalind Akana', type: 'End user', title: 'Senior iOS Engineer', orgIds: ['ios-squad'] },
  { id: 'devon-marsh', name: 'Devon Marsh', type: 'End user', title: 'iOS Engineer', orgIds: ['ios-squad'] },

  // Build & Release (below iOS Squad — the deepest node in the tree)
  { id: 'ingrid-solberg', name: 'Ingrid Solberg', type: 'End user', title: 'Release Manager', orgIds: ['build-release'] },
  { id: 'callum-baptiste', name: 'Callum Baptiste', type: 'End user', title: 'Build Engineer', orgIds: ['build-release'] },

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
 * The at-scale roster: an oversized list of *departments* for V4.
 *
 * They hang off **Bramblewick University**, the organization the prototype opens
 * on, so the at-scale case is the first thing V4 shows rather than something you
 * have to drill two levels to reach. Bramblewick also has three hand-written
 * child organizations, which stay at the top of the list — the arrangement a
 * reader would actually meet.
 *
 * Departments rather than end users because the question V4 asks is about the
 * *hierarchy* at width: centring the view caps how deep the tree goes but says
 * nothing about how many children one node can have. A hundred sibling
 * organizations is the case the focused view doesn't bound. End users were V2's
 * subject, and went with it when that version came off the table.
 *
 * These are leaves — nothing hangs below them. A department with its own
 * sub-structure would be a second variable, and depth is already covered by the
 * hand-written Computer Science chain.
 *
 * Kept out of ORGANIZATIONS and layered in only when the view asks for it, so
 * V1 and V2 keep the small hand-written tree that makes their treatments readable.
 *
 * The roster runs past one page on purpose. V4 shows up to 100 rows at a time and
 * paginates beyond that, so a list that stopped at 100 would sit on the boundary
 * and never draw the pager — there'd be nothing to stress test.
 *
 * Names come from a fixed list rather than being generated: the row count is the
 * variable under test, and a list that reshuffles every render would make
 * screenshots from a review meeting impossible to compare.
 */
const AT_SCALE_DEPARTMENT_NAMES = [
  'Accounting', 'Aerospace Engineering', 'African Studies', 'Agricultural Sciences', 'American Literature',
  'Anatomy', 'Ancient History', 'Anthropology', 'Applied Linguistics', 'Applied Physics',
  'Arabic Studies', 'Archaeology', 'Architecture', 'Art History', 'Astronomy',
  'Astrophysics', 'Athletics Administration', 'Audiology', 'Biochemistry', 'Bioinformatics',
  'Biomedical Engineering', 'Botany', 'Business Administration', 'Cardiology Research', 'Cartography',
  'Ceramics', 'Chemical Engineering', 'Chemistry', 'Chinese Studies', 'Civil Engineering',
  'Classics', 'Climate Science', 'Cognitive Science', 'Communications', 'Comparative Literature',
  'Composition Studies', 'Conservation Biology', 'Construction Management', 'Criminology', 'Cultural Studies',
  'Curriculum Studies', 'Dance', 'Data Science', 'Demography', 'Dentistry',
  'Dermatology Research', 'Development Studies', 'Digital Humanities', 'Drama', 'Earth Sciences',
  'East Asian Studies', 'Ecology', 'Econometrics', 'Economics', 'Education Policy',
  'Electrical Engineering', 'Electronics', 'Elementary Education', 'Endocrinology Research', 'Energy Systems',
  'English Literature', 'Entomology', 'Entrepreneurship', 'Environmental Engineering', 'Environmental Law',
  'Epidemiology', 'Ethics', 'Ethnomusicology', 'European Studies', 'Exercise Science',
  'Film Studies', 'Finance', 'Fine Arts', 'Food Science', 'Forestry',
  'French Studies', 'Gastronomy', 'Genetics', 'Geochemistry', 'Geography',
  'Geology', 'Geophysics', 'German Studies', 'Gerontology', 'Global Health',
  'Graphic Design', 'Greek Studies', 'Health Informatics', 'Hebrew Studies', 'Hispanic Studies',
  'History of Science', 'Horticulture', 'Hospitality Management', 'Human Resources', 'Hydrology',
  'Immunology', 'Industrial Design', 'Industrial Engineering', 'Information Systems', 'Interior Architecture',
  /* Page two onward — 47 more. With Bramblewick's three hand-written child orgs
     that totals 150, so the second page holds 50: enough to read as a real page
     rather than a stray remainder, and not a round multiple of the page size,
     which would hide the part-full last page. */
  'International Relations', 'Islamic Studies', 'Italian Studies', 'Japanese Studies', 'Jazz Studies',
  'Journalism', 'Judaic Studies', 'Kinesiology', 'Korean Studies', 'Labour Economics',
  'Landscape Architecture', 'Latin American Studies', 'Law', 'Library Science', 'Linguistics',
  'Logistics', 'Marine Biology', 'Marketing', 'Materials Science', 'Mechanical Engineering',
  'Media Studies', 'Medical Physics', 'Medieval Studies', 'Meteorology', 'Microbiology',
  'Middle Eastern Studies', 'Military History', 'Mineralogy', 'Molecular Biology', 'Museum Studies',
  'Music Theory', 'Nanotechnology', 'Naval Architecture', 'Neuroscience', 'Nuclear Engineering',
  'Nursing', 'Nutrition Science', 'Occupational Therapy', 'Oceanography', 'Oncology Research',
  'Operations Research', 'Ophthalmology Research', 'Optometry', 'Organic Chemistry', 'Orthopaedics Research',
  'Paediatrics Research', 'Palaeontology',
]

/**
 * 25 more, continuing the alphabet past Palaeontology — V3's addition.
 *
 * A separate block rather than 25 more entries above, because V4's totals are
 * load-bearing: 147 generated plus Bramblewick's 3 hand-written children is 150,
 * which puts V4's second page at exactly 50 rows — a real page rather than a stray
 * remainder, and deliberately not a round multiple of the page size. V3 wants 175
 * children, and editing the list in place to get there would silently re-cut a
 * version already under review. So the two take different slices of one roster:
 * `atScale` is V4's 147, `wide` is all 172.
 */
const WIDE_ONLY_DEPARTMENT_NAMES = [
  'Pathology', 'Performance Studies', 'Petroleum Engineering', 'Pharmacology', 'Philosophy',
  'Photography', 'Physical Therapy', 'Physics', 'Physiology', 'Planetary Science',
  'Plant Pathology', 'Political Science', 'Polymer Science', 'Portuguese Studies', 'Psychiatry Research',
  'Psychology', 'Public Administration', 'Public Health', 'Quantum Computing', 'Radiology Research',
  'Real Estate', 'Rehabilitation Science', 'Religious Studies', 'Renaissance Studies', 'Robotics Engineering',
]

/** The organization the at-scale departments hang off. */
export const AT_SCALE_PARENT_ID = 'bramblewick'

const toDepartment = (name) => ({
  // `scale-` prefixed so these can never collide with a hand-written organization.
  id: `scale-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  name,
  // Cost Center, the same type the hand-written departments carry.
  type: 'Cost Center',
  parentId: AT_SCALE_PARENT_ID,
})

/** V4's roster: 147, so Bramblewick has 150 children. */
const AT_SCALE_DEPARTMENTS = AT_SCALE_DEPARTMENT_NAMES.map(toDepartment)

/** V3's roster: 172, so Bramblewick has 175 children. */
const WIDE_DEPARTMENTS = [
  ...AT_SCALE_DEPARTMENTS,
  ...WIDE_ONLY_DEPARTMENT_NAMES.map(toDepartment),
]

// Every generated id, both rosters. Used to spot a department the small-tree
// versions can't show, so it has to cover the wider list too.
const AT_SCALE_IDS = new Set(WIDE_DEPARTMENTS.map((org) => org.id))

/** Is this a generated department? True for nothing V1 or V2 can show. */
export const isAtScaleOrg = (orgId) => AT_SCALE_IDS.has(orgId)

/**
 * The personas the prototype can switch between. `attachedOrgId` is the single
 * node a person is attached to; their visible tree is that node plus every
 * descendant — the cascade this feature is meant to deliver.
 */
export const PERSONAS = [
  {
    id: 'head-of-engineering',
    personId: 'adrian-whitlock',
    name: 'Adrian Whitlock',
    role: 'Head of Engineering',
    attachedOrgId: 'bramblewick',
    userType: 'Agent',
    access: 'Can view tickets in this org and below',
    email: 'adrian.whitlock@bramblewick.edu',
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
    email: 'rachel.martinez@bramblewick.edu',
    timeZone: '(GMT+10:00) Melbourne',
    language: 'English (United States)',
    ticketCount: 1,
  },
]

/* ---------------------------------------------------------------- selectors */

/* The at-scale departments are layered in by option rather than living in
   ORGANIZATIONS, so V1 and V2 never see them. `getOrganization` is the exception: it
   resolves them unconditionally, because once V4 has re-centred the page on
   "Nanotechnology" the header, the breadcrumb path and the tab counts all have to
   name it — and the option isn't threaded through every one of those call sites.
   Nothing can reach these ids in V1 or V2 anyway: no row links to them. */
export const getOrganization = (orgId) =>
  ORGANIZATIONS.find((org) => org.id === orgId) ||
  AT_SCALE_DEPARTMENTS.find((org) => org.id === orgId)

/**
 * Organizations sitting directly under `orgId`.
 *
 * `atScale` appends V4's oversized department list to the organization it hangs
 * off. It appends rather than replaces, because Bramblewick's three hand-written
 * children (Computer Science, Mathematics, Engineering) carry the deep chain the
 * other versions are built around, and dropping them to reach a round number
 * would cost more than the round number is worth. They come first, so the top of
 * V4's list is the same as V1's.
 *
 * `wide` is V3's longer roster — the same list plus 25, for 175 children. Both
 * flags exist rather than one number because V4's 150 is fixed by its paging
 * arithmetic; see WIDE_ONLY_DEPARTMENT_NAMES.
 */
export const getChildren = (orgId, { atScale = false, wide = false } = {}) => {
  const own = ORGANIZATIONS.filter((org) => org.parentId === orgId)
  if (orgId !== AT_SCALE_PARENT_ID) return own
  // `wide` is V3's 175; `atScale` is V4's 150. Checked first because V3 passes
  // both — it is the at-scale case, just a wider one.
  if (wide) return [...own, ...WIDE_DEPARTMENTS]
  if (atScale) return [...own, ...AT_SCALE_DEPARTMENTS]
  return own
}

/** People sitting directly in `orgId`. */
export const getPeopleIn = (orgId) => PEOPLE.filter((person) => person.orgIds.includes(orgId))

/** Every organization beneath `orgId`, at any depth. Excludes `orgId` itself. */
export const getDescendantIds = (orgId, options) =>
  getChildren(orgId, options).flatMap((child) => [
    child.id,
    ...getDescendantIds(child.id, options),
  ])

/** Root-to-node path, inclusive of `orgId`. */
export const getPath = (orgId) => {
  const org = getOrganization(orgId)
  if (!org) return []
  return org.parentId ? [...getPath(org.parentId), org] : [org]
}

/** Count of people in `orgId` and everything below it — the "reach" of a node. */
export const countPeopleAtOrBelow = (orgId, options) =>
  [orgId, ...getDescendantIds(orgId, options)].reduce(
    (total, id) => total + getPeopleIn(id).length,
    0,
  )

export const getPersona = (personaId) =>
  PERSONAS.find((persona) => persona.id === personaId) || PERSONAS[0]
