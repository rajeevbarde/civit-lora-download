<template>
  <div class="related-lora-section">
    <h3 class="related-lora-title">Related LoRA</h3>
    <table class="related-lora-table">
      <thead>
        <tr>
          <th>Model Name / Version</th>
          <th>Base Model</th>
          <th>Published Date</th>
          <th>Download State</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredRelatedLora" :key="item.modelId + '-' + item.modelVersionId">
          <td>
            <template v-if="isCurrentModel(item)">
              <span class="current-lora-name">{{ item.modelName }} / {{ item.modelVersionName }}</span>
              <span class="current-lora-label">&nbsp;(Current)</span>
            </template>
            <template v-else>
              <a v-if="item.modelId && item.modelVersionId" 
                 :href="`/model/${item.modelId}/${item.modelVersionId}`" 
                 target="_blank" 
                 rel="noopener noreferrer">
                {{ item.modelName }} / {{ item.modelVersionName }}
              </a>
            </template>
          </td>
          <td>{{ item.basemodel }}</td>
          <td>
            <span class="published-date-group">
              <span class="published-date">{{ formatDate(item.publishedAt) }}</span>
              <span v-if="isCurrentModel(item)" class="current-lora-label">&nbsp;(Current)</span>
              <span v-else class="relative-age-label">&nbsp;{{ getRelativeAge(item.publishedAt) }}</span>
            </span>
          </td>
          <td>
            <span v-if="item.isDownloaded === downloadStatus.DOWNLOADED" class="status-downloaded">Downloaded</span>
            <span v-else-if="item.isDownloaded === downloadStatus.DOWNLOADING" class="status-downloading">Downloading</span>
            <span v-else-if="item.isDownloaded === downloadStatus.FAILED" class="status-failed">Failed</span>
            <span v-else-if="item.isDownloaded === downloadStatus.IGNORED" class="status-ignored">Ignored</span>
            <span v-else class="status-not-downloaded">Not Downloaded</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'RelatedLoraTable',
  props: {
    relatedLora: {
      type: Array,
      required: true
    },
    currentModel: {
      type: Object,
      required: true
    },
    downloadStatus: {
      type: Object,
      required: true
    }
  },
  computed: {
    filteredRelatedLora() {
      return this.relatedLora.filter(item => item && item.modelVersionId != null);
    }
  },
  methods: {
    isCurrentModel(item) {
      return item && this.currentModel && item.modelVersionId === this.currentModel.modelVersionId;
    },
    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    },
    getRelativeAge(publishedAt) {
      if (!this.currentModel?.publishedAt || !publishedAt) return '';
      
      const current = new Date(this.currentModel.publishedAt);
      const other = new Date(publishedAt);
      const diffMs = other - current;
      
      if (Math.abs(diffMs) < 1000 * 60) return 'Just now';
      
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      const diffMonth = Math.floor(diffDay / 30);
      const diffYear = Math.floor(diffDay / 365);
      
      if (diffYear !== 0) {
        return Math.abs(diffYear) + ' year' + (Math.abs(diffYear) > 1 ? 's' : '') + 
               (diffYear > 0 ? ' newer' : ' older');
      }
      if (diffMonth !== 0) {
        return Math.abs(diffMonth) + ' month' + (Math.abs(diffMonth) > 1 ? 's' : '') + 
               (diffMonth > 0 ? ' newer' : ' older');
      }
      if (diffDay !== 0) {
        return Math.abs(diffDay) + ' day' + (Math.abs(diffDay) > 1 ? 's' : '') + 
               (diffDay > 0 ? ' newer' : ' older');
      }
      if (diffHr !== 0) {
        return Math.abs(diffHr) + ' hour' + (Math.abs(diffHr) > 1 ? 's' : '') + 
               (diffHr > 0 ? ' newer' : ' older');
      }
      if (diffMin !== 0) {
        return Math.abs(diffMin) + ' min' + (Math.abs(diffMin) > 1 ? 's' : '') + 
               (diffMin > 0 ? ' newer' : ' older');
      }
      
      return '';
    }
  }
};
</script>

<style scoped>
.related-lora-section {
  margin: 2rem auto 0 auto;
  max-width: 900px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  padding: 1.5rem 2rem 2rem 2rem;
}

.related-lora-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.related-lora-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.related-lora-table th, 
.related-lora-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e9ecef;
  text-align: left;
}

.related-lora-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #495057;
}

.related-lora-table tr:last-child td {
  border-bottom: none;
}

.related-lora-table a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.related-lora-table a:hover {
  text-decoration: underline;
}

.current-lora-label {
  background: #e6f4ea;
  color: #17643a !important;
  border-radius: 4px;
  padding: 2px 8px;
  font-weight: 700;
  font-size: 1em;
  margin-left: 8px;
}

.relative-age-label {
  color: #17643a;
  font-weight: 700;
  font-size: 1.08em;
  margin-left: 10px;
}

.published-date {
  color: #888;
  font-size: 0.97em;
  font-weight: 400;
}

.published-date-group {
  white-space: nowrap;
  display: inline-block;
}

.current-lora-name {
  color: #17643a;
  font-weight: 700;
}

.status-downloaded {
  color: #28a745;
  font-weight: 600;
}

.status-downloading {
  color: #007bff;
  font-weight: 600;
}

.status-failed {
  color: #dc3545;
  font-weight: 600;
}

.status-ignored {
  color: #b85c00;
  font-weight: 600;
}

.status-not-downloaded {
  color: #6c757d;
  font-weight: 600;
}
</style> 