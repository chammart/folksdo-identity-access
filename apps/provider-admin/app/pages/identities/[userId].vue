<script setup lang="ts">
import { formatAdminDate } from "~/utils/format-date"
const route=useRoute();const {data,error}=await useFetch<any>(`/api/provider/identities/${route.params.userId}`);
const fields=computed(()=>data.value ? [
  ["Identity",data.value.userId],["Email",data.value.email],["Status",data.value.status],["Email verified",data.value.emailVerified ? "Yes":"No"],
  ["Created",formatAdminDate(data.value.createdAt)],["Updated",formatAdminDate(data.value.updatedAt)],["Activated",formatAdminDate(data.value.activatedAt)],["Suspended",formatAdminDate(data.value.suspendedAt)]
].filter(([,v])=>v!==undefined&&v!==null) : [])
</script><template><div class="page-stack"><div class="page-heading"><div><p class="eyebrow">IDENTITY DETAIL</p><h1>{{ data?.email ?? 'Identity' }}</h1><p class="mono">{{ route.params.userId }}</p></div><NuxtLink to="/identities" class="secondary-button">Back</NuxtLink></div><section v-if="error" class="panel error-panel">{{ error.message }}</section><section v-else class="panel"><div class="detail-grid"><div v-for="([label,value]) in fields" :key="String(label)"><span>{{ label }}</span><strong :class="{'mono':String(label)==='Identity'}">{{ value }}</strong></div></div></section></div></template>
