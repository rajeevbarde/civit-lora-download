<template>
  <div class="lora-summary-page">
    <h1>LoRA Summary Page</h1>
    <p>This is the LoRA summary page. Add your LoRA summary content here.</p>
    <div v-if="loading || loadingDownloaded" class="loading">Loading matrix...</div>
    <div v-else>
      <!-- Downloaded Matrix -->
      <div v-if="matrixDownloaded.length" class="matrix-container">
        <h2>Downloaded Matrix (isDownloaded: 1)</h2>
        <div class="table-wrapper">
          <table class="summary-matrix">
            <thead>
              <tr>
                <th>NSFW Level \\ Base Model</th>
                <th v-for="bm in baseModelsDownloaded" :key="bm">{{ bm }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in matrixDownloaded" :key="row.modelVersionNsfwLevel">
                <td>{{ row.modelVersionNsfwLevel }}</td>
                <td v-for="bm in baseModelsDownloaded" :key="bm"
                    :class="getDownloadedCellClass(row[bm])"
                    :style="getDownloadedCellStyle(row[bm])">
                  {{ row[bm] || 0 }}
                </td>
              </tr>
              <tr style="font-weight:bold;background:#f3f4f6;">
                <td>Total</td>
                <td v-for="bm in baseModelsDownloaded" :key="bm">
                  {{ getDownloadedTotal(bm) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Existing Matrix -->
      <div v-if="matrix.length" class="matrix-container">
        <h2>All Models Matrix</h2>
        <div class="table-wrapper">
          <table class="summary-matrix">
            <thead>
              <tr>
                <th>NSFW Level \ Base Model</th>
                <th v-for="bm in baseModels" :key="bm">{{ bm }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in matrix" :key="row.modelVersionNsfwLevel">
                <td>{{ row.modelVersionNsfwLevel }}</td>
                <td v-for="bm in baseModels" :key="bm"
                    :class="getMatrixCellClass(row[bm])"
                    :style="getMatrixCellStyle(row[bm])">
                  {{ row[bm] }}
                </td>
              </tr>
              <tr style="font-weight:bold;background:#f3f4f6;">
                <td>Total</td>
                <td v-for="bm in baseModels" :key="bm">
                  {{ getMatrixTotal(bm) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-else class="no-data">No data available.</div>
    </div>
  </div>
</template>

<script>
import { apiService } from '@/utils/api.js';
import { getGreenGradientStyle, calculateMatrixTotal, findGlobalMax } from '@/utils/helpers.js';
import { COLORS } from '@/utils/constants.js';

export default {
  name: 'LoRASummary',
  data() {
    return {
      baseModels: [],
      nsfwLevels: [],
      matrix: [],
      loading: true,
      baseModelsDownloaded: [],
      nsfwLevelsDownloaded: [],
      matrixDownloaded: [],
      loadingDownloaded: true,
    };
  },
  mounted() {
    this.fetchMatrix();
    this.fetchMatrixDownloaded();
  },
  methods: {
    async fetchMatrix() {
      this.loading = true;
      try {
        const data = await apiService.getSummaryMatrix();
        this.baseModels = data.baseModels;
        this.nsfwLevels = data.nsfwLevels;
        this.matrix = data.matrix;
      } catch (e) {
        console.error('Error fetching matrix:', e);
        this.baseModels = [];
        this.nsfwLevels = [];
        this.matrix = [];
      } finally {
        this.loading = false;
      }
    },
    async fetchMatrixDownloaded() {
      this.loadingDownloaded = true;
      try {
        const data = await apiService.getSummaryMatrixDownloaded();
        this.baseModelsDownloaded = data.baseModels;
        this.nsfwLevelsDownloaded = data.nsfwLevels;
        this.matrixDownloaded = data.matrix;
      } catch (e) {
        console.error('Error fetching downloaded matrix:', e);
        this.baseModelsDownloaded = [];
        this.nsfwLevelsDownloaded = [];
        this.matrixDownloaded = [];
      } finally {
        this.loadingDownloaded = false;
      }
    },
    getDownloadedCellClass(cell) {
      const val = cell || 0;
      if (val === 0) {
        return 'cell-zero';
      } else {
        return 'cell-highlight';
      }
    },
    getMatrixCellClass(value) {
      if (!value || value === 0) {
        return 'cell-zero';
      } else {
        return 'cell-highlight';
      }
    },
    getDownloadedCellStyle(cell) {
      const val = cell || 0;
      if (val === 0) {
        return `background: ${COLORS.STATUS.ZERO}; color: ${COLORS.STATUS.ZERO_TEXT};`;
      }
      const max = this.getDownloadedGlobalMax();
      return getGreenGradientStyle(val, max);
    },
    getMatrixCellStyle(value) {
      const val = value || 0;
      if (val === 0) {
        return `background: ${COLORS.STATUS.ZERO}; color: ${COLORS.STATUS.ZERO_TEXT};`;
      }
      const max = this.getMatrixGlobalMax();
      return getGreenGradientStyle(val, max);
    },
    getDownloadedTotal(bm) {
      return calculateMatrixTotal(this.matrixDownloaded, bm);
    },
    getMatrixTotal(bm) {
      return calculateMatrixTotal(this.matrix, bm);
    },
    getDownloadedGlobalMax() {
      return findGlobalMax(this.matrixDownloaded, this.baseModelsDownloaded);
    },
    getMatrixGlobalMax() {
      return findGlobalMax(this.matrix, this.baseModels);
    },
  },
};
</script>

<style scoped>
.lora-summary-page {
  width: 100%;
  padding: 16px;
}

h1 {
  font-size: 28px;
  font-weight: 300;
  margin-bottom: 16px;
  color: #1a202c;
  letter-spacing: -0.5px;
}

h2 {
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #374151;
}

p {
  margin-bottom: 24px;
  color: #6b7280;
}

.loading {
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #6c757d;
}

.no-data {
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #6c757d;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #dee2e6;
}

.matrix-container {
  margin-bottom: 32px;
}

.table-wrapper {
  width: 100%;
  overflow-x: auto;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-matrix {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: 13px;
}

.summary-matrix th {
  background: #f8f9fa;
  padding: 12px 10px;
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  color: #495057;
  border-bottom: 1px solid #dee2e6;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 10;
}

.summary-matrix td {
  padding: 10px;
  text-align: center;
  border-bottom: 1px solid #f1f3f4;
  white-space: nowrap;
  font-weight: 500;
}

.summary-matrix tr:hover {
  background-color: #f8f9fa;
}

.summary-matrix tr:last-child td {
  border-bottom: none;
}

.cell-zero {
  background: #fef2f2;
  color: #dc2626;
}

.cell-highlight {
  color: #065f46;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .lora-summary-page {
    padding: 8px;
  }
  
  h1 {
    font-size: 24px;
    margin-bottom: 12px;
  }
  
  h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }
  
  .summary-matrix {
    font-size: 11px;
  }
  
  .summary-matrix th,
  .summary-matrix td {
    padding: 6px 8px;
  }
}
</style> 