<template>
  <div class="main-content">
    <div v-if="!selectedNode" class="empty-state">
      <i class="pi pi-arrow-left" style="font-size: 2rem; color: #ccc;"></i>
      <h2>설정할 항목(노드)을 좌측 트리에서 선택해주세요.</h2>
    </div>

    <div v-else class="table-container">
      <div class="toolbar glass">
        <div class="toolbar-left" style="display: flex; align-items: center; gap: 1rem;">
          <h2 style="margin: 0; white-space: nowrap;">
            {{ selectedNode.label }} 
            <span class="badge" v-if="selectedNode.data.type">{{ selectedNode.data.type === 'group' ? 'OBJECT' : selectedNode.data.type.toUpperCase() }}</span>
          </h2>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <Button label="열기" icon="pi pi-folder-open" @click="triggerFileUpload" severity="secondary" outlined size="small" />
            <Button label="저장" icon="pi pi-save" @click="exportData" severity="secondary" outlined size="small" />
            <Button v-if="selectedNode.data.type !== 'project'" label="메타 정보" icon="pi pi-external-link" @click="showMetaDialog = true" severity="info" outlined size="small" />
            <Button v-if="selectedNode.data.type === 'device'" label="전체 저장" icon="pi pi-download" @click="downloadDeviceZip" severity="success" size="small" />
            <input type="file" ref="fileInput" @change="handleFileUpload" accept=".json, .txt" style="display: none;" />
            <Button v-if="selectedNode.data.type === 'group'" label="항목 추가" icon="pi pi-plus" @click="addRow" severity="primary" size="small" class="shadow-button" />
          </div>
        </div>
        <div class="toolbar-right">
        </div>
      </div>

      <DeviceConfig v-if="selectedNode.data.type === 'device'" :nodeKey="selectedNode.key" :key="'device-' + selectedNode.key + '-' + componentKey" />
      
      <NcConfig v-model:activeIndex="activeNcTabIndex" v-else-if="selectedNode.data.type === 'group' && selectedNode.label === 'NC'" :nodeKey="selectedNode.key" :key="'nc-' + selectedNode.key + '-' + componentKey" />

      <!-- PrimeVue DataTable with Row Editing -->
      <DataTable v-else
        :key="'group-' + selectedNode.key"
        :value="tableData" 
        dataKey="id" 
        editMode="row" 
        v-model:editingRows="editingRows" 
        @row-edit-save="onRowEditSave"
        scrollable
        class="p-datatable-sm"
        stripedRows
      >
        <template #empty>
          해당 노드에 등록된 데이터가 없습니다.
        </template>

        <!-- 편집 및 삭제 (최좌측 고정, 간격 최소화) -->
        <Column :rowEditor="true" style="width: 65px; min-width: 65px" bodyStyle="text-align:right; padding-right: 0.1rem;" headerStyle="min-width: 65px" frozen></Column>
        <Column style="width: 35px; min-width: 35px" bodyStyle="text-align:center; padding: 0.1rem;" headerStyle="min-width: 35px" frozen>
          <template #body="{ data }">
            <Button icon="pi pi-copy" text rounded severity="help" @click="copyRow(data)" title="항목 복사" style="width: 2rem; height: 2rem; padding: 0;" />
          </template>
        </Column>
        <Column style="width: 35px; min-width: 35px" bodyStyle="text-align:left; padding-left: 0;" headerStyle="min-width: 35px" frozen>
          <template #body="{ data }">
            <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteRow(data.id)" title="데이터 삭제" style="width: 2rem; height: 2rem; padding: 0;" />
          </template>
        </Column>
        
        <!-- 동적으로 넘어갈 컬럼 (향후 대응을 위해 Loop 가능하게 구성) -->
        <Column v-for="col in columns" :key="col.field" :field="col.field" :headerStyle="getColumnStyle(col.field)" :bodyStyle="getColumnStyle(col.field)">
          <template #header>
            <div v-if="getColumnDescription(selectedNode?.label, col.field)" :title="getColumnDescription(selectedNode.label, col.field)" style="cursor: help; display: flex; flex-direction: column; align-items: center; color: var(--p-primary-color); line-height: 1;">
              <i class="pi pi-question-circle" style="font-size: 0.7rem; margin-bottom: 0.15rem; opacity: 0.8;"></i>
              <span style="text-decoration: underline dashed; text-underline-offset: 2px;">{{ col.header }}</span>
            </div>
            <span v-else>{{ col.header }}</span>
          </template>
          <template #body="{ data, field }">
            <template v-if="['weekly', 'exception', 'date', 'date-range', 'weekNday'].includes(field)">
              <Button icon="pi pi-cog" label="설정" @click="openSchModal(field, data)" class="p-button-sm" :outlined="!hasSettingContent(field, data)" :severity="hasSettingContent(field, data) ? 'info' : 'secondary'" style="padding: 0.2rem 0.5rem;" />
            </template>
            <template v-else>
              {{ data[field] }}
            </template>
          </template>
          <template #editor="{ data, field }">
            <template v-if="['weekly', 'exception', 'date', 'date-range', 'weekNday'].includes(field)">
              <Button icon="pi pi-cog" label="설정" @click="openSchModal(field, data)" class="p-button-sm" :outlined="!hasSettingContent(field, data)" :severity="hasSettingContent(field, data) ? 'info' : 'secondary'" style="padding: 0.2rem 0.5rem;" />
            </template>
            <template v-else-if="field.toLowerCase().includes('date') && field !== 'reset-date' && !field.startsWith('date-range')">
              <InputNumber v-model="data[field]" :useGrouping="false" placeholder="YYYYMMDD" style="width: 100%; max-width: 100%; min-width: 0;" :inputStyle="{ padding: '0.3rem 0.4rem', width: '100%', minWidth: '0', boxSizing: 'border-box' }" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'timedelay' || field === 'nrState'">
              <InputNumber v-model="data[field]" :useGrouping="false" style="width: 100%; max-width: 100%; min-width: 0;" :inputStyle="{ padding: '0.3rem 0.4rem', width: '100%', minWidth: '0', boxSizing: 'border-box' }" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field.toLowerCase().includes('time')">
              <InputMask v-model="data[field]" mask="99:99:99" placeholder="HH:MM:SS" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'almEnable'">
              <InputText v-model="data[field]" style="width: 50%; max-width: 50%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'cond1'">
              <InputText v-model="data[field]" placeholder="AV-1,LE,7" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'cond2'">
              <InputText v-model="data[field]" placeholder="AV-2,GE,AV-3" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'OP'">
              <InputText v-model="data[field]" placeholder="and" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'action1'">
              <InputText v-model="data[field]" placeholder="AV-1,11" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'action2'">
              <InputText v-model="data[field]" placeholder="100-AV-10,20" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'slave-object-list'">
              <InputText v-model="data[field]" placeholder="AV-1,100-AV-10... max 10" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else-if="field === 'Master_Obj'">
              <InputText v-model="data[field]" placeholder="AV-1" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
            <template v-else>
              <InputText v-model="data[field]" :disabled="isStateTextDisabled(field, data)" style="width: 100%; max-width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" @keydown="handleKeydown($event, field)" />
            </template>
          </template>
        </Column>

      </DataTable>
    </div>

    <!-- 메타 정보 다이얼로그 -->
    <Dialog v-model:visible="showMetaDialog" modal header="메타 정보" :style="{ width: '40rem' }">
      <div class="meta-content" style="background-color: var(--p-surface-100); padding: 1rem; border-radius: 6px; white-space: pre-wrap; font-family: monospace; max-height: 60vh; overflow: auto;">{{ formattedMetaData }}</div>
      <template #footer>
        <Button label="복사" icon="pi pi-copy" severity="success" @click="copyMetaData" />
        <Button label="닫기" icon="pi pi-times" text severity="secondary" @click="showMetaDialog = false" />
      </template>
    </Dialog>

    <!-- Weekly 설정 다이얼로그 -->
    <Dialog v-model:visible="showWeeklyDialog" modal header="Weekly 설정" :style="{ width: '35rem' }">
      <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem 0;">
        <div v-for="(dayCode, dayLabel) in { MON: 'mon', TUE: 'tue', WED: 'wed', THU: 'thu', FRI: 'fri', SAT: 'sat', SUN: 'sun' }" :key="dayCode" style="display: flex; align-items: center; gap: 1rem; width: 100%;">
          <label style="width: 60px; font-weight: 600; color: var(--text-muted, var(--p-text-color)); font-size: 0.9rem; text-align: right;">{{ dayLabel }}</label>
          <InputText v-model="weeklyEditForm[dayCode]" placeholder="HH:MM=value or NULL ... max 10" style="flex: 1; width: 100%;" />
        </div>
      </div>
      <template #footer>
        <Button label="취소" icon="pi pi-times" text severity="secondary" @click="cancelWeeklyData" />
        <Button label="저장" icon="pi pi-check" severity="primary" @click="saveWeeklyData" />
      </template>
    </Dialog>

    <!-- Exception 설정 다이얼로그 -->
    <Dialog v-model:visible="showExceptionDialog" modal header="Exception 설정" :style="{ width: '45rem' }">
      <div style="padding: 1rem 0;">
        <DataTable :value="exceptionEditForm" class="p-datatable-sm" responsiveLayout="scroll">
          <Column field="index" header="No" style="width: 60px; text-align: center;"></Column>
          <Column header="period" style="width: 140px;">
            <template #body="{ data }">
              <InputText v-model="data.period" :placeholder="data.index === 1 ? 'cal-inst' : data.index === 2 ? 'date' : data.index === 3 ? 'date-range' : data.index === 4 ? 'M-W-Dow' : ''" style="width: 100%; box-sizing: border-box;" />
            </template>
          </Column>
          <Column header="tv">
            <template #body="{ data }">
              <InputText v-model="data.tv" style="width: 100%; box-sizing: border-box;" />
            </template>
          </Column>
          <Column header="priority" style="width: 80px;">
            <template #body="{ data }">
              <InputNumber v-model="data.priority" :useGrouping="false" style="width: 100%;" :inputStyle="{ width: '100%', boxSizing: 'border-box' }" />
            </template>
          </Column>
        </DataTable>
      </div>
      <template #footer>
        <Button label="취소" icon="pi pi-times" text severity="secondary" @click="cancelExceptionData" />
        <Button label="저장" icon="pi pi-check" severity="primary" @click="saveExceptionData" />
      </template>
    </Dialog>

    <!-- CAL 설정 다이얼로그 -->
    <Dialog v-model:visible="showCalDialog" modal :header="(calContextType.toUpperCase()) + ' 설정'" :style="{ width: '30rem' }">
      <div style="padding: 1rem 0;">
        <DataTable :value="calEditForm" class="p-datatable-sm" responsiveLayout="scroll">
          <Column field="index" header="No" style="width: 60px; text-align: center;"></Column>
          <Column header="Value">
            <template #body="{ data }">
              <InputNumber v-if="calContextType === 'date'" v-model="data.val" :useGrouping="false" placeholder="YYYYMMDD" style="width: 100%;" :inputStyle="{ width: '100%', boxSizing: 'border-box' }" />
              <InputText v-else v-model="data.val" :placeholder="calContextType === 'weekNday' ? 'M-W-Dow' : ''" style="width: 100%; box-sizing: border-box;" />
            </template>
          </Column>
        </DataTable>
      </div>
      <template #footer>
        <Button label="취소" icon="pi pi-times" text severity="secondary" @click="cancelCalData" />
        <Button label="저장" icon="pi pi-check" severity="primary" @click="saveCalData" />
      </template>
    </Dialog>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '../store/configStore'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InputMask from 'primevue/inputmask'
