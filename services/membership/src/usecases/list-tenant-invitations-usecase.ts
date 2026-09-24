import type { InvitationResult, ListTenantInvitationsRequest } from "../api";
import type { MembershipReadStore } from "../read-store";
import { toInvitationResult } from "./invitation-result";
export interface ListTenantInvitationsUseCase { execute(tenantId: string, input: ListTenantInvitationsRequest): Promise<readonly InvitationResult[]>; }
export function createListTenantInvitationsUseCase(readStore: MembershipReadStore): ListTenantInvitationsUseCase {
 return { async execute(tenantId,input) { return (await readStore.listInvitationsByTenant(tenantId,input.status)).map(toInvitationResult); } };
}
