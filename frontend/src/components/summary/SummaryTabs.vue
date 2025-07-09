<template>
  <div class="summary-tabs">
    <button class="tab-btn" :class="{active: activeTab === 'overview'}" @click="$emit('tab-click', 'overview')">Model Overview</button>
    <button class="tab-btn" :class="{active: activeTab === 'locations'}" @click="$emit('tab-click', 'locations')">LoRA File Locations</button>
    <button class="tab-btn" :class="{active: activeTab === 'lora'}" @click="$emit('tab-click', 'lora')">Latest Updated LoRA</button>
  </div>
</template>

<script>
export default {
  name: 'SummaryTabs',
  props: {
    activeTab: {
      type: String,
      required: true
    }
  }
};
</script>

<style scoped>
.summary-tabs {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 32px;
}
.tab-btn {
  background: #f1f5f9;
  border: none;
  padding: 12px 28px;
  border-radius: 8px 8px 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.tab-btn.active, .tab-btn:hover {
  background: #667eea;
  color: #fff;
}
</style> 