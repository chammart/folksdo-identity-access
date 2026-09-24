// services/membership/src/runtime/membership-runtime.ts
// -----------------------------------------------------------------------------
// MEMBERSHIP RUNTIME
// -----------------------------------------------------------------------------
// Public runtime contract returned by the Membership Operations™ composition
// root.
//
// Purpose:
//   • expose the Membership API façade to the host
//   • expose Membership reaction dispatching to runtime adapters
//   • keep composed use cases and infrastructure dependencies private
//
// Boundary:
//   • contains no runtime creation logic
//   • contains no business logic
//   • exposes only stable service-owned entry points
// -----------------------------------------------------------------------------

import type {
    MembershipApi,
} from "../api";

import type { MembershipReactionDispatcher } from "../reactions";
import type { InvitationExpirationWorker } from "../workers";

// -----------------------------------------------------------------------------
// PUBLIC RUNTIME CONTRACT
// -----------------------------------------------------------------------------

export interface MembershipRuntime {
    readonly api:
    MembershipApi;

    readonly reactions: MembershipReactionDispatcher;
    readonly invitationExpirationWorker: InvitationExpirationWorker;
}