import DeviceConfig from './DeviceConfig.vue'
import NcConfig from './NcConfig.vue'
import Dialog from 'primevue/dialog'

const store = useConfigStore()
const selectedNode = computed(() => store.selectedNode)
const tableData = computed(() => store.currentRecords)

const groupColumnsMap = {
  AI: ['inst', 'port', 'mod', 'ch', 'name', 'desc', 'thid', 'units', 'maxVal', 'minVal', 'gain', 'bias', 'nc', 'e.detect', 'almEnable', 'almHL', 'almLL', 'deadband', 'timedelay', 'cov.inc', 'pv.inc', 'cov.en', 'tlog.en'],
  AO: ['inst', 'port', 'mod', 'ch', 'name', 'desc', 'thid', 'units', 'maxVal', 'minVal', 'initVal', 'nc', 'e.detect', 'almEnable', 'almHL', 'almLL', 'deadband', 'timedelay', 'cov.inc', 'pv.inc', 'cov.en', 'tlog.en'],
  AV: ['inst', 'port', 'mod', 'ch', 'name', 'desc', 'thid', 'units', 'initVal', 'nc', 'e.detect', 'almEnable', 'almHL', 'almLL', 'deadband', 'timedelay', 'cov.inc', 'pv.inc', 'cov.en', 'tlog.en'],
  BI: ['inst', 'port', 'mod', 'ch', 'name', 'desc', 'thid', 'onTxt', 'offTxt', 'polarity', 'nc', 'e.detect', 'almEnable', 'almVal', 'timedelay', 'cov.en', 'tlog.en'],
  BO: ['inst', 'port', 'mod', 'ch', 'name', 'desc', 'thid', 'onTxt', 'offTxt', 'polarity', 'initVal', 'outMode', 'interval', 'nc', 'e.detect', 'almEnable', 'timedelay', 'fbDevInst', 'fbObject', 'cov.en', 'tlog.en'],
  BV: ['inst', 'port', 'mod', 'ch', 'name', 'desc', 'thid', 'onTxt', 'offTxt', 'initVal', 'nc', 'e.detect', 'almEnable', 'almVal', 'timedelay', 'cov.en', 'tlog.en'],
  MSV: ['inst', 'port', 'mod', 'ch', 'name', 'desc', 'thid', 'initVal', 'nrState', 'st1Txt', 'st2Txt', 'st3Txt', 'st4Txt', 'st5Txt', 'st6Txt', 'st7Txt', 'st8Txt', 'st9Txt', 'st10Txt', 'nc', 'e.detect', 'almEnable', 'timedelay', 'almVals', 'faultVals', 'cov.en', 'tlog.en'],
  NC: ['inst', 'name', 'desc', 'priority_off', 'priority_fault', 'priority_norm', 'ack_off', 'ack_fault', 'ack_norm', 'd1_mon', 'd1_tue', 'd1_wed', 'd1_thu', 'd1_fri', 'd1_sat', 'd1_sun', 'd1_time_start', 'd1_time_end', 'd1_recipient', 'd1_proc_id', 'd1_confirmed', 'd1_trans_off', 'd1_trans_fault', 'd1_trans_norm', 'd2_mon', 'd2_tue', 'd2_wed', 'd2_thu', 'd2_fri', 'd2_sat', 'd2_sun', 'd2_time_start', 'd2_time_end', 'd2_recipient', 'd2_proc_id', 'd2_confirmed', 'd2_trans_off', 'd2_trans_fault', 'd2_trans_norm'],
  TLOG: ['inst', 'name', 'desc', 'startDate', 'startTime', 'endDate', 'endTime', 'enable', 'logDevInst', 'logObject', 'logInterval', 'stopWhenFull', 'nc', 'e.detect', 'almEnable', 'threshold'],
  TOT: ['inst', 'name', 'desc', 'units', 'Ref_DevInst', 'Ref_Object', 'nc', 'e.detect', 'almEnable', 'almHL', 'gain', 'totOpt', 'reset_choice', 'reset-date', 'reset-time'],
  CAL: ['inst', 'name', 'desc', 'date1', 'date2', 'date3', 'date4', 'date5', 'date-range1', 'date-range2', 'date-range3', 'date-range4', 'date-range5', 'weekNday1', 'weekNday2', 'weekNday3', 'weekNday4', 'weekNday5'],
  CGC: ['inst', 'name', 'desc', 'OP', 'cond1', 'cond2', 'pri_for_wr', 'action1', 'action2', 'action3', 'action4'],
  EGC: ['inst', 'name', 'desc', 'Master_Obj', 'pri-for-wr', 'slave-object-list'],
  SCH: ['inst', 'name', 'desc', 'startDate', 'endDate', 'objType', 'def-value', 'object-list', 'priority', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'ex1.period', 'ex1.tv', 'ex1.pri', 'ex2.period', 'ex2.tv', 'ex2.pri', 'ex3.period', 'ex3.tv', 'ex3.pri', 'ex4.period', 'ex4.tv', 'ex4.pri', 'ex5.period', 'ex5.tv', 'ex5.pri', 'ex6.period', 'ex6.tv', 'ex6.pri', 'ex7.period', 'ex7.tv', 'ex7.pri', 'ex8.period', 'ex8.tv', 'ex8.pri', 'ex9.period', 'ex9.tv', 'ex9.pri', 'ex10.period', 'ex10.tv', 'ex10.pri']
}

