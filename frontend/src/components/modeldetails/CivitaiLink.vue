<template>
  <div class="civitai-link-section">
    <div class="link-header">
      <span class="link-icon">🔗</span>
      <span class="link-label">View on CivitAI</span>
    </div>
    <a
      :href="civitaiUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="civitai-link"
    >
      <span class="link-text">civitai.com/models/{{ modelId }}?modelVersionId={{ modelVersionId }}</span>
      <span class="external-icon">↗️</span>
    </a>
  </div>
</template>

<script>
export default {
  name: 'CivitaiLink',
  props: {
    modelId: {
      type: [String, Number],
      required: true
    },
    modelVersionId: {
      type: [String, Number],
      required: true
    },
    civitaiBaseUrl: {
      type: String,
      required: true
    }
  },
  computed: {
    civitaiUrl() {
      return `${this.civitaiBaseUrl}/models/${this.modelId}?modelVersionId=${this.modelVersionId}`;
    }
  }
};
</script>

<style scoped>
.civitai-link-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 2rem 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.link-header {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e9ecef;
}

.link-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
  color: #667eea;
}

.link-label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.civitai-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.9);
  padding: 1rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  color: #667eea;
  font-weight: 500;
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.civitai-link:hover {
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  color: #5a6fd8;
}

.link-text {
  font-family: 'Courier New', monospace;
  font-size: 1rem;
}

.external-icon {
  font-size: 1.2rem;
  margin-left: 0.5rem;
}

@media (max-width: 768px) {
  .civitai-link {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .external-icon {
    align-self: flex-end;
  }
}
</style> 