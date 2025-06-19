<template>
  <div class="summary-page">
    <h1>Summary Page</h1>
    <p>This is the summary page. Add your summary content here.</p>
    <div v-if="loading || loadingDownloaded">Loading matrix...</div>
    <div v-else>
      <!-- Downloaded Matrix -->
      <table v-if="matrixDownloaded.length" class="summary-matrix">
        <caption style="caption-side:top;text-align:left;font-weight:bold;margin-bottom:0.5rem;">Downloaded Matrix (isDownloaded: (1, 2))</caption>
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
                :class="getDownloadedCellClass(row[bm])">
              ({{ row[bm]?.d1 || 0 }}, {{ row[bm]?.d2 || 0 }})
            </td>
          </tr>
        </tbody>
      </table>
      <!-- Existing Matrix -->
      <table v-if="matrix.length" class="summary-matrix">
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
                :class="getMatrixCellClass(row[bm])">
              {{ row[bm] }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else>No data available.</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Summary',
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
        const res = await fetch('http://localhost:3000/api/summary-matrix');
        const data = await res.json();
        this.baseModels = data.baseModels;
        this.nsfwLevels = data.nsfwLevels;
        this.matrix = data.matrix;
      } catch (e) {
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
        const res = await fetch('http://localhost:3000/api/summary-matrix-downloaded');
        const data = await res.json();
        this.baseModelsDownloaded = data.baseModels;
        this.nsfwLevelsDownloaded = data.nsfwLevels;
        this.matrixDownloaded = data.matrix;
      } catch (e) {
        this.baseModelsDownloaded = [];
        this.nsfwLevelsDownloaded = [];
        this.matrixDownloaded = [];
      } finally {
        this.loadingDownloaded = false;
      }
    },
    getDownloadedCellClass(cell) {
      const d1 = cell?.d1 || 0;
      const d2 = cell?.d2 || 0;
      if (d1 === 0 && d2 === 0) {
        return 'cell-neutral';
      } else {
        return 'cell-highlight';
      }
    },
    getMatrixCellClass(value) {
      if (!value || value === 0) {
        return 'cell-neutral';
      } else {
        return 'cell-highlight';
      }
    }
  }
};
</script>

<style scoped>
.summary-page {
  padding: 2rem;
}
.summary-matrix {
  border-collapse: collapse;
  margin-top: 2rem;
}
.summary-matrix th, .summary-matrix td {
  border: 1px solid #ccc;
  padding: 0.5rem 1rem;
  text-align: center;
}
.summary-matrix th {
  background: #f0f0f0;
}
.cell-neutral {
  background: #f9f9f9;
  color: #888;
}
.cell-highlight {
  background: #dbeafe;
  color: #1e293b;
  font-weight: 500;
}
</style> 