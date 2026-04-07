<template>
  <div class="device-config">
    <!-- 기본 정보 영역 -->
    <div class="config-card">
      <div class="config-section">
        <h3>기본 정보</h3>
      </div>
      <div class="field-row">
        <label for="dev-name">Name</label>
        <InputText id="dev-name" v-model="deviceData.name" @blur="saveData" placeholder="디바이스 이름 입력" />
      </div>
      <div class="field-row">
        <label for="dev-desc">Desc</label>
        <InputText id="dev-desc" v-model="deviceData.desc" @blur="saveData" placeholder="설명 입력" />
      </div>
    </div>

    <!-- 포트 정보 -->
    <div class="config-card">
      <div class="config-section">
        <h3>포트 정보</h3>
      </div>
      <DataTable :value="deviceData.ports" editMode="cell" class="p-datatable-sm" responsiveLayout="scroll">
        <Column field="portNum" header="포트"></Column>
        <Column field="protocol" header="프로토콜">
          <template #body="{ data }">
            <Select v-model="data.protocol" :options="protocolOptions" @change="saveData" class="w-full" />
          </template>
        </Column>
        <Column field="networkNum" header="네트워크 번호" style="width: 120px">
          <template #body="{ data }">
            <InputNumber v-if="!['NONE', 'RevPI', 'NASA', 'BACnet/IP', 'Modbus/TCP'].includes(data.protocol)" v-model="data.networkNum" :useGrouping="false" @blur="saveData" class="w-full" />
          </template>
        </Column>
        <Column field="baudRate" header="Baud Rate">
          <template #body="{ data }">
            <Select v-if="!['NONE', 'RevPI', 'NASA', 'BACnet/IP', 'Modbus/TCP'].includes(data.protocol)" v-model="data.baudRate" :options="baudRateOptions" @change="saveData" class="w-full" />
          </template>
        </Column>
        <Column field="dataBits" header="Data Bits" style="width: 120px">
          <template #body="{ data }">
            <Select v-if="!['NONE', 'RevPI', 'NASA', 'BACnet/IP', 'Modbus/TCP'].includes(data.protocol)" v-model="data.dataBits" :options="dataBitOptions" @change="saveData" class="w-full" />
          </template>
        </Column>
        <Column field="stopBits" header="Stop Bits">
          <template #body="{ data }">
            <Select v-if="!['NONE', 'RevPI', 'NASA', 'BACnet/IP', 'Modbus/TCP'].includes(data.protocol)" v-model="data.stopBits" :options="stopBitOptions" @change="saveData" class="w-full" />
          </template>
        </Column>
        <Column field="parity" header="Parity">
          <template #body="{ data }">
            <Select v-if="!['NONE', 'RevPI', 'NASA', 'BACnet/IP', 'Modbus/TCP'].includes(data.protocol)" v-model="data.parity" :options="parityOptions" @change="saveData" class="w-full" />
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- 확장 디바이스 정보 -->
    <div class="config-card">
      <div class="config-section">
        <h3>확장 디바이스 정보</h3>
      </div>
      <Tabs value="1">
        <TabList>
          <Tab v-for="port in deviceData.ports" :key="'tab-'+port.portNum" :value="port.portNum.toString()">
            포트 {{ port.portNum }}
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel v-for="port in deviceData.ports" :key="'panel-'+port.portNum" :value="port.portNum.toString()">
            <div style="display: flex; gap: 1.5rem; width: 100%;">
              <DataTable v-for="colIdx in 3" :key="'col-'+colIdx" :value="port.modules.slice((colIdx - 1) * 10, colIdx * 10)" class="p-datatable-sm" style="flex: 1;">
                <Column field="num" header="번호" style="width: 60px"></Column>
                <Column field="type" header="확장 디바이스 타입">
                  <template #body="{ data }">
                    <Select v-model="data.type" :options="moduleOptions" @change="saveData" class="w-full" placeholder="NONE" />
                  </template>
                </Column>
              </DataTable>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <!-- 통보 대상 (Recipient) -->
    <div class="config-card">
      <div class="config-section">
        <h3>통보 대상 (Recipient)</h3>
      </div>
      <div v-for="(rec, index) in deviceData.recipients" :key="index" class="recipient-row">
        <label>항목 {{ index + 1 }}</label>
        <InputText v-model="deviceData.recipients[index]" @blur="saveData" placeholder="통보 대상 입력" />
        <Button icon="pi pi-trash" severity="danger" text @click="removeRecipient(index)" v-if="deviceData.recipients.length > 1" />
      </div>
      <Button icon="pi pi-plus" label="추가" outlined @click="addRecipient" v-if="deviceData.recipients.length < 5" class="mt-2" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useConfigStore } from '../store/configStore'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

