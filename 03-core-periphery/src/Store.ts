// 03-core-periphery/src/Store.ts  —  TYPESCRIPT version.
// Only edit this file if you chose TypeScript, and complete just one language.
// Then declare it at the top of SOLUTION.md:  language: "typescript"
//
// Given (do not edit): ./store-data holds the UserRecord type, the seed users,
// and the hash helper. Done for you: verify, which returns only a boolean.
// Your job:
//   - add a hash-free public-profile lookup that returns username and role,
//   - rebuild report so it lists every user without ever including a hash.
// Full description in TASK.md.

import { SEED_USERS, UserRecord, hash } from "./store-data";

export class UserStore {
  private users: Record<string, UserRecord> = SEED_USERS;

  // The one legitimate core operation. It checks a password and returns only a boolean.
  verify(username: string, password: string): boolean {
    const user = this.users[username];
    if (!user) return false;
    return user.passwordHash === hash(password);
  }

  // TODO: add a hash-free public-profile lookup (username and role).

  // TODO: rebuild the report so it lists users without exposing a hash.
}
