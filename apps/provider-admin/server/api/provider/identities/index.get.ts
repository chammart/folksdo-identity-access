import { iamRequest, queryString } from "../../../utils/iam"
export default defineEventHandler(e=>iamRequest(e,"/api/v1/identities"+queryString(e,["search","status","emailVerified","offset","limit"]),{authenticated:true}))
