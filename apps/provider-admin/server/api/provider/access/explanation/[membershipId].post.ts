import { iamRequest } from "../../../../utils/iam"
export default defineEventHandler(async e => iamRequest(e,`/api/v1/access/access-explanations/${encodeURIComponent(getRouterParam(e,"membershipId")!)}`,{method:"POST",body:await readBody(e),authenticated:true}))
