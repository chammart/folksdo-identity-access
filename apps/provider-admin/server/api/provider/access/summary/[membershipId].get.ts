import { iamRequest } from "../../../../utils/iam"
export default defineEventHandler(e=>iamRequest(e,`/api/v1/access/access-summary/${encodeURIComponent(getRouterParam(e,"membershipId")!)}`,{authenticated:true}))
