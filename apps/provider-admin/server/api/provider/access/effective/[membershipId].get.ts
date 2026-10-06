import { iamRequest } from "../../../../utils/iam"
export default defineEventHandler(e=>iamRequest(e,`/api/v1/access/effective-access/${encodeURIComponent(getRouterParam(e,"membershipId")!)}`,{authenticated:true}))