const columnDescriptionsMap = {}

const getColumnDescription = (groupLabel, field) => {
  if (columnDescriptionsMap[groupLabel] && columnDescriptionsMap[groupLabel][field]) {
    return columnDescriptionsMap[groupLabel][field]
  }
  return null
}

const columns = computed(() => {
  if (!selectedNode.value || selectedNode.value.data.type !== 'group') return []
  
  const groupLabel = selectedNode.value.label

  if (groupColumnsMap[groupLabel]) {
    if (groupLabel === 'SCH') {
      const baseCols = groupColumnsMap[groupLabel].filter(f => 
        !['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(f) && 
        !f.startsWith('ex')
      )
      return [
        ...baseCols.map(f => ({ field: f, header: f })),
        { field: 'weekly', header: 'weekly' },
        { field: 'exception', header: 'exception' }
      ]
    }
    if (groupLabel === 'CAL') {
      const baseCols = groupColumnsMap[groupLabel].filter(f => 
        !f.startsWith('date') && !f.startsWith('weekNday')
      )
      return [
        ...baseCols.map(f => ({ field: f, header: f })),
        { field: 'date', header: 'date' },
        { field: 'date-range', header: 'date-range' },
        { field: 'weekNday', header: 'weekNday' }
      ]
    }
    return groupColumnsMap[groupLabel].map(f => ({ field: f, header: f }))
  }

  // fallback
  return Array.from({ length: 10 }, (_, i) => ({
    field: `col${i + 1}`,
    header: `칼럼 ${i + 1}`
  }))
})

// Keyboard Navigation Intercepts
const handleKeydown = (event, field) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    setTimeout(() => {
      let saveBtn = null
      const tr = event.target.closest('tr');
      if (tr) {
        saveBtn = tr.querySelector('.p-row-editor-save') 
          || tr.querySelector('button[data-pc-section="roweditorsavebutton"]')
          || Array.from(tr.querySelectorAll('button')).find(btn => btn.querySelector('.pi-check'));
      }
      
      // Fallback for detached frozen columns
      if (!saveBtn) {
        const allBtns = Array.from(document.querySelectorAll('button'));
        saveBtn = document.querySelector('.p-row-editor-save') 
          || document.querySelector('button[data-pc-section="roweditorsavebutton"]')
          || allBtns.find(btn => btn.querySelector('.pi-check') && btn.closest('.p-datatable'));
      }

      if (saveBtn) {
        saveBtn.click();
      } else {
        console.warn("Save button not found.");
      }
    }, 100);
  } else if (event.key === 'Tab' && !event.shiftKey) {
    const isLastField = field === columns.value[columns.value.length - 1].field;
    if (isLastField) {
      event.preventDefault();
      const tr = event.target.closest('tr');
      if (tr) {
        const inputs = tr.querySelectorAll('input:not([disabled])');
        if (inputs.length > 0) {
          inputs[0].focus();
        }
      }
    }
  }
}

