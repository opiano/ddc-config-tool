<template>
  <div class="nc-config-container">
    <TabView v-if="localData && localData.length > 0">
      <TabPanel v-for="(nc, index) in localData" :key="nc.id" :header="'NC ' + nc.inst">
        <div class="nc-form glass-panel">
          
          <!-- Top Section -->
          <div class="field-row">
            <label>Name</label>
            <InputText v-model="nc.name" class="w-full max-w-sm" />
          </div>
          <div class="field-row">
            <label>Desc</label>
            <InputText v-model="nc.desc" class="w-full max-w-sm" />
          </div>
          <div class="field-row mt-2">
            <label>Priority</label>
            <div class="flex-inputs">
              <InputNumber v-model="nc.priority_off" :useGrouping="false" placeholder="0" class="micro-num" :inputStyle="{ width: '100%', minWidth: '0', padding: '0.4rem' }" />
              <InputNumber v-model="nc.priority_fault" :useGrouping="false" placeholder="0" class="micro-num" :inputStyle="{ width: '100%', minWidth: '0', padding: '0.4rem' }" />
              <InputNumber v-model="nc.priority_norm" :useGrouping="false" placeholder="0" class="micro-num" :inputStyle="{ width: '100%', minWidth: '0', padding: '0.4rem' }" />
            </div>
          </div>
          <div class="field-row">
            <label>ACK_Req</label>
            <div class="flex-checkboxes">
              <label class="cb-label"><Checkbox v-model="nc.ack_off" :binary="true" /> toOffnormal</label>
              <label class="cb-label"><Checkbox v-model="nc.ack_fault" :binary="true" /> toFault</label>
              <label class="cb-label"><Checkbox v-model="nc.ack_norm" :binary="true" /> toNormal</label>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <!-- Destinations Section -->
          <div class="destinations-wrapper">
            <div v-for="dIndex in [1, 2]" :key="'dest-' + dIndex" class="destination-block">
              <div class="days-row">
                <label v-for="day in ['mon','tue','wed','thu','fri','sat','sun']" :key="day" class="cb-label cb-day">
                  <Checkbox v-model="nc[`d${dIndex}_${day}`]" :binary="true" /> {{day}}
                </label>
              </div>
              
              <div class="field-row">
                <label>Time</label>
                <div class="flex-inputs time-inputs">
                  <InputMask v-model="nc[`d${dIndex}_time_start`]" mask="99:99:99" placeholder="00:00:00" style="width: 7.5rem;" />
                  <span>~</span>
                  <InputMask v-model="nc[`d${dIndex}_time_end`]" mask="99:99:99" placeholder="00:00:00" style="width: 7.5rem;" />
                </div>
              </div>
              
              <div class="field-row">
                <label>Recipient</label>
                <div>
                  <InputText v-model="nc[`d${dIndex}_recipient`]" placeholder="123 or 0/192.168.1.100/47808" style="width: 16.6rem;" />
                </div>
              </div>
              
              <div class="field-row">
                <label>Proc ID</label>
                <InputNumber v-model="nc[`d${dIndex}_proc_id`]" :useGrouping="false" class="micro-num" :inputStyle="{ width: '100%', minWidth: '0', padding: '0.4rem' }" />
              </div>
              
              <div class="field-row indent-row">
                <label class="cb-label">
                  <Checkbox v-model="nc[`d${dIndex}_confirmed`]" :binary="true" /> confirmed
                </label>
              </div>
              
              <div class="field-row">
                <label>Trans</label>
                <div class="flex-checkboxes">
                  <label class="cb-label"><Checkbox v-model="nc[`d${dIndex}_trans_off`]" :binary="true" /> toOffnormal</label>
                  <label class="cb-label"><Checkbox v-model="nc[`d${dIndex}_trans_fault`]" :binary="true" /> toFault</label>
                  <label class="cb-label"><Checkbox v-model="nc[`d${dIndex}_trans_norm`]" :binary="true" /> toNormal</label>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </TabPanel>
    </TabView>
  </div>
</template>

