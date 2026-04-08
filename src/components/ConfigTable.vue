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
            <input type="file" ref="fileInput" @change="handleFileUpload" accept=".json, .txt" style="display: none;" />
            <Button v-if="selectedNode.data.type === 'group'" label="항목 추가" icon="pi pi-plus" @click="addRow" severity="primary" size="small" class="shadow-button" />
          </div>
        </div>
        <div class="toolbar-right">
        </div>
      </div>

      <DeviceConfig v-if="selectedNode.data.type === 'device'" :nodeKey="selectedNode.key" :key="'device-' + selectedNode.key + '-' + componentKey" />

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
        <Column style="width: 40px; min-width: 40px" bodyStyle="text-align:left; padding-left: 0.1rem;" headerStyle="min-width: 40px" frozen>
          <template #body="{ data }">
            <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteRow(data.id)" title="데이터 삭제" style="width: 2rem; height: 2rem; padding: 0;" />
          </template>
        </Column>
        
        <!-- 동적으로 넘어갈 컬럼 (향후 대응을 위해 Loop 가능하게 구성) -->
        <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header" :headerStyle="getColumnStyle(col.field)" :bodyStyle="getColumnStyle(col.field)">
          <template #editor="{ data, field }">
            <template v-if="field.toLowerCase().includes('date')">
              <InputNumber v-model="data[field]" :useGrouping="false" placeholder="YYYYMMDD" style="width: 100%; min-width: 0;" :inputStyle="{ padding: '0.3rem 0.4rem', width: '100%', minWidth: '0', boxSizing: 'border-box' }" />
            </template>
            <template v-else-if="field === 'timedelay' || field === 'nrState'">
              <InputNumber v-model="data[field]" :useGrouping="false" style="width: 100%; min-width: 0;" :inputStyle="{ padding: '0.3rem 0.4rem', width: '100%', minWidth: '0', boxSizing: 'border-box' }" />
            </template>
            <template v-else-if="field.toLowerCase().includes('time')">
              <InputMask v-model="data[field]" mask="99:99" placeholder="HH:MM" style="width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" />
            </template>
            <template v-else>
              <InputText v-model="data[field]" :disabled="isStateTextDisabled(field, data)" style="width: 100%; min-width: 0; padding: 0.3rem 0.4rem; box-sizing: border-box;" />
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

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '../store/configStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import InputMask from 'primevue/inputmask'
import DeviceConfig from './DeviceConfig.vue'
import Dialog from 'primevue/dialog'

const store = useConfigStore()
const selectedNode = computed(() => store.selectedNode)
const tableData = computed(() => store.currentRecords)

const groupColumnsMap = {
  AI: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'thid', 'units', 'maxVal', 'minVal', 'gain', 'bias', 'nc', 'e.detect', 'almEnable', 'almHL', 'almLL', 'deadband', 'timedelay', 'cov.inc', 'pv.inc', 'cov.en', 'tlog.en'],
  AO: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'thid', 'units', 'maxVal', 'minVal', 'initVal', 'nc', 'e.detect', 'almEnable', 'almHL', 'almLL', 'deadband', 'timedelay', 'cov.inc', 'pv.inc', 'cov.en', 'tlog.en'],
  AV: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'thid', 'units', 'initVal', 'nc', 'e.detect', 'almEnable', 'almHL', 'almLL', 'deadband', 'timedelay', 'cov.inc', 'pv.inc', 'cov.en', 'tlog.en'],
  BI: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'thid', 'onTxt', 'offTxt', 'polarity', 'nc', 'e.detect', 'almEnable', 'almVal', 'timedelay', 'cov.en', 'tlog.en'],
  BO: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'thid', 'onTxt', 'offTxt', 'polarity', 'initVal', 'outMode', 'interval', 'nc', 'e.detect', 'almEnable', 'timedelay', 'fbDevInst', 'fbObject', 'cov.en', 'tlog.en'],
  BV: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'thid', 'onTxt', 'offTxt', 'initVal', 'nc', 'e.detect', 'almEnable', 'almVal', 'timedelay', 'cov.en', 'tlog.en'],
  MSV: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'thid', 'initVal', 'nrState', 'st1Txt', 'st2Txt', 'st3Txt', 'st4Txt', 'st5Txt', 'st6Txt', 'st7Txt', 'st8Txt', 'st9Txt', 'st10Txt', 'nc', 'e.detect', 'almEnable', 'timedelay', 'almVals', 'faultVals', 'cov.en', 'tlog.en'],
  TLOG: ['inst', 'name', 'desc', 'startDate', 'startTime', 'endDate', 'endTime', 'enable', 'logDevInst', 'logObject', 'logInterval', 'stopWhenFull', 'nc', 'e.detect', 'almEnable', 'threshold'],
  TOT: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'units', 'Ref_DevInst', 'Ref_Object', 'nc', 'e.detect', 'almEnable', 'almHL', 'gain', 'totOpt', 'reset_choice', 'reset-date', 'reset-time'],
  CAL: ['inst', 'name', 'desc', 'date1', 'date2', 'date3', 'date4', 'date5', 'date-range1', 'date-range2', 'date-range3', 'date-range4', 'date-range5', 'weekNday1', 'weekNday2', 'weekNday3', 'weekNday4', 'weekNday5'],
  CGC: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'OP', 'cond1-obj', 'comp1', 'cond1-value', 'cond2-obj', 'comp2', 'cond2-value', 'pri_for_writing', 'action1-obj', 'action1-val', 'action2-obj', 'action2-val', 'action3-obj', 'action3-val', 'action4-obj', 'action4-val'],
  EGC: ['inst', 'port', 'module', 'ch', 'name', 'desc', 'Master_Object', 'priority-for-writing', 'slave-object-list'],
  SCH: ['inst', 'name', 'desc', 'startDate', 'endDate', 'objType', 'def-value', 'object-list', 'priority', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'ex1.period', 'ex1.tv', 'ex1.pri', 'ex2.period', 'ex2.tv', 'ex2.pri', 'ex3.period', 'ex3.tv', 'ex3.pri', 'ex4.period', 'ex4.tv', 'ex4.pri', 'ex5.period', 'ex5.tv', 'ex5.pri', 'ex6.period', 'ex6.tv', 'ex6.pri', 'ex7.period', 'ex7.tv', 'ex7.pri', 'ex8.period', 'ex8.tv', 'ex8.pri', 'ex9.period', 'ex9.tv', 'ex9.pri', 'ex10.period', 'ex10.tv', 'ex10.pri']
}