// DataTable Row 편집 상태 모델
const editingRows = ref([])

const isStateTextDisabled = (field, data) => {
  if (field.startsWith('st') && field.endsWith('Txt')) {
    const x = parseInt(field.replace('st', '').replace('Txt', ''));
    if (!isNaN(x)) {
      return x > (data.nrState || 0);
    }
  }
  return false;
}

const getColumnStyle = (field) => {
  const stringFields = ['name', 'desc', 'thid', 'onTxt', 'offTxt'];
  const isString = stringFields.includes(field) || (field.startsWith('st') && field.endsWith('Txt'));

  if (isString) {
    return 'width: 140px; min-width: 140px; max-width: 140px; overflow: hidden;';
  }

  const smallFields = ['nc', 'e.detect', 'deadband', 'cov.inc', 'pv.inc', 'cov.en', 'tlog.en', 'totOpt'];
  if (smallFields.includes(field)) return 'width: 65px; min-width: 65px; max-width: 65px; overflow: hidden;';
  
  if (field === 'port' || field === 'mod' || field === 'ch') return 'width: 65px; min-width: 65px; max-width: 65px; overflow: hidden;';
  
  if (field === 'nrState') return 'width: 65px; min-width: 65px; max-width: 65px; overflow: hidden;';
  if (field === 'timedelay') return 'width: 75px; min-width: 75px; max-width: 75px; overflow: hidden;';

  if (field === 'Ref_DevInst' || field === 'Ref_Object') return 'width: 90px; min-width: 90px; max-width: 90px; overflow: hidden;';
  if (field === 'reset_choice') return 'width: 100px; min-width: 100px; max-width: 100px; overflow: hidden;';
  if (field === 'reset-date') return 'width: 95px; min-width: 95px; max-width: 95px; overflow: hidden;';

  if (field === 'logDevInst' || field === 'logObject') return 'width: 85px; min-width: 85px; max-width: 85px; overflow: hidden;';
  if (field === 'logInterval') return 'width: 100px; min-width: 100px; max-width: 100px; overflow: hidden;';
  if (field === 'stopWhenFull') return 'width: 110px; min-width: 110px; max-width: 110px; overflow: hidden;';
  
  if (field === 'almEnable' || field === 'threshold') return 'width: 95px; min-width: 95px; max-width: 95px; overflow: hidden;';

  if (field.startsWith('date-range')) return 'width: 130px; min-width: 130px; max-width: 130px; overflow: hidden;';
  if (field.startsWith('weekNday')) return 'width: 105px; min-width: 105px; max-width: 105px; overflow: hidden;';

  if (field === 'inst') return 'width: 65px; min-width: 65px; max-width: 65px; overflow: hidden;';
  if (field === 'slave-object-list') return 'width: 800px; min-width: 800px; max-width: 800px; overflow: hidden;';

  // Specific sizing for SCH types
  if (field === 'object-list') return 'width: 250px; min-width: 250px; max-width: 250px; overflow: hidden;';
  if (field === 'objType') return 'width: 65px; min-width: 65px; max-width: 65px; overflow: hidden;';
  if (field === 'def-value') return 'width: 80px; min-width: 80px; max-width: 80px; overflow: hidden;';
  if (field === 'priority') return 'width: 90px; min-width: 90px; max-width: 90px; overflow: hidden;';
  if (['weekly', 'exception', 'date', 'date-range', 'weekNday'].includes(field)) {
    return 'width: 110px; min-width: 110px; max-width: 110px; overflow: hidden; text-align: left;';
  }

  // Specific sizing for CGC types globally safely bounding
  if (field === 'OP') return 'width: 70px; min-width: 70px; max-width: 70px; overflow: hidden;';
  if (field.includes('-obj') && field !== 'slave-object-list') return 'width: 125px; min-width: 125px; max-width: 125px; overflow: hidden;';
  if (field.includes('-value') || field.includes('-val')) return 'width: 125px; min-width: 125px; max-width: 125px; overflow: hidden;';
  if (field.startsWith('action') || field.startsWith('cond')) return 'width: 160px; min-width: 160px; max-width: 160px; overflow: hidden;';
  if (field.startsWith('comp')) return 'width: 80px; min-width: 80px; max-width: 80px; overflow: hidden;';
  if (field === 'pri_for_wr' || field === 'pri-for-wr') return 'width: 100px; min-width: 100px; max-width: 100px; overflow: hidden;';
  if (field === 'Master_Obj') return 'width: 100px; min-width: 100px; max-width: 100px; overflow: hidden;';

  // Specific sizing for temporal types
  if (field === 'startDate' || field === 'endDate') return 'width: 140px; min-width: 140px; max-width: 140px; overflow: hidden;';
  if (field.toLowerCase().includes('date')) return 'width: 105px; min-width: 105px; max-width: 105px; overflow: hidden;';
  if (field.toLowerCase().includes('time')) return 'width: 110px; min-width: 110px; max-width: 110px; overflow: hidden;';

  // For all other types, squeeze tight matching the header title width
  const calcWidth = Math.max(55, field.length * 8.5 + 32); 
  return `width: ${calcWidth}px; min-width: ${calcWidth}px; max-width: ${calcWidth}px; overflow: hidden;`;
}

const sortTableData = () => {
  if (!selectedNode.value) return
  const records = store.recordsData[selectedNode.value.key]
  if (records && Array.isArray(records)) {
    records.sort((a, b) => {
      const getVal = (v) => {
        const num = parseFloat(v)
        return isNaN(num) ? 0 : num
      }
      
      const aInst = getVal(a.inst), bInst = getVal(b.inst)
      if (aInst !== bInst) return aInst - bInst
      
      const aPort = getVal(a.port), bPort = getVal(b.port)
      if (aPort !== bPort) return aPort - bPort
      
      const aMod = getVal(a.mod), bMod = getVal(b.mod)
      if (aMod !== bMod) return aMod - bMod
      
      const aCh = getVal(a.ch), bCh = getVal(b.ch)
      return aCh - bCh
    })
  }
}

