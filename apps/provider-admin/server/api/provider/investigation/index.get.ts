import { iamRequest, queryString } from "../../../utils/iam"
export default defineEventHandler(async event => await iamRequest(event, `/api/v1/admin/iam/investigation${queryString(event,["requestId","correlationId","actorId","tenantId","identityId","membershipId","invitationId","offset","limit"])}`, {authenticated:true}))
