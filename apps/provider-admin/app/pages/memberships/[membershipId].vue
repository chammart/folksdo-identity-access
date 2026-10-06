<script setup lang="ts">
import { formatAdminDate } from "~/utils/format-date"
const route=useRoute();const id=String(route.params.membershipId);const {data,error}=await useFetch<any>(`/api/provider/memberships/${id}`);
const fields=computed(()=>data.value ? [
  ["Membership",data.value.membershipId],["Identity",data.value.identityId],["Tenant",data.value.tenantId],["Type",data.value.membershipType],["Status",data.value.status],
  ["Created",formatAdminDate(data.value.createdAt)],["Updated",formatAdminDate(data.value.updatedAt)],["Activated",formatAdminDate(data.value.activatedAt)],["Suspended",formatAdminDate(data.value.suspendedAt)],["Archived",formatAdminDate(data.value.archivedAt)]
].filter(([,v])=>v!==undefined&&v!==null) : [])
</script><template><div class="page-stack"><div class="page-heading"><div><p class="eyebrow">MEMBERSHIP DETAIL</p><h1>Membership</h1><p class="mono">{{ id }}</p></div><div class="heading-actions"><NuxtLink :to="`/access?membershipId=${encodeURIComponent(id)}`" class="primary-link">Inspect access</NuxtLink><NuxtLink to="/memberships" class="secondary-button">Back</NuxtLink></div></div><section v-if="error" class="panel error-panel">{{ error.message }}</section><section v-else class="panel"><div class="detail-grid"><div v-for="([label,value]) in fields" :key="String(label)"><span>{{ label }}</span><strong :class="{'mono':['Membership','Identity','Tenant'].includes(String(label))}">{{ value }}</strong></div></div></section></div></template>
