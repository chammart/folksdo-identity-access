// Bounded, overlap-safe invitation expiration worker.
import type { RuntimeContext } from "@folksdo-engine/runtime";
import type { MembershipReadStore } from "../read-store";
import type { ExpireInvitationUseCase } from "../usecases";
export interface InvitationExpirationWorker { runOnce(context: RuntimeContext): Promise<{ scanned:number; expired:number; failed:number }>; }
export function createInvitationExpirationWorker(input:{ readStore:MembershipReadStore; expireInvitationUseCase:ExpireInvitationUseCase; now:()=>string; batchSize?:number }):InvitationExpirationWorker {
 let running=false;
 return { async runOnce(context){ if(running) return {scanned:0,expired:0,failed:0}; running=true; try {
   const rows=await input.readStore.listExpiredPendingInvitations(input.now(), input.batchSize ?? 100); let expired=0, failed=0;
   for(const row of rows){ try { await input.expireInvitationUseCase.execute(row.invitationId, context); expired++; } catch { failed++; } }
   return {scanned:rows.length,expired,failed};
 } finally { running=false; } } };
}
