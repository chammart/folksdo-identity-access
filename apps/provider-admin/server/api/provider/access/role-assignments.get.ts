import { iamRequest, queryString } from "../../../utils/iam"
export default defineEventHandler(e=>iamRequest(e,"/api/v1/access/role-assignments"+queryString(e,["tenantId","identityId","membershipId","roleId","status","offset","limit"]),{authenticated:true}))
