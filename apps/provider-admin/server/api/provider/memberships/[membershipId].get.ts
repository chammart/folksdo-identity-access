import { iamRequest } from "../../../utils/iam"
import { withoutPersistenceId } from "../../../utils/public-response"
export default defineEventHandler(async e => withoutPersistenceId(await iamRequest(e,`/api/v1/membership/${encodeURIComponent(getRouterParam(e,"membershipId")!)}`,{authenticated:true})))
