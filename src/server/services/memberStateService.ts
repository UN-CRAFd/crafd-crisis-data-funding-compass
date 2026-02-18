/**
 * Member State Service
 *
 * Returns the list of UN member states.
 */

import { findAllMemberStates } from "../repositories/memberStateRepository";

export async function getMemberStates(): Promise<string[]> {
  return findAllMemberStates();
}
