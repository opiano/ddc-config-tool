<template>
  <div class="main-content">
    <div v-if="!selectedNode" class="empty-state">
      <i class="pi pi-arrow-left" style="font-size: 2rem; color: #ccc;"></i>
      <h2>설정할 항목(노드)을 좌측 트리에서 선택해주세요.</h2>
    </div>

    <div v-else class="table-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <h2>{{ selectedNode.label }} ({{ selectedNode.data.type }}) 설정</h2>
        </div>
        <div class="toolbar-right">
          <!-- 레코드 추가 버튼: 새 행을 추가하고 바로 편집모드로 진입하도록 유도 -->
          <Button label="새 데이터 추가" icon="pi pi-plus" @click="addRow" severity="success" class="mr-2" />
          <Button label="파일로 저장 (Export)" icon="pi pi-download" @click="exportData" outlined class="mr-2" />
          <Button label="파일 읽기 (Import)" icon="pi pi-folder-open" @click="triggerFileUpload" outlined />
          <input type="file" ref="fileInput" @change="handleFileUpload" accept=".json" style="display: none;" />
        </div>
      </div>

      <!-- PrimeVue DataTable with Row Editing -->
      <DataTable 
        :value="tableData" 
        dataKey="id" 
        editMode="row" 
        v-model:editingRows="editingRows" 
        @row-edit-save="onRowEditSave"
        tableStyle="min-width: 50rem"
        class="p-datatable-sm"
        stripedRows
      >
        <template #empty>
          해당 노드에 등록된 데이터가 없습니다.
        </template>
        
        <!-- 동적으로 넘어갈 컬럼 (향후 대응을 위해 Loop 가능하게 구성) -->
        <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header">
          <template #editor="{ data, field }">
            <InputText v-model="data[field]" style="width: 100%" />
          </template>
        </Column>

        <Column :rowEditor="true" style="width: 10%; min-width: 8rem" bodyStyle="text-align:center"></Column>
        <Column style="width: 5%; min-width: 4rem">
          <template #body="{ data }">
            <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteRow(data.id)" title="데이터 삭제" />
          </template>
        </Column>

      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '../store/configStore'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const store = useConfigStore()
const selectedNode = computed(() => store.selectedNode)
const tableData = computed(() => store.currentRecords)

// 임시 데이터 컬럼 생성 (Col1 ~ Col10)
const columns = ref(
  Array.from({ length: 10 }, (_, i) => ({
    field: `col${i + 1}`,
    header: `칼럼 ${i + 1}`
  }))
)

// DataTable Row 편집 상태 모델
const editingRows = ref([])

const addRow = () => {
  if (!selectedNode.value) return
  // 빈 객체 생성 (col1~10 = '')
  const newRow = columns.value.reduce((acc, col) => {
    acc[col.field] = ''
    return acc
  }, {})
  store.addRecord(selectedNode.value.key, newRow)
}

const onRowEditSave = (event) => {
  const { newData, index } = event
  // newData 객체는 편집된 최신 값들을 가짐. id 포함.
  store.updateRecord(selectedNode.value.key, newData)
}

const deleteRow = (id) => {
  if (confirm('해당 설정 데이터를 삭제하시겠습니까?')) {
    store.deleteRecord(selectedNode.value.key, id)
  }
}

// 파일 내보내기/불러오기
const fileInput = ref(null)

const exportData = () => {
  store.exportData()
}

const triggerFileUpload = () => {
  fileInput.value.click()
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const contents = e.target.result
    store.importData(contents)
    event.target.value = '' // reset input
  }
  reader.readAsText(file)
}
</script>

<style scoped>
.main-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--p-surface-0);
}
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--p-surface-500);
}
.empty-state i {
  margin-bottom: 1rem;
}
.table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow: auto;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}
.toolbar h2 {
  margin: 0;
  color: var(--p-text-color);
}
.mr-2 {
  margin-right: 0.5rem;
}
</style>