<script setup>
import { computed, watchEffect, onMounted, ref } from 'vue'
import { useConfigStore } from '../store/configStore'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InputMask from 'primevue/inputmask'
import Checkbox from 'primevue/checkbox'

const store = useConfigStore()
const props = defineProps({
  nodeKey: {
    type: String,
    required: true
  }
})

const booleanFields = [
  'ack_off', 'ack_fault', 'ack_norm',
  'd1_mon', 'd1_tue', 'd1_wed', 'd1_thu', 'd1_fri', 'd1_sat', 'd1_sun', 'd1_confirmed', 'd1_trans_off', 'd1_trans_fault', 'd1_trans_norm',
  'd2_mon', 'd2_tue', 'd2_wed', 'd2_thu', 'd2_fri', 'd2_sat', 'd2_sun', 'd2_confirmed', 'd2_trans_off', 'd2_trans_fault', 'd2_trans_norm'
]

const numericFields = [
  'priority_off', 'priority_fault', 'priority_norm',
  'd1_proc_id', 'd2_proc_id'
]

onMounted(() => {
  // NC 데이터를 3개로 기본 초기화
  if (!store.recordsData[props.nodeKey] || store.recordsData[props.nodeKey].length === 0) {
    const initData = []
    for (let i = 1; i <= 3; i++) {
      const ncObj = {
        id: crypto.randomUUID(),
        inst: i,
        name: '',
        desc: '',
        d1_time_start: '', d1_time_end: '', d1_recipient: '',
        d2_time_start: '', d2_time_end: '', d2_recipient: ''
      }
      booleanFields.forEach(f => ncObj[f] = false)
      numericFields.forEach(f => ncObj[f] = null)
      initData.push(ncObj)
    }
    store.recordsData[props.nodeKey] = initData
  }
})

// 문자열로 복원된 데이터(ex: .txt 파싱 결과)를 boolean 및 Number 타입으로 자동 보정
watchEffect(() => {
  const records = store.recordsData[props.nodeKey]
  if (records && Array.isArray(records)) {
    records.forEach(nc => {
      booleanFields.forEach(k => {
        if (typeof nc[k] === 'string') {
          nc[k] = (nc[k] === 'true' || nc[k] === '1')
        } else if (nc[k] === undefined || nc[k] === null) {
          nc[k] = false
        }
      })
      numericFields.forEach(k => {
        if (typeof nc[k] === 'string' && nc[k].trim() !== '') {
          nc[k] = parseFloat(nc[k])
        }
      })
    })
  }
})

const localData = computed(() => store.recordsData[props.nodeKey] || [])
</script>

<style scoped>
.nc-config-container {
  padding: 1rem;
  overflow-y: auto;
  height: 100%;
}

.glass-panel {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}



.field-row {
  display: flex;
  align-items: center;
  margin-bottom: 0.6rem;
  min-height: 2.5rem;
}

.field-row.align-start {
  align-items: flex-start;
}

.indent-row {
  padding-left: 95px; /* Aligns with input fields offset by label */
}

.field-row > label:first-child {
  width: 80px;
  min-width: 80px;
  text-align: right;
  margin-right: 15px;
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.9em;
}

.flex-inputs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.flex-checkboxes {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.cb-label {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  font-size: 0.9em;
  color: var(--text-color);
}

.cb-day {
  background: var(--surface-hover);
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.mini-num {
  width: 5rem;
}

.micro-num {
  width: 3rem;
}

.time-inputs span {
  font-weight: bold;
  color: var(--text-color);
}

.hint-text {
  font-size: 0.8em;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.block-hint {
  line-height: 1.3;
  margin-top: 0.3rem;
  padding-left: 0.2rem;
}

.divider {
  border-top: 2px solid var(--primary-color);
  opacity: 0.2;
  margin: 1.5rem 0;
}

.destinations-wrapper {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.destination-block {
  flex: 0 1 580px;
  max-width: 580px;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  padding: 1rem;
  background: var(--bg-color);
}

.days-row {
  display: flex;
  flex-wrap: nowrap; /* Force 1 line natively */
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  padding-left: 5px;
}

.mt-2 { margin-top: 0.5rem; }
.max-w-sm { max-width: 16rem; }
</style>
