<script setup lang="ts">
const route=useRoute()
const tenantId=ref("")
const membershipId=ref(typeof route.query.membershipId==='string'?route.query.membershipId:"")
const roleId=ref("")
const PAGE_SIZE=25
const offset=ref(0)
const tab=ref("roles")
const roles=ref<any>()
const records=ref<any>()
const intelligence=ref<any>()
const intelligenceKind=ref("")
const failure=ref("")
const explanationAction=ref("")
const explanationResourceType=ref("")
const explanationResourceId=ref("")

async function load(){
  failure.value=""
  try{
    if(tab.value==='roles') roles.value=await $fetch('/api/provider/access/roles',{query:{tenantId:tenantId.value||undefined,offset:offset.value,limit:PAGE_SIZE}})
    else {
      const path=tab.value==='assignments'?'role-assignments':tab.value
      records.value=await $fetch(`/api/provider/access/${path}`,{query:{tenantId:tenantId.value||undefined,membershipId:membershipId.value||undefined,offset:offset.value,limit:PAGE_SIZE}})
    }
  }catch(e:any){failure.value=e?.data?.message??e?.statusMessage??e?.message??'Request failed'}
}
async function inspect(kind:string,id:string){
  failure.value=""
  try{intelligence.value=await $fetch(`/api/provider/access/${kind}/${encodeURIComponent(id)}`);intelligenceKind.value=kind}
  catch(e:any){failure.value=e?.data?.message??e?.statusMessage??e?.message??'Request failed'}
}
async function explain(){
  if(!membershipId.value||!explanationAction.value||!explanationResourceType.value)return
  failure.value=""
  try{
    intelligence.value=await $fetch(`/api/provider/access/explanation/${encodeURIComponent(membershipId.value)}`,{method:'POST',body:{action:explanationAction.value,resource:{type:explanationResourceType.value,...(explanationResourceId.value?{id:explanationResourceId.value}:{})}}})
    intelligenceKind.value='explanation'
  }catch(e:any){failure.value=e?.data?.message??e?.statusMessage??e?.message??'Request failed'}
}
watch(tab,()=>{offset.value=0;load()});watch(tenantId,()=>{offset.value=0});watch(membershipId,()=>{offset.value=0});watch(offset,load);onMounted(load)
</script>
<template><div class="page-stack">
  <div class="page-heading"><div><p class="eyebrow">ACCESS</p><h1>Access</h1><p>Canonical roles, assignments, restrictions and IAM-owned access intelligence.</p></div><button class="secondary-button" @click="load">Refresh</button></div>
  <section class="panel">
    <div class="admin-filters"><input v-model="tenantId" placeholder="Tenant ID (optional)"><input v-model="membershipId" placeholder="Membership ID for access inspection"></div>
    <div class="tabs"><button v-for="t in ['roles','assignments','direct','restrictions']" :key="t" :class="{active:tab===t}" @click="tab=t">{{ t }}</button></div>
    <div v-if="failure" class="alert alert--error">{{ failure }}</div>
    <div v-if="tab==='roles'&&roles?.items?.length" class="table-wrap"><table><thead><tr><th>Role</th><th>Name</th><th>Tenant</th><th>Status</th><th>Impact</th></tr></thead><tbody><tr v-for="item in roles.items" :key="item.roleId"><td class="mono">{{ item.roleId }}</td><td>{{ item.name ?? item.roleName }}</td><td class="mono">{{ item.tenantId ?? '—' }}</td><td>{{ item.status ?? item.lifecycleStatus }}</td><td><button class="text-button" @click="roleId=item.roleId;inspect('impact',item.roleId)">Inspect</button></td></tr></tbody></table></div>
    <div v-else-if="tab==='direct'&&records?.items?.length" class="table-wrap"><table><thead><tr><th>Assignment</th><th>Permission</th><th>Effect</th><th>Subject</th><th>Tenant</th><th>Status</th><th>Expires</th></tr></thead><tbody><tr v-for="item in records.items" :key="item.assignmentId"><td class="mono">{{ item.assignmentId }}</td><td class="mono">{{ item.permissionId }}</td><td><span class="pill">{{ item.effect }}</span></td><td><span class="mono">{{ item.subjectType }}:{{ item.subjectId }}</span></td><td class="mono">{{ item.tenantId ?? '—' }}</td><td>{{ item.status }}</td><td>{{ item.expiresAt ?? '—' }}</td></tr></tbody></table></div>
    <div v-else-if="tab!=='roles'&&records?.items?.length" class="table-wrap"><table><thead><tr><th>ID</th><th>Membership</th><th>Identity</th><th>Tenant</th><th>Status</th></tr></thead><tbody><tr v-for="(item,i) in records.items" :key="item.assignmentId??item.restrictionId??i"><td class="mono">{{ item.assignmentId ?? item.restrictionId ?? '—' }}</td><td class="mono">{{ item.membershipId ?? item.target?.membershipId ?? '—' }}</td><td class="mono">{{ item.identityId ?? '—' }}</td><td class="mono">{{ item.tenantId ?? '—' }}</td><td>{{ item.status ?? '—' }}</td></tr></tbody></table></div>
    <div v-else class="empty-state"><strong>No records returned</strong><p>Use the filters or choose another Access view.</p></div>
    <AppPagination :total="(tab==='roles'?roles?.total:records?.total)??0" :offset="offset" :limit="PAGE_SIZE" @change="offset=$event" />
  </section>

  <section class="panel">
    <div class="panel-heading"><div><p class="eyebrow">ACCESS INTELLIGENCE</p><h2>Membership access</h2></div></div>
    <div class="inspection-actions"><button class="secondary-button" :disabled="!membershipId" @click="inspect('effective',membershipId)">Effective Access</button><button class="secondary-button" :disabled="!membershipId" @click="inspect('summary',membershipId)">Access Summary</button><span v-if="roleId" class="muted">Role impact: {{ roleId }}</span></div>

    <div v-if="intelligenceKind==='summary'&&intelligence" class="summary-grid">
      <div><span>Effective permissions</span><strong>{{ intelligence.effectivePermissionCount }}</strong></div><div><span>Role assignments</span><strong>{{ intelligence.roleAssignmentCount }}</strong></div><div><span>Direct assignments</span><strong>{{ intelligence.directPermissionAssignmentCount }}</strong></div><div><span>Restrictions</span><strong>{{ intelligence.restrictionCount }}</strong></div><div><span>Expiring access</span><strong>{{ intelligence.expiringAccessCount }}</strong></div><div><span>Privileged permissions</span><strong>{{ intelligence.privilegedPermissionCount }}</strong></div><div><span>Privileged access</span><strong>{{ intelligence.hasPrivilegedAccess?'Yes':'No' }}</strong></div><div><span>Membership valid</span><strong>{{ intelligence.membershipIsValid?'Yes':'No' }}</strong></div>
    </div>
    <div v-else-if="intelligenceKind==='effective'&&intelligence" class="access-result">
      <div class="result-meta"><span class="pill" :class="{'pill--good':intelligence.membershipIsValid}">Membership {{ intelligence.membershipIsValid?'valid':'invalid' }}</span><span>{{ intelligence.effectivePermissions?.length ?? 0 }} effective permissions</span><span>{{ intelligence.restrictions?.length ?? 0 }} restrictions</span></div>
      <div v-if="intelligence.effectivePermissions?.length" class="table-wrap"><table><thead><tr><th>Permission</th><th>Service</th><th>Resource</th><th>Action</th><th>Effect</th><th>Source</th><th>Classification</th><th>Expires</th></tr></thead><tbody><tr v-for="entry in intelligence.effectivePermissions" :key="`${entry.permission.permissionId}:${entry.sourceId}`"><td class="mono">{{ entry.permission.permissionId }}</td><td>{{ entry.permission.service }}</td><td>{{ entry.permission.resource }}</td><td>{{ entry.permission.action }}</td><td>{{ entry.effect }}</td><td><span>{{ entry.source }}</span><br><span class="mono">{{ entry.sourceId }}</span></td><td>{{ entry.permission.classification }}</td><td>{{ entry.expiresAt ?? '—' }}</td></tr></tbody></table></div>
      <div v-if="intelligence.restrictions?.length" class="table-wrap access-subsection"><h3>Restrictions</h3><table><thead><tr><th>Restriction</th><th>Status</th><th>Effective</th><th>Expires</th></tr></thead><tbody><tr v-for="item in intelligence.restrictions" :key="item.restrictionId"><td class="mono">{{ item.restrictionId }}</td><td>{{ item.status }}</td><td>{{ item.effectiveFrom ?? '—' }}</td><td>{{ item.expiresAt ?? '—' }}</td></tr></tbody></table></div>
    </div>
    <div v-else-if="intelligenceKind==='explanation'&&intelligence" class="explanation-result"><div class="result-meta"><span class="pill" :class="{'pill--good':intelligence.allowed}">{{ intelligence.allowed?'Allowed':'Denied' }}</span><strong>{{ intelligence.reasonCode }}</strong><span>{{ intelligence.action }}</span></div><dl class="detail-list"><div><dt>Decision</dt><dd class="mono">{{ intelligence.decisionId }}</dd></div><div><dt>Identity</dt><dd class="mono">{{ intelligence.identityId }}</dd></div><div><dt>Membership</dt><dd class="mono">{{ intelligence.membershipId }}</dd></div><div><dt>Tenant</dt><dd class="mono">{{ intelligence.tenantId }}</dd></div><div><dt>Restriction IDs</dt><dd class="mono">{{ intelligence.appliedRestrictionIds?.join(', ') || '—' }}</dd></div></dl></div>
    <pre v-else-if="intelligenceKind==='impact'&&intelligence" class="contract-view">{{ JSON.stringify(intelligence,null,2) }}</pre>
    <div v-else-if="!intelligence" class="empty-state"><strong>Select an IAM access view</strong><p>Results are rendered directly from certified IAM contracts; Provider Admin does not derive access decisions.</p></div>
  </section>

  <section class="panel">
    <div class="panel-heading"><div><p class="eyebrow">ACCESS EXPLANATION</p><h2>Explain a permission decision</h2></div></div>
    <p class="muted">IAM evaluates the requested action for the selected membership and returns the canonical reason and evidence.</p>
    <div class="explanation-form"><input v-model="explanationAction" placeholder="Action, e.g. identity.identity.view"><input v-model="explanationResourceType" placeholder="Resource type, e.g. identity"><input v-model="explanationResourceId" placeholder="Resource ID (optional)"><button class="secondary-button" :disabled="!membershipId||!explanationAction||!explanationResourceType" @click="explain">Explain access</button></div>
  </section>
</div></template>