const columns = computed(() => {
  if (!selectedNode.value || selectedNode.value.data.type !== 'group') return []
  
  const groupLabel = selectedNode.value.label

  if (groupColumnsMap[groupLabel]) {
    return groupColumnsMap[groupLabel].map(f => ({ field: f, header: f }))
  }

  // fallback
  return Array.from({ length: 10 }, (_, i) => ({
    field: `col${i + 1}`,
    header: `칼럼 ${i + 1}`
  }))
})

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

  const smallFields = ['nc', 'e.detect', 'almEnable', 'deadband', 'cov.inc', 'pv.inc', 'cov.en', 'tlog.en'];
  if (smallFields.includes(field)) return 'width: 65px; min-width: 65px; max-width: 65px; overflow: hidden;';
  
  if (field === 'nrState') return 'width: 65px; min-width: 65px; max-width: 65px; overflow: hidden;';
  if (field === 'timedelay') return 'width: 75px; min-width: 75px; max-width: 75px; overflow: hidden;';

  // Specific sizing for temporal types
  if (field.toLowerCase().includes('date')) return 'width: 70px; min-width: 70px; max-width: 70px; overflow: hidden;';
  if (field.toLowerCase().includes('time')) return 'width: 100px; min-width: 100px; max-width: 100px; overflow: hidden;';

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
      
      const aMod = getVal(a.module), bMod = getVal(b.module)
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
  const nMod = recordToSave.module;
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

    // inst, port, module, ch 조합 검증 (오브젝트 그룹별 적용)
    if (compositeValid && valid(r.inst) && valid(r.port) && valid(r.module) && valid(r.ch)) {
      if (String(r.inst) === String(newInst) && 
          String(r.port) === String(nPort) &&
          String(r.module) === String(nMod) &&
          String(r.ch) === String(nCh)) {
        isCompositeDup = true;
        errorMsg = `[중복 오류] 입력하신 inst, port, module, ch 조합이 현재 그룹 내에 이미 존재합니다.`;
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

const deleteRow = (id) => {
  if (confirm('해당 설정 데이터를 삭제하시겠습니까?')) {
    store.deleteRecord(selectedNode.value.key, id)
    sortTableData()
  }
}

// Data Actions
const componentKey = ref(0)
const fileInput = ref(null)
const showMetaDialog = ref(false)

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

const parseGroupTextFormat = (text, groupLabel) => {
  const cols = groupColumnsMap[groupLabel];
  if (!cols) throw new Error('Unknown group type');
  
  const lines = text.split('\n');
  const parsedRows = [];
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
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
            contents = parseGroupTextFormat(e.target.result, selectedNode.value.label)
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
    downloadFileName = `${selectedNode.value.label}.txt`
  }
  
  const dataStr = `data:${mimeType};charset=utf-8,` + encodeURIComponent(contentStr)
  const downloadAnchorNode = document.createElement('a')
  downloadAnchorNode.setAttribute("href", dataStr)
  downloadAnchorNode.setAttribute("download", downloadFileName)
  document.body.appendChild(downloadAnchorNode)
  downloadAnchorNode.click()
  downloadAnchorNode.remove()
}

const formattedMetaData = computed(() => {
  if (!selectedNode.value) return ''
  const data = store.recordsData[selectedNode.value.key]
  if (!data) return '데이터가 없습니다.'

  if (selectedNode.value.data.type === 'device') {
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

  if (selectedNode.value.data.type === 'group') {
    const cols = groupColumnsMap[selectedNode.value.label];
    if (!cols) return JSON.stringify(data, null, 2);
    
    let output = '';
    data.forEach(row => {
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
})

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