const props = defineProps({
  nodeKey: {
    type: String,
    required: true
  }
})

const store = useConfigStore()

// Default options
const protocolOptions = ['NONE', 'BACnet/IP', 'BACnet/MSTP', 'RevPI', 'NASA', 'Modbus/TCP', 'Modbus/RTU']
const baudRateOptions = [9600, 19200, 38400, 57600, 115200]
const dataBitOptions = [7, 8]
const stopBitOptions = [1, 2]
const parityOptions = ['No', 'Even', 'Odd']
const moduleOptions = ['NONE', 'SDDC-8446', 'SIO-6020', 'SIO-0800', 'SIO-0008', 'RevPI-DIO', 'RevPI-DI', 'RevPI-DO', 'RevPI-AIO', 'RevPI-MIO', 'RevPI-RO']

// State
const deviceData = ref({
  name: '',
  desc: '',
  ports: [],
  recipients: ['']
})

const initData = () => {
  // Check if store already has data for this device
  let existData = store.recordsData[props.nodeKey]
  
  if (!existData || Array.isArray(existData)) {
    // Initialize default structure if it doesn't exist or was a generic array
    existData = {
      name: store.selectedNode ? store.selectedNode.label : '',
      desc: '',
      ports: Array.from({ length: 6 }, (_, i) => ({
        portNum: i + 1,
        protocol: i === 0 ? 'RevPI' : 'BACnet/MSTP',
        networkNum: 0,
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'No',
        modules: Array.from({ length: 30 }, (_, j) => ({ num: j + 1, type: 'NONE', name: '' }))
      })),
      recipients: ['']
    }
  }

  // Ensure ports exist
  if (!existData.ports || existData.ports.length === 0) {
    existData.ports = Array.from({ length: 6 }, (_, i) => ({
      portNum: i + 1,
      protocol: i === 0 ? 'RevPI' : 'BACnet/MSTP',
      networkNum: 0,
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: 'No',
      modules: Array.from({ length: 30 }, (_, j) => ({ num: j + 1, type: 'NONE', name: '' }))
    }))
  } else {
    // Add missing modules/fields payload to existing ports
    existData.ports.forEach(port => {
      if (typeof port.networkNum === 'undefined') port.networkNum = 0;
      if (!port.modules || port.modules.length === 0) {
        port.modules = Array.from({ length: 30 }, (_, j) => ({ num: j + 1, type: 'NONE', name: '' }))
      }
    })
  }

  if (!existData.recipients || existData.recipients.length === 0) {
    existData.recipients = ['']
  }

  deviceData.value = existData
  saveData()
}

onMounted(() => {
  initData()
})

watch(() => props.nodeKey, () => {
  initData()
})

const saveData = () => {
  store.recordsData[props.nodeKey] = JSON.parse(JSON.stringify(deviceData.value))
}

const addRecipient = () => {
  if (deviceData.value.recipients.length < 5) {
    deviceData.value.recipients.push('')
    saveData()
  }
}

const removeRecipient = (index) => {
  deviceData.value.recipients.splice(index, 1)
  saveData()
}
</script>

<style scoped>
.device-config {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 2rem;
  overflow: auto;
}

.config-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.config-section h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-main);
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 400px;
}

.field-row label {
  font-weight: 600;
  width: 60px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.recipient-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 500px;
  background: var(--bg-color);
  padding: 0.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.recipient-row label {
  width: 60px;
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.w-full {
  width: 100%;
}

.mt-2 {
  margin-top: 0.5rem;
}

:deep(.p-datatable) {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
}
</style>
