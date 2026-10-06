import { iamRequest, queryString } from "../../../utils/iam"
export default defineEventHandler(async event => await iamRequest(event, `/api/v1/admin/iam/search${queryString(event,["q","limit"])}`, {authenticated:true}))
