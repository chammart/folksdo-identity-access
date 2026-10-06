<script setup lang="ts">
const props=withDefaults(defineProps<{total:number;offset:number;limit:number}>(),{total:0,offset:0,limit:25})
const emit=defineEmits<{change:[offset:number]}>()
const start=computed(()=>props.total===0?0:props.offset+1)
const end=computed(()=>Math.min(props.offset+props.limit,props.total))
const previous=()=>emit('change',Math.max(0,props.offset-props.limit))
const next=()=>emit('change',props.offset+props.limit)
</script>
<template><div v-if="total>0" class="pagination"><span>Showing {{start}}–{{end}} of {{total}}</span><div><button class="secondary-button" :disabled="offset===0" @click="previous">Previous</button><button class="secondary-button" :disabled="offset+limit>=total" @click="next">Next</button></div></div></template>
