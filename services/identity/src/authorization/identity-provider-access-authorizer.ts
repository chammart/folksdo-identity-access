// services/identity/src/authorization/identity-provider-access-authorizer.ts
// -----------------------------------------------------------------------------
// IDENTITY PROVIDER ACCESS AUTHORIZER
// -----------------------------------------------------------------------------
// Provider-neutral authorization port for provider-safe Identity reads.
// Identity never imports Access Operations™ implementation.
// -----------------------------------------------------------------------------
import type { RuntimeContext } from "@folksdo-engine/runtime";
import type { IdentityProviderPermission } from "./identity-provider-permissions";
export interface IdentityProviderAuthorizationRequest { readonly permission:IdentityProviderPermission; readonly resource:{readonly type:"identity";readonly id?:string}; }
export interface IdentityProviderAuthorizationDecision { readonly allowed:boolean; readonly decisionId:string; readonly reasonCode:string; }
export interface IdentityProviderAccessAuthorizer { authorize(request:IdentityProviderAuthorizationRequest,context:RuntimeContext):Promise<IdentityProviderAuthorizationDecision>; }
