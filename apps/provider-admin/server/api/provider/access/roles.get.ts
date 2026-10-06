import { iamRequest, queryString } from "../../../utils/iam"
export default defineEventHandler(e=>iamRequest(e,"/api/v1/access/roles"+queryString(e,["tenantId","status","offset","limit"]),{authenticated:true}))
