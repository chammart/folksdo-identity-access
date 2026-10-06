import { iamRequest, queryString } from "../../../utils/iam"
export default defineEventHandler(async event => await iamRequest(event, `/api/v1/admin/iam/activity${queryString(event,["tenantId","capability","eventType","actorId","requestId","correlationId","from","to","offset","limit"])}`, {authenticated:true}))
