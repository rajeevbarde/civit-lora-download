<template>
  <div class="model-details-section">
    <div class="details-header">
      <h2 class="details-title">Model Information</h2>
      <p class="details-subtitle">Complete details for this model version</p>
    </div>
    
    <div class="details-table-container">
      <table class="details-table">
        <thead>
          <tr>
            <th class="field-header">Field</th>
            <th class="value-header">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, key) in processedModelData" :key="key" class="detail-row">
            <td class="field-cell">{{ key }}</td>
            <td class="value-cell">
              <div v-if="typeof value === 'string' && value.includes('<')" class="html-content">
                <div v-html="value"></div>
              </div>
              <div v-else class="text-content">{{ value }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModelDetails',
  props: {
    model: {
      type: Object,
      required: true
    }
  },
  computed: {
    processedModelData() {
      if (!this.model) return {};
      
      const excludedFields = [
        'modelId', 'modelType', 'modelVersionId', 'fileType', 
        'fileDownloadUrl', 'isDownloaded', 'modelDownloadCount', 
        'modelVersionNsfwLevel'
      ];
      
      const nsfwGroups = {
        'Safe': [0],
        'Mild': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        'Moderate': [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
        'NSFW': [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47],
        'Extreme NSFW': [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]
      };
      
      const fieldOrder = [
        'Model Name / Version', 'Description', 'Model Version Description',
        'NSFW Status', 'NSFW Level', 'Creator', 'Creator ID', 'Published Date',
        'Size', 'File Name', 'File Path', 'Base Model', 'Tags', 'Rating',
        'Rating Count', 'Comment Count', 'Favorite Count'
      ];
      
      return this.processModelFields(excludedFields, nsfwGroups, fieldOrder);
    }
  },
  methods: {
    processModelFields(excludedFields, nsfwGroups, fieldOrder) {
      const processed = {};
      
      // First pass: collect special fields
      const specialFields = this.collectSpecialFields();
      
      // Second pass: process all fields
      for (const [key, value] of Object.entries(this.model)) {
        if (excludedFields.includes(key)) continue;
        
        const { processedValue, processedKey } = this.processField(key, value, specialFields, nsfwGroups);
        if (processedKey) {
          processed[processedKey] = processedValue;
        }
      }
      
      // Reorder fields
      return this.reorderFields(processed, fieldOrder);
    },
    
    collectSpecialFields() {
      const fields = {};
      for (const [key, value] of Object.entries(this.model)) {
        if (key === 'modelName') fields.modelName = value;
        if (key === 'modelVersionName') fields.modelVersionName = value;
        if (key === 'description') fields.description = value;
        if (key === 'modelVersionDescription') fields.modelVersionDescription = value;
      }
      return fields;
    },
    
    processField(key, value, specialFields, nsfwGroups) {
      let processedValue = value;
      let processedKey = key;
      
      // Handle special field combinations
      if (key === 'modelName') {
        processedValue = specialFields.modelVersionName 
          ? `${value} / ${specialFields.modelVersionName}` 
          : value;
        processedKey = 'Model Name / Version';
        return { processedValue, processedKey };
      }
      
      if (key === 'modelVersionName') {
        return { processedValue: null, processedKey: null }; // Skip, combined with modelName
      }
      
      // Handle NSFW fields
      if (key === 'modelNsfw') {
        processedValue = value === 1 ? 'NSFW' : 'SFW';
        processedKey = 'NSFW Status';
      }
      
      if (key === 'modelNsfwLevel') {
        for (const [groupName, levels] of Object.entries(nsfwGroups)) {
          if (levels.includes(value)) {
            processedValue = groupName;
            break;
          }
        }
        processedKey = 'NSFW Level';
      }
      
      // Handle base model combination
      if (key === 'basemodel') {
        const baseModelType = this.model.basemodeltype;
        processedValue = baseModelType ? `${value} (${baseModelType})` : value;
        processedKey = 'Base Model';
      }
      
      if (key === 'basemodeltype') {
        return { processedValue: null, processedKey: null }; // Skip, combined with basemodel
      }
      
      // Handle file size conversion
      if (key === 'size_in_kb' && value !== null && value !== undefined) {
        const sizeInMB = (value / 1024).toFixed(2);
        processedValue = `${sizeInMB} MB`;
        processedKey = 'Size';
      }
      
      // Handle date formatting
      if (key === 'publishedAt' && value) {
        processedValue = new Date(value).toLocaleString();
        processedKey = 'Published Date';
      }
      
      // Handle file path based on download status
      if (key === 'file_path') {
        processedValue = this.getFilePathDisplay(value);
        processedKey = 'File Path';
      }
      
      // Format field names
      processedKey = this.formatFieldName(processedKey);
      
      return { processedValue, processedKey };
    },
    
    getFilePathDisplay(value) {
      const downloadStatus = this.model.isDownloaded;
      const statusMap = {
        1: value && value.trim() !== '' ? value : 'Path not available',
        0: 'Not downloaded',
        3: 'Download failed',
        4: 'Download ignored'
      };
      return statusMap[downloadStatus] || 'Unknown status';
    },
    
    formatFieldName(key) {
      const nameMap = {
        'fileName': 'File Name',
        'description': 'Description',
        'modelVersionDescription': 'Model Version Description',
        'tags': 'Tags',
        'nsfw': 'NSFW',
        'downloadCount': 'Download Count',
        'rating': 'Rating',
        'ratingCount': 'Rating Count',
        'commentCount': 'Comment Count',
        'favoriteCount': 'Favorite Count',
        'creator': 'Creator',
        'creatorId': 'Creator ID'
      };
      return nameMap[key] || key;
    },
    
    reorderFields(processed, fieldOrder) {
      const orderedFields = {};
      
      // Add fields in specified order
      for (const fieldName of fieldOrder) {
        if (processed[fieldName] !== undefined) {
          orderedFields[fieldName] = processed[fieldName];
        }
      }
      
      // Add remaining fields
      for (const [key, value] of Object.entries(processed)) {
        if (!fieldOrder.includes(key)) {
          orderedFields[key] = value;
        }
      }
      
      return orderedFields;
    }
  }
};
</script>

<style scoped>
.model-details-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
  padding: 2.5rem;
  margin: 2rem 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
}

.details-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.details-title {
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.75rem 0;
}

.details-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.details-table-container {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
  overflow-x: auto;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.field-header,
.value-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  font-size: 1rem;
}

.field-header {
  width: 30%;
  min-width: 150px;
}

.value-header {
  width: 70%;
}

.detail-row {
  transition: all 0.3s ease;
}

.detail-row:hover {
  background: #f8f9fa;
  transform: translateX(4px);
}

.field-cell {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  font-weight: 600;
  color: #2c3e50;
  background: #f8f9fa;
  font-size: 0.95rem;
  text-transform: capitalize;
}

.value-cell {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
  color: #495057;
  font-size: 0.95rem;
  line-height: 1.5;
}

.text-content {
  word-break: break-word;
}

.html-content {
  word-break: break-word;
}

.html-content :deep(a) {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.html-content :deep(a):hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .model-details-section {
    padding: 1.5rem;
    margin: 1.5rem 0;
  }
  
  .details-title {
    font-size: 1.5rem;
  }
  
  .details-subtitle {
    font-size: 1rem;
  }
  
  .details-table-container {
    padding: 1rem;
  }
  
  .field-header,
  .value-header,
  .field-cell,
  .value-cell {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}
</style> 