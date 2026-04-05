import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';

export const useConfigStore = defineStore('config', {
  state: () => ({
    // 트리 데이터 (PrimeVue Tree 포맷형)
    treeData: [
      {
        key: 'root-project',
        label: 'Project',
        data: { type: 'project', depth: 1 },
        children: [],
        icon: 'pi pi-fw pi-folder'
      }
    ],
    // 선택된 트리의 현재 노드 키
    selectedNodeKey: null,
    
    // 테이블 데이터 (Key: 트리 노드 Key, Value: 레코드 배열)
    recordsData: {} 
  }),
  
  getters: {
    // 선택된 노드
    selectedNode: (state) => {
      let foundNode = null;
      const findNode = (nodes) => {
        for (const node of nodes) {
          if (node.key === state.selectedNodeKey) {
            foundNode = node;
            return;
          }
          if (node.children) {
            findNode(node.children);
          }
        }
      };
      findNode(state.treeData);
      return foundNode;
    },
    // 현재 선택된 노드의 레코드 반환
    currentRecords: (state) => {
      if (!state.selectedNodeKey) return [];
      return state.recordsData[state.selectedNodeKey] || [];
    }
  },
  
  actions: {
    setSelectedNodeKey(key) {
      this.selectedNodeKey = key;
    },

    //===============================
    // 트리 노드 관리
    //===============================
    addNode(parentKey, label) {
      let added = false;

      const traverseAndAdd = (nodes, currentDepth) => {
        for (const node of nodes) {
          if (node.key === parentKey) {
            // max depth: 5
            const nextDepth = currentDepth + 1;
            if (nextDepth > 5) {
              alert('더 이상 하위 레벨을 추가할 수 없습니다 (최대 4레벨 하위)');
              return true; // stop search
            }
            if (!node.children) node.children = [];
            const newNodeId = uuidv4();
            node.children.push({
              key: newNodeId,
              label: label,
              data: { type: 'device', depth: nextDepth },
              children: [],
              icon: 'pi pi-fw pi-server'
            });
            // 노드를 추가할 때 빈 레코드 배열 마련
            this.recordsData[newNodeId] = [];
            added = true;
            return true;
          }
          if (node.children && node.children.length > 0) {
            const found = traverseAndAdd(node.children, currentDepth + 1);
            if (found) return true;
          }
        }
        return false;
      };

      traverseAndAdd(this.treeData, 1);
      return added;
    },

    updateNodeLabel(nodeKey, newLabel) {
      const traverseAndUpdate = (nodes) => {
        for (const node of nodes) {
          if (node.key === nodeKey) {
            node.label = newLabel;
            return true;
          }
          if (node.children && node.children.length > 0) {
            if (traverseAndUpdate(node.children)) return true;
          }
        }
        return false;
      };
      traverseAndUpdate(this.treeData);
    },

    deleteNode(nodeKey) {
      if (nodeKey === 'root-project') {
        alert('최상위 Project는 삭제할 수 없습니다.');
        return;
      }

      const traverseAndDelete = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].key === nodeKey) {
            nodes.splice(i, 1);
            delete this.recordsData[nodeKey]; // 관련된 레코드 데이터도 삭제
            if (this.selectedNodeKey === nodeKey) {
              this.selectedNodeKey = null;
            }
            return true;
          }
          if (nodes[i].children && nodes[i].children.length > 0) {
            if (traverseAndDelete(nodes[i].children)) return true;
          }
        }
        return false;
      };
      traverseAndDelete(this.treeData);
    },

    //===============================
    // 테이블 레코드 관리
    //===============================
    addRecord(nodeKey, record) {
      if (!this.recordsData[nodeKey]) {
        this.recordsData[nodeKey] = [];
      }
      this.recordsData[nodeKey].push({ id: uuidv4(), ...record });
    },

    updateRecord(nodeKey, updatedRecord) {
      if (!this.recordsData[nodeKey]) return;
      const records = this.recordsData[nodeKey];
      const index = records.findIndex(r => r.id === updatedRecord.id);
      if (index !== -1) {
        records[index] = { ...updatedRecord };
      }
    },

    deleteRecord(nodeKey, recordId) {
      if (!this.recordsData[nodeKey]) return;
      const records = this.recordsData[nodeKey];
      this.recordsData[nodeKey] = records.filter(r => r.id !== recordId);
    },

    //===============================
    // Import / Export
    //===============================
    exportData() {
      const exportObj = {
        treeData: this.treeData,
        recordsData: this.recordsData
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "ddc_config_data.json");
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    },

    importData(jsonData) {
      try {
        const parsed = JSON.parse(jsonData);
        if (parsed.treeData && parsed.recordsData) {
          this.treeData = parsed.treeData;
          this.recordsData = parsed.recordsData;
          this.selectedNodeKey = null;
        } else {
          alert('비정상적인 파일 포맷입니다.');
        }
      } catch (e) {
        alert('파일을 파싱하는 중 오류가 발생했습니다.');
      }
    }
  }
});
