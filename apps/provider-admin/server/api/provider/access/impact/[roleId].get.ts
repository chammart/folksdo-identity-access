import { iamRequest } from "../../../../utils/iam"
export default defineEventHandler(e=>iamRequest(e,`/api/v1/access/access-impact/roles/${encodeURIComponent(getRouterParam(e,"roleId")!)}`,{authenticated:true}))
