import { iamRequest, queryString } from "../../../utils/iam"
export default defineEventHandler(e=>iamRequest(e,"/api/v1/access/restrictions"+queryString(e,["tenantId","identityId","membershipId","status","offset","limit"]),{authenticated:true}))