const validateRecord = (recordToSave) => {
  if (!selectedNode.value) return true;

  const gRecords = store.recordsData[selectedNode.value.key] || [];

  const newInst = recordToSave.inst;
  const nPort = recordToSave.port;
  const nMod = recordToSave.mod;
  const nCh = recordToSave.ch;

  const valid = (val) => val !== undefined && val !== null && val !== '';
  const newInstValid = valid(newInst);
  const compositeValid = newInstValid && valid(nPort) && valid(nMod) && valid(nCh);

  let isInstDup = false;
  let isCompositeDup = false;
  let errorMsg = '';

  for (const r of gRecords) {
    if (r.id === recordToSave.id) continue;

    // inst 고유 검증 (오브젝트 그룹별 적용)
    if (newInstValid && valid(r.inst) && String(r.inst) === String(newInst)) {
      isInstDup = true;
      errorMsg = `[중복 오류] inst 값(${newInst})은 현재 오브젝트 그룹 내에서 고유해야 합니다.`;
      break;
    }

    // inst, port, mod, ch 조합 검증 (오브젝트 그룹별 적용)
    if (compositeValid && valid(r.inst) && valid(r.port) && valid(r.mod) && valid(r.ch)) {
      if (String(r.inst) === String(newInst) && 
          String(r.port) === String(nPort) &&
          String(r.mod) === String(nMod) &&
          String(r.ch) === String(nCh)) {
        isCompositeDup = true;
        errorMsg = `[중복 오류] 입력하신 inst, port, mod, ch 조합이 현재 그룹 내에 이미 존재합니다.`;
        break;
      }
    }
  }

  if (isInstDup || isCompositeDup) {
    alert(errorMsg);
    return false;
  }
  return true;
}

const addRow = () => {
  if (!selectedNode.value) return
  
  if (selectedNode.value.label === 'NC') {
    const records = store.recordsData[selectedNode.value.key] || [];
    if (records.length >= 3) {
      alert('NC 항목은 최대 3개까지만 추가할 수 있습니다.');
      return;
    }
    
    // 비어있는 가장 빠른 번호 찾기 (1, 2, 3 중)
    const existingInsts = records.map(r => r.inst);
    let nextInst = 1;
    for (let i = 1; i <= 3; i++) {
      if (!existingInsts.includes(i)) {
        nextInst = i;
        break;
      }
    }

    const booleanFields = [
      'ack_off', 'ack_fault', 'ack_norm', 'd1_mon', 'd1_tue', 'd1_wed', 'd1_thu', 'd1_fri', 'd1_sat', 'd1_sun', 'd1_confirmed', 'd1_trans_off', 'd1_trans_fault', 'd1_trans_norm',
      'd2_mon', 'd2_tue', 'd2_wed', 'd2_thu', 'd2_fri', 'd2_sat', 'd2_sun', 'd2_confirmed', 'd2_trans_off', 'd2_trans_fault', 'd2_trans_norm'
    ];
    const numericFields = ['priority_off', 'priority_fault', 'priority_norm', 'd1_proc_id', 'd2_proc_id'];

    const ncObj = {
      id: crypto.randomUUID(),
      inst: nextInst,
      name: '', desc: '',
      d1_time_start: '', d1_time_end: '', d1_recipient: '',
      d2_time_start: '', d2_time_end: '', d2_recipient: ''
    };
    booleanFields.forEach(f => ncObj[f] = false);
    numericFields.forEach(f => ncObj[f] = null);
    
    // Sort array so tabs reflect order 1,2,3...
    store.addRecord(selectedNode.value.key, ncObj);
    const updatedRecords = store.recordsData[selectedNode.value.key];
    updatedRecords.sort((a, b) => a.inst - b.inst);
    
    return;
  }

  // 새 행 추가시 컬럼 타입에 따라 초기값 설정
  const newRow = columns.value.reduce((acc, col) => {
    if (col.field.includes('Date')) {
      acc[col.field] = null // Number type expected for dates in this schema
    } else {
      acc[col.field] = ''
    }
    return acc
  }, {})
  store.addRecord(selectedNode.value.key, newRow)
  sortTableData()
}

const onRowEditSave = (event) => {
  const { data, newData } = event
  
  if (!validateRecord(newData)) {
    // 에러 발생 시 UI에서 다시 편집 모드로 복구 유지
    setTimeout(() => {
      if (!editingRows.value.find(r => r.id === data.id)) {
        editingRows.value.push(data)
      }
    }, 50)
    return
  }

  store.updateRecord(selectedNode.value.key, newData)
  sortTableData()
}

const copyRow = (rowData) => {
  if (!selectedNode.value) return
  
  // Copy all attributes except the existing internal ID
  const { id, ...cloneData } = rowData

  store.addRecord(selectedNode.value.key, cloneData)
  
  // Pluck the successfully mounted row natively extracting the freshly generated UUID instance
  const records = store.recordsData[selectedNode.value.key]
  const newRef = records[records.length - 1]
  
  // Directly bind onto PrimeVue's reactive edit bounds switching state dynamically
  editingRows.value.push(newRef)
  
  sortTableData()
}

const deleteRow = (id) => {
  if (confirm('해당 설정 데이터를 삭제하시겠습니까?')) {
    store.deleteRecord(selectedNode.value.key, id)
    sortTableData()
  }
}

// Data Actions
const activeNcTabIndex = ref(0)
const componentKey = ref(0)
const fileInput = ref(null)
const showMetaDialog = ref(false)
const showWeeklyDialog = ref(false)
const showExceptionDialog = ref(false)
const activeSchRowData = ref(null)

const weeklyEditForm = ref({
  mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: ''
})

const exceptionEditForm = ref([])

const openSchModal = (type, data) => {
  activeSchRowData.value = data
  if (type === 'weekly') {
    weeklyEditForm.value = {
      mon: data.mon || '',
      tue: data.tue || '',
      wed: data.wed || '',
      thu: data.thu || '',
      fri: data.fri || '',
      sat: data.sat || '',
      sun: data.sun || ''
    }
    showWeeklyDialog.value = true
  } else if (type === 'exception') {
    exceptionEditForm.value = Array.from({ length: 10 }, (_, i) => {
      const k = i + 1
      return {
        index: k,
        period: data[`ex${k}.period`] || '',
        tv: data[`ex${k}.tv`] || '',
        priority: data[`ex${k}.pri`] !== undefined && data[`ex${k}.pri`] !== null && data[`ex${k}.pri`] !== '' ? Number(data[`ex${k}.pri`]) : null
      }
    })
    showExceptionDialog.value = true
  } else if (['date', 'date-range', 'weekNday'].includes(type)) {
    calContextType.value = type
    calEditForm.value = Array.from({ length: 5 }, (_, i) => {
      const k = i + 1
      const actualKey = type === 'date' ? `date${k}` : (type === 'date-range' ? `date-range${k}` : `weekNday${k}`)
      return {
        index: k,
        val: data[actualKey] !== undefined && data[actualKey] !== null ? data[actualKey] : ''
      }
    })
    showCalDialog.value = true
  }
}

