import { iamRequest } from "../../../utils/iam"
import { withoutPersistenceId } from "../../../utils/public-response"
export default defineEventHandler(async e => withoutPersistenceId(await iamRequest(e,`/api/v1/identities/${encodeURIComponent(getRouterParam(e,"userId")!)}`,{authenticated:true})))
