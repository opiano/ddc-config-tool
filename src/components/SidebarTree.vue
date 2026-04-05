<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3 style="margin: 0; color: var(--p-primary-color);">DDC Project</h3>
    </div>
    <div class="tree-container">
      <Tree 
        :value="store.treeData" 
        selectionMode="single" 
        v-model:selectionKeys="selectedKey" 
        @nodeSelect="onNodeSelect"
        @nodeUnselect="onNodeSelect"
        class="w-full"
      >
        <template #default="slotProps">
          <div class="node-content">
            <span class="node-label">{{ slotProps.node.label }}</span>
            <div class="node-actions" v-if="selectedKey && selectedKey[slotProps.node.key]">
              <Button icon="pi pi-plus" text rounded size="small" @click.stop="openAddDialog(slotProps.node)" title="하위 노드 추가" />
              <Button icon="pi pi-pencil" text rounded size="small" @click.stop="openEditDialog(slotProps.node)" v-if="slotProps.node.key !== 'root-project'" title="이름 수정" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click.stop="confirmDelete(slotProps.node)" v-if="slotProps.node.key !== 'root-project'" title="삭제" />
            </div>
          </div>
        </template>
      </Tree>
    </div>

    <!-- 다이얼로그 -->
    <Dialog v-model:visible="showAddDialog" modal header="하위 노드 추가" :style="{ width: '25rem' }">
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <label for="nodename" style="font-weight: bold; width: 60px;">이름</label>
        <InputText id="nodename" v-model="newNodeName" style="flex: 1;" autocomplete="off" @keyup.enter="handleAdd" />
      </div>
      <template #footer>
        <Button label="취소" text severity="secondary" @click="showAddDialog = false" />
        <Button label="추가" outlined @click="handleAdd" />
      </template>
    </Dialog>

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
import { ref, watchEffect } from 'vue'
import { useConfigStore } from '../store/configStore'
import Tree from 'primevue/tree'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

const store = useConfigStore()
const selectedKey = ref({})

watchEffect(() => {
  if (store.selectedNodeKey) {
    selectedKey.value = { [store.selectedNodeKey]: true }
  } else {
    selectedKey.value = {}
  }
})

const onNodeSelect = () => {
  const keys = Object.keys(selectedKey.value);
  if (keys.length > 0) {
    store.setSelectedNodeKey(keys[0]);
  } else {
    store.setSelectedNodeKey(null);
  }
}

// Dialog States
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const newNodeName = ref('')
const editNodeName = ref('')
const targetNode = ref(null)

const openAddDialog = (node) => {
  targetNode.value = node
  newNodeName.value = 'New Device'
  showAddDialog.value = true
}

const handleAdd = () => {
  if (!newNodeName.value.trim()) return
  const added = store.addNode(targetNode.value.key, newNodeName.value)
  if (added) {
    showAddDialog.value = false
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
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--p-surface-50);
  border-right: 1px solid var(--p-surface-200);
}
.sidebar-header {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid var(--p-surface-200);
  background-color: var(--p-surface-100);
}
.tree-container {
  flex: 1;
  overflow: auto;
  padding: 1rem 0;
}
.node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.node-label {
  flex: 1;
  font-size: 0.95rem;
}
.node-actions {
  display: flex;
  gap: 2px;
}
</style>
