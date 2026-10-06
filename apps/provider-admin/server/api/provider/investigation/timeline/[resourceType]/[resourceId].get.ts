import { iamRequest } from "../../../../../utils/iam"
const supported=new Set(["identity","membership","invitation","role","assignment"])
export default defineEventHandler(async event => { const type=getRouterParam(event,"resourceType"), id=getRouterParam(event,"resourceId"); if(!type||!supported.has(type)||!id) throw createError({statusCode:400,statusMessage:"Supported timeline resource is required."}); return await iamRequest(event, `/api/v1/admin/iam/timelines/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, {authenticated:true}) })