const cancelWeeklyData = () => {
  showWeeklyDialog.value = false
}

const hasSettingContent = (field, data) => {
  if (!data) return false;
  if (field === 'weekly') {
    return !!(data.mon || data.tue || data.wed || data.thu || data.fri || data.sat || data.sun);
  }
  if (field === 'exception') {
    for (let i = 1; i <= 10; i++) {
        if (data[`ex${i}.period`] || data[`ex${i}.tv`] || (data[`ex${i}.pri`] !== undefined && data[`ex${i}.pri`] !== null && data[`ex${i}.pri`] !== '')) {
            return true;
        }
    }
    return false;
  }
  if (field === 'date') {
    for (let i=1; i<=5; i++) if (data[`date${i}`]) return true;
  }
  if (field === 'date-range') {
    for (let i=1; i<=5; i++) if (data[`date-range${i}`]) return true;
  }
  if (field === 'weekNday') {
    for (let i=1; i<=5; i++) if (data[`weekNday${i}`]) return true;
  }
  return false;
}

const saveWeeklyData = () => {
  if (activeSchRowData.value) {
    Object.assign(activeSchRowData.value, weeklyEditForm.value)
  }
  showWeeklyDialog.value = false
}

const cancelExceptionData = () => {
  showExceptionDialog.value = false
}

const saveExceptionData = () => {
  if (activeSchRowData.value) {
    exceptionEditForm.value.forEach(row => {
      activeSchRowData.value[`ex${row.index}.period`] = row.period || ''
      activeSchRowData.value[`ex${row.index}.tv`] = row.tv || ''
      activeSchRowData.value[`ex${row.index}.pri`] = row.priority !== null && row.priority !== undefined ? String(row.priority) : ''
    })
  }
  showExceptionDialog.value = false
}

const showCalDialog = ref(false)
const calContextType = ref('')
const calEditForm = ref([])

const cancelCalData = () => {
  showCalDialog.value = false
}

const saveCalData = () => {
  if (activeSchRowData.value) {
    calEditForm.value.forEach(row => {
      const type = calContextType.value
      const actualKey = type === 'date' ? `date${row.index}` : (type === 'date-range' ? `date-range${row.index}` : `weekNday${row.index}`)
      activeSchRowData.value[actualKey] = row.val !== null && row.val !== undefined ? row.val : ''
    })
  }
  showCalDialog.value = false
}

const triggerFileUpload = () => {
  fileInput.value.click()
}

const parseDeviceTextFormat = (text) => {
  const lines = text.split('\n');
  const data = {
    name: '',
    desc: '',
    ports: Array.from({ length: 6 }, (_, i) => ({
      portNum: i + 1,
      protocol: 'NONE',
      networkNum: 0,
      baudRate: 115200,
      dataBits: 8,
      stopBits: 1,
      parity: 'No',
      modules: Array.from({ length: 30 }, (_, j) => ({ num: j + 1, type: 'NONE', name: '' }))
    })),
    recipients: []
  };

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith('NAME=')) {
      data.name = line.substring(5).trim();
    } else if (line.startsWith('DESC=')) {
      data.desc = line.substring(5).trim();
    } else if (line.startsWith('PORT')) {
      const match = line.match(/^PORT(\d+)=(.*)$/);
      if (match) {
        const portId = parseInt(match[1]) - 1;
        const vals = match[2].split(',').map(s => s.trim());
        if (portId >= 0 && portId < 6) {
          data.ports[portId].protocol = vals[0] || 'NONE';
          if (vals.length > 1) {
            data.ports[portId].networkNum = parseInt(vals[1]) || 0;
            data.ports[portId].baudRate = parseInt(vals[2]) || 115200;
            data.ports[portId].dataBits = parseInt(vals[3]) || 8;
            const par = vals[4];
            data.ports[portId].parity = par === 'E' ? 'Even' : (par === 'O' ? 'Odd' : 'No');
            data.ports[portId].stopBits = parseInt(vals[5]) || 1;
          }
        }
      }
    } else if (line.startsWith('MOD')) {
      const match = line.match(/^MOD(\d+)=(.*)$/);
      if (match) {
        const portId = parseInt(match[1]) - 1;
        const vals = match[2].split(',').map(s => s.trim());
        if (portId >= 0 && portId < 6) {
          for (let i = 0; i < Math.min(30, vals.length); i++) {
            if (vals[i]) {
              data.ports[portId].modules[i].type = vals[i];
            }
          }
        }
      }
    } else if (line.startsWith('RECIPIENT')) {
      const match = line.match(/^RECIPIENT(\d+)=(.*)$/);
      if (match) {
        data.recipients.push(match[2].trim());
      }
    }
  });

  if (data.recipients.length === 0) {
    data.recipients = [''];
  }
  return data;
};

const getNcTextContent = (r) => {
  if (!r) return ''
  if (r.inst === undefined || r.inst === null || r.inst === '' || r.name === undefined || r.name === null || r.name === '') return ''

  let output = '#Notf object config\n'
  output += `NAME=${r.name || ''}\n`
  output += `DESC=${r.desc || ''}\n`
  output += `PRI=${r.priority_off || 0},${r.priority_fault || 0},${r.priority_norm || 0}\n`
  output += `ACK_REQ=${r.ack_off ? 1 : 0},${r.ack_fault ? 1 : 0},${r.ack_norm ? 1 : 0}\n\n`
  
  if (r.d1_recipient && r.d1_recipient.trim() !== '') {
    output += `#Valid Days: from monday, 1 or 0\n`
    output += `1_VALID_DAYS=${r.d1_mon?1:0},${r.d1_tue?1:0},${r.d1_wed?1:0},${r.d1_thu?1:0},${r.d1_fri?1:0},${r.d1_sat?1:0},${r.d1_sun?1:0}\n`
    output += `1_FROM_TIME=${r.d1_time_start || '00:00:00'}\n`
    output += `1_TO_TIME=${r.d1_time_end || '23:59:59'}\n`
    output += `# devid or net/mac\n`
    output += `1_RECIPIENT=${r.d1_recipient || ''}\n`
    output += `1_PROC_ID=${r.d1_proc_id || 0}\n`
    output += `1_CONF=${r.d1_confirmed ? 1 : 0}\n`
    output += `1_TRANS=${r.d1_trans_off?1:0},${r.d1_trans_fault?1:0},${r.d1_trans_norm?1:0}\n\n`
  }
  
  if (r.d2_recipient && r.d2_recipient.trim() !== '') {
    output += `# 2nd Destination\n`
    output += `2_VALID_DAYS=${r.d2_mon?1:0},${r.d2_tue?1:0},${r.d2_wed?1:0},${r.d2_thu?1:0},${r.d2_fri?1:0},${r.d2_sat?1:0},${r.d2_sun?1:0}\n`
    output += `2_FROM_TIME=${r.d2_time_start || '00:00:00'}\n`
    output += `2_TO_TIME=${r.d2_time_end || '23:59:59'}\n`
    output += `2_RECIPIENT=${r.d2_recipient || ''}\n`
    output += `2_PROC_ID=${r.d2_proc_id || 0}\n`
    output += `2_CONF=${r.d2_confirmed ? 1 : 0}\n`
    output += `2_TRANS=${r.d2_trans_off?1:0},${r.d2_trans_fault?1:0},${r.d2_trans_norm?1:0}\n`
  }
  
  return output.trim()
}

