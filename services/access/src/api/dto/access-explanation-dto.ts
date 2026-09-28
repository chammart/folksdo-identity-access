// services/access/src/api/dto/access-explanation-dto.ts
// Administration-safe explanation of the canonical Access authorization decision.

import type { AuthorizationDecisionDto } from "./authorization-decision-dto";

export interface AccessExplanationDto extends AuthorizationDecisionDto {
    readonly identityId: string;
}
