<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; color: var(--p-primary-color);">DDC Project</h3>
        <div>
          <Button icon="pi pi-folder-open" text rounded size="small" @click="triggerFileUpload" title="프로젝트 불러오기 (Import)" />
          <Button icon="pi pi-download" text rounded size="small" @click="exportData" title="프로젝트 저장 (Export)" />
          <input type="file" ref="fileInput" @change="handleFileUpload" accept=".json" style="display: none;" />
        </div>
      </div>
    </div>
    <div class="tree-container">
      <Tree 
        :value="store.treeData" 
        selectionMode="single" 
        v-model:selectionKeys="selectedKey" 
        @nodeSelect="onNodeSelect"
        @nodeUnselect="onNodeUnselect"
        class="w-full"
      >
        <template #default="slotProps">
          <div class="node-content">
            <span class="node-label">{{ slotProps.node.label }}</span>
            <div class="node-actions" v-if="selectedKey && selectedKey[slotProps.node.key]">
              <Button icon="pi pi-plus" text rounded size="small" @click.stop="openAddDialog(slotProps.node, $event)" v-if="slotProps.node.data.type !== 'group'" title="하위 노드 추가" />
              <Button icon="pi pi-pencil" text rounded size="small" @click.stop="openEditDialog(slotProps.node)" v-if="slotProps.node.data.type === 'device'" title="이름 수정" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click.stop="confirmDelete(slotProps.node)" v-if="slotProps.node.key !== 'root-project'" title="삭제" />
            </div>
          </div>
        </template>
      </Tree>
    </div>

    <!-- 다이얼로그 (Project -> Device 추가 전용) -->
    <Dialog v-model:visible="showAddDialog" modal header="Device 추가" :style="{ width: '25rem' }">
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <label for="nodename" style="font-weight: bold; width: 60px;">이름</label>
        <InputText id="nodename" v-model="newNodeName" style="flex: 1;" autocomplete="off" @keyup.enter="handleAddDevice" />
      </div>
      <template #footer>
        <Button label="취소" text severity="secondary" @click="showAddDialog = false" />
        <Button label="추가" outlined @click="handleAddDevice" />
      </template>
    </Dialog>

    <!-- 팝오버 (Device -> Group 타일 퀵 추가 전용) -->
    <Popover ref="groupPopover">
      <div style="padding: 0.5rem; width: 33rem;">
        <h4 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-main);">오브젝트 그룹 추가</h4>
        <div class="tile-container">
          <div 
            v-for="opt in groupOptions" 
            :key="opt"
            class="tile"
            @click="handleAddGroup(opt)"
          >
            {{ opt }}
          </div>
        </div>
      </div>
    </Popover>

    <Dialog v-model:visible="showEditDialog" modal header="노드 이름 수정" :style="{ width: '25rem' }">
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <label for="editnodename" style="font-weight: bold; width: 60px;">새 이름</label>
        <InputText id="editnodename" v-model="editNodeName" style="flex: 1;" autocomplete="off" @keyup.enter="handleEdit" />
      </div>
      <template #footer>
        <Button label="취소" text severity="secondary" @click="showEditDialog = false" />
        <Button label="저장" outlined @click="handleEdit" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useConfigStore } from '../store/configStore'
import Tree from 'primevue/tree'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Popover from 'primevue/popover'

const store = useConfigStore()
const selectedKey = ref({})

watch(() => store.selectedNodeKey, (newKey) => {
  if (newKey && !selectedKey.value[newKey]) {
    selectedKey.value = { [newKey]: true }
  } else if (!newKey && Object.keys(selectedKey.value).length > 0) {
    selectedKey.value = {}
  }
}, { immediate: true })

const onNodeSelect = (node) => {
  store.setSelectedNodeKey(node.key);
}

const onNodeUnselect = () => {
  store.setSelectedNodeKey(null);
}

// Dialog States
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const newNodeName = ref('')
const editNodeName = ref('')
const targetNode = ref(null)

const groupOptions = ref(['AI', 'AO', 'AV', 'BI', 'BO', 'BV', 'MSV', 'CAL', 'SCH', 'NC', 'TLOG', 'TOT', 'EGC', 'CGC'])
const selectedGroup = ref(null)

const groupPopover = ref(null)

const openAddDialog = (node, event) => {
  targetNode.value = node
  if (node.data.type === 'project') {
    const deviceCount = node.children ? node.children.length + 1 : 1
    newNodeName.value = `Device-${String(deviceCount).padStart(3, '0')}`
    showAddDialog.value = true
  } else if (node.data.type === 'device') {
    selectedGroup.value = groupOptions.value[0]
    groupPopover.value.toggle(event)
  }
}

const handleAddDevice = () => {
  if (!newNodeName.value.trim()) return
  const label = newNodeName.value.trim()
  const added = store.addNode(targetNode.value.key, label)
  if (added) {
    showAddDialog.value = false
  }
}

const handleAddGroup = (opt) => {
  const added = store.addNode(targetNode.value.key, opt)
  if (added) {
    groupPopover.value.hide()
  }
}

const openEditDialog = (node) => {
  targetNode.value = node
  editNodeName.value = node.label
  showEditDialog.value = true
}

const handleEdit = () => {
  if (!editNodeName.value.trim()) return
  store.updateNodeLabel(targetNode.value.key, editNodeName.value)
  showEditDialog.value = false
}

const confirmDelete = (node) => {
  if(confirm(`'${node.label}'을(를) 정말 삭제하시겠습니까?\n하위에 포함된 모든 노드와 테이블 데이터가 삭제됩니다.`)) {
    store.deleteNode(node.key)
    selectedKey.value = {}
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
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--surface-color);
}
.sidebar-header {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-color);
}
.sidebar-header h3 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--primary-color) !important;
}
.tree-container {
  flex: 1;
  overflow: auto;
  padding: 1rem 0.5rem;
}

:deep(.p-tree) {
  border: none;
  background: transparent;
  padding: 0;
}
:deep(.p-treenode-content) {
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
  padding: 0.25rem;
}
:deep(.p-treenode-content:hover) {
  background-color: var(--bg-color);
}
:deep(.p-treenode-content.p-treenode-selectable:focus) {
  box-shadow: none;
}

.node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 0.5rem;
}
.node-label {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
}
.node-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}
.node-content:hover .node-actions {
  opacity: 1;
}

/* Tile Grid for Object Selection */
.tile-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  justify-content: center;
}
.tile {
  width: 60px;
  height: 55px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-main);
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  user-select: none;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
.tile:hover {
  border-color: var(--primary-light);
  background: var(--primary-light);
  color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.tile.selected {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  box-shadow: var(--shadow-md);
  transform: translateY(-2px) scale(1.05);
}
</style>
