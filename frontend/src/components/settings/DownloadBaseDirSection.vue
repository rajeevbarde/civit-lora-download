<template>
  <div class="settings-card">
    <div class="settings-section-header">
      <span class="section-icon">📂</span>
      <div>
        <h3 class="section-title gradient-text">Civitai Download Folder Path</h3>
      </div>
    </div>
    <div class="settings-section-content">
      <input 
        id="downloadBaseDir" 
        :value="downloadBaseDirInput" 
        type="text" 
        @input="onInput"
        class="settings-input" 
        placeholder="Enter download base directory" 
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'DownloadBaseDirSection',
  props: {
    downloadBaseDirInput: {
      type: String,
      default: ''
    }
  },
  emits: ['update:downloadBaseDirInput'],
  methods: {
    onInput(event) {
      this.$emit('update:downloadBaseDirInput', event.target.value);
    }
  }
};
</script>

<style scoped>
.settings-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px 0 rgba(102, 126, 234, 0.10);
  padding: 2rem 2.5rem;
  margin-bottom: 0;
}

.settings-section-header {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
}

.section-icon {
  font-size: 1.7rem;
  background: #f8fafc;
  border-radius: 50%;
  padding: 0.5rem;
  box-shadow: 0 2px 8px 0 rgba(102, 126, 234, 0.08);
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
}

.gradient-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-subtitle {
  font-size: 1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.settings-section-content {
  margin-bottom: 0.5rem;
}

.settings-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1.1rem;
  background: #f8fafc;
  color: #495057;
  transition: all 0.3s ease;
}

.settings-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: #fff;
}

@media (max-width: 700px) {
  .settings-card {
    padding: 1.2rem 1rem;
  }
}
</style> 