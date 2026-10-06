import { iamRequest, queryString } from "../../../utils/iam"
export default defineEventHandler(e=>iamRequest(e,"/api/v1/membership/memberships"+queryString(e,["identityId","tenantId","status","membershipType","createdFrom","createdTo","offset","limit"]),{authenticated:true}))
