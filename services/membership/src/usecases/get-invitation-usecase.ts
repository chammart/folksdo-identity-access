import type { InvitationResult } from "../api";
import { InvitationNotFoundError } from "../errors";
import type { MembershipReadStore } from "../read-store";
import { toInvitationResult } from "./invitation-result";
export interface GetInvitationUseCase { execute(invitationId: string): Promise<InvitationResult>; }
export function createGetInvitationUseCase(readStore: MembershipReadStore): GetInvitationUseCase {
 return { async execute(invitationId) { const invitation=await readStore.findInvitationById(invitationId); if(!invitation) throw new InvitationNotFoundError(invitationId); return toInvitationResult(invitation); } };
}