const parseNcTextFormat = (text) => {
  const lines = text.split('\n')
  const currentNc = {}

  lines.forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return

    const eqIdx = line.indexOf('=')
    if (eqIdx === -1) return
    const key = line.substring(0, eqIdx).trim()
    const val = line.substring(eqIdx + 1).trim()

    if (key === 'NAME') currentNc.name = val
    else if (key === 'DESC') currentNc.desc = val
    else if (key === 'PRI') {
      const parts = val.split(',')
      currentNc.priority_off = parseFloat(parts[0]) || 0
      currentNc.priority_fault = parseFloat(parts[1]) || 0
      currentNc.priority_norm = parseFloat(parts[2]) || 0
    } else if (key === 'ACK_REQ') {
      const parts = val.split(',')
      currentNc.ack_off = parts[0] === '1'
      currentNc.ack_fault = parts[1] === '1'
      currentNc.ack_norm = parts[2] === '1'
    } else if (key === '1_VALID_DAYS') {
      const p = val.split(',')
      currentNc.d1_mon=p[0]==='1'; currentNc.d1_tue=p[1]==='1'; currentNc.d1_wed=p[2]==='1';
      currentNc.d1_thu=p[3]==='1'; currentNc.d1_fri=p[4]==='1'; currentNc.d1_sat=p[5]==='1'; currentNc.d1_sun=p[6]==='1';
    } else if (key === '1_FROM_TIME') currentNc.d1_time_start = val
    else if (key === '1_TO_TIME') currentNc.d1_time_end = val
    else if (key === '1_RECIPIENT') currentNc.d1_recipient = val
    else if (key === '1_PROC_ID') currentNc.d1_proc_id = parseFloat(val) || 0
    else if (key === '1_CONF') currentNc.d1_confirmed = (val === '1')
    else if (key === '1_TRANS') {
      const p = val.split(',')
      currentNc.d1_trans_off=p[0]==='1'; currentNc.d1_trans_fault=p[1]==='1'; currentNc.d1_trans_norm=p[2]==='1';
    } else if (key === '2_VALID_DAYS') {
      const p = val.split(',')
      currentNc.d2_mon=p[0]==='1'; currentNc.d2_tue=p[1]==='1'; currentNc.d2_wed=p[2]==='1';
      currentNc.d2_thu=p[3]==='1'; currentNc.d2_fri=p[4]==='1'; currentNc.d2_sat=p[5]==='1'; currentNc.d2_sun=p[6]==='1';
    } else if (key === '2_FROM_TIME') currentNc.d2_time_start = val
    else if (key === '2_TO_TIME') currentNc.d2_time_end = val
    else if (key === '2_RECIPIENT') currentNc.d2_recipient = val
    else if (key === '2_PROC_ID') currentNc.d2_proc_id = parseFloat(val) || 0
    else if (key === '2_CONF') currentNc.d2_confirmed = (val === '1')
    else if (key === '2_TRANS') {
      const p = val.split(',')
      currentNc.d2_trans_off=p[0]==='1'; currentNc.d2_trans_fault=p[1]==='1'; currentNc.d2_trans_norm=p[2]==='1';
    }
  })

  return currentNc
};

const parseGroupTextFormat = (text, groupLabel) => {
  const cols = groupColumnsMap[groupLabel];
  if (!cols) throw new Error('Unknown group type');
  
  const lines = text.split('\n');
  const parsedRows = [];
  
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) return;
    
    const instVal = line.substring(0, eqIdx).trim();
    const remaining = line.substring(eqIdx + 1);
    
    // Split by comma ignoring commas inside quotes
    const tokens = [];
    let currentStr = '';
    let insideQuotes = false;
    
    for (let i = 0; i < remaining.length; i++) {
      const char = remaining[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        tokens.push(currentStr.trim());
        currentStr = '';
      } else {
        currentStr += char;
      }
    }
    tokens.push(currentStr.trim()); // push last token
    
    const rowObj = {};
    if (cols.length > 0) {
      // first col assumes to be 'inst'
      rowObj[cols[0]] = isNaN(instVal) || instVal === '' ? instVal : Number(instVal); 
    }
    
    tokens.forEach((tok, idx) => {
      if (idx + 1 < cols.length) {
        // Strip surrounding quotes if present
        if (tok.startsWith('"') && tok.endsWith('"')) {
          tok = tok.slice(1, -1);
        }
        rowObj[cols[idx + 1]] = tok;
      }
    });
    
    parsedRows.push(rowObj);
  });
  
  return parsedRows;
};

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const isTxt = file.name.toLowerCase().endsWith('.txt')

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      if (selectedNode.value.data.type === 'project') {
        store.importData(e.target.result)
      } else {
        let contents;
        if (isTxt) {
          if (selectedNode.value.data.type === 'device') {
            contents = parseDeviceTextFormat(e.target.result)
          } else if (selectedNode.value.data.type === 'group') {
            if (selectedNode.value.label === 'NC') {
              const parsedNc = parseNcTextFormat(e.target.result);
              const currentArray = store.recordsData[selectedNode.value.key] || [];
              const targetIndex = activeNcTabIndex.value || 0;
              if (currentArray[targetIndex]) {
                Object.assign(currentArray[targetIndex], parsedNc);
              }
              contents = currentArray;
            } else {
              contents = parseGroupTextFormat(e.target.result, selectedNode.value.label)
            }
          }
        } else {
          contents = JSON.parse(e.target.result)
        }
        
        store.recordsData[selectedNode.value.key] = contents
        if (Array.isArray(contents)) sortTableData()
      }
      componentKey.value += 1
    } catch(err) {
      alert("올바르지 않은 파일 형식입니다.")
    }
    event.target.value = '' 
  }
  reader.readAsText(file)
}

const exportData = () => {
  if (selectedNode.value.data.type === 'project') {
    store.exportData()
    return
  }

  if (!store.recordsData[selectedNode.value.key]) return
  
  const contentStr = formattedMetaData.value
  const isDevice = selectedNode.value.data.type === 'device'
  const isGroup = selectedNode.value.data.type === 'group'
  
  const mimeType = (isDevice || isGroup) ? "text/plain" : "text/json"
  
  let downloadFileName = `${selectedNode.value.label}_data.json`
  if (isDevice) {
    downloadFileName = "DEV.txt"
  } else if (isGroup) {
    if (selectedNode.value.label === 'NC') {
      const records = store.recordsData[selectedNode.value.key] || [];
      const activeObj = records[activeNcTabIndex.value];
      downloadFileName = activeObj && activeObj.inst ? `NC${activeObj.inst}.txt` : 'NC.txt';
    } else {
      downloadFileName = `${selectedNode.value.label}.txt`
    }
  }
  
  const dataStr = `data:${mimeType};charset=utf-8,` + encodeURIComponent(contentStr)
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute("href", dataStr)
  downloadAnchorNode.setAttribute("download", downloadFileName)
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

const downloadDeviceZip = async () => {
  if (!selectedNode.value || selectedNode.value.data.type !== 'device') return;
  
  const zip = new JSZip();
  const devText = formatNodeData(selectedNode.value);
  zip.file("DEV.txt", devText);
  
  if (selectedNode.value.children && selectedNode.value.children.length > 0) {
    selectedNode.value.children.forEach(child => {
      if (child.data.type === 'group') {
        const cData = store.recordsData[child.key];
        if (cData && (Array.isArray(cData) ? cData.length > 0 : true)) {
          if (child.label === 'NC') {
            cData.forEach(nc => {
              if (nc && nc.inst) {
                const ncText = getNcTextContent(nc);
                if (ncText && ncText !== '데이터가 없습니다.') {
                  zip.file(`NC${nc.inst}.txt`, ncText);
                }
              }
            });
          } else {
            const childText = formatNodeData(child);
            if (childText && childText !== '데이터가 없습니다.') {
              zip.file(`${child.label}.txt`, childText);
            }
          }
        }
      }
    });
  }
  
  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${selectedNode.value.label || 'Device'}_config.zip`);
}

const formatNodeData = (node) => {
  if (!node) return '';
  const data = store.recordsData[node.key];
  if (!data) return '데이터가 없습니다.';

  if (node.data.type === 'device') {
    let output = `NAME=${data.name || ''}\nDESC=${data.desc || ''}\n\n`;

    // Ports
    if (data.ports && data.ports.length > 0) {
      data.ports.forEach((p, idx) => {
        let pIndex = idx + 1;
        const par = p.parity ? p.parity.charAt(0).toUpperCase() : 'N';
        if (['NONE', 'RevPI', 'NASA', 'BACnet/IP', 'Modbus/TCP'].includes(p.protocol)) {
          output += `PORT${pIndex}=${p.protocol}\n`;
        } else {
          output += `PORT${pIndex}=${p.protocol},${p.networkNum || 0},${p.baudRate || ''},${p.dataBits || ''},${par},${p.stopBits || ''}\n`;
        }
      });
      output += '\n';

      // Modules
      data.ports.forEach((p, idx) => {
        let pIndex = idx + 1;
        if (p.modules) {
          let mods = p.modules.map(m => m.type || 'NONE');
          let lastGoodIdx = mods.length - 1;
          while (lastGoodIdx >= 0 && mods[lastGoodIdx] === 'NONE') {
            lastGoodIdx--;
          }
          
          if (lastGoodIdx === -1) {
            output += `MOD${pIndex}=NONE,NONE,\n`; // Fallback spacing as requested in sample
          } else {
            output += `MOD${pIndex}=${mods.slice(0, lastGoodIdx + 1).join(',')},\n`;
          }
        }
      });
      output += '\n';
    }

    // Recipients
    if (data.recipients && data.recipients.length > 0) {
      data.recipients.forEach((r, idx) => {
        if (r && r.trim() !== '') {
          output += `RECIPIENT${idx + 1}=${r}\n`;
        }
      });
    }

    return output.trim();
  }

  if (node.data.type === 'group') {
    if (node.label === 'NC') {
      const activeData = Array.isArray(data) ? data[activeNcTabIndex.value] : null;
      return getNcTextContent(activeData)
    }
    
    const cols = groupColumnsMap[node.label];
    if (!cols) return JSON.stringify(data, null, 2);
    
    let output = `#${cols.join(',')}\n`;
    data.forEach(row => {
      // Exclude row if inst or name is empty
      if (row.inst === undefined || row.inst === null || row.inst === '' || 
          row.name === undefined || row.name === null || row.name === '') {
        return;
      }

      const instVal = row[cols[0]] !== undefined ? row[cols[0]] : '';
      
      const restVals = cols.slice(1).map(col => {
        let val = row[col] !== undefined ? String(row[col]) : '';
        if (val.includes(',')) {
          val = `"${val}"`;
        }
        return val;
      });
      
      output += `${instVal}=${restVals.join(',')}\n`;
    });
    return output.trim();
  }

  return JSON.stringify(data, null, 2)
}

const formattedMetaData = computed(() => formatNodeData(selectedNode.value))

const copyMetaData = () => {
  navigator.clipboard.writeText(formattedMetaData.value).then(() => {
    alert("클립보드에 복사되었습니다.")
  })
}
</script>

<style scoped>
.main-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
.empty-state h2 {
  font-weight: 500;
  font-size: 1.1rem;
}
.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow: hidden; /* Scroll inside DataTable */
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 1rem 1.2rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  background-color: var(--surface-color);
  box-shadow: var(--shadow-sm);
}
.toolbar h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.6rem;
  background: var(--primary-light);
  color: var(--primary-color);
  border-radius: 99px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.shadow-button {
  box-shadow: var(--shadow-md);
  transition: transform 0.1s;
}
.shadow-button:active {
  transform: translateY(1px);
}
.mr-2 {
  margin-right: 0.5rem;
}

:deep(.p-datatable) {
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}
</style>
