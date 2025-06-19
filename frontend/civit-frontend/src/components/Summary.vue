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
                :class="getDownloadedCellClass(row[bm])"
                :style="getDownloadedCellStyle(row[bm])">
              ({{ row[bm]?.d1 || 0 }}, {{ row[bm]?.d2 || 0 }})
            </td>
          </tr>
          <tr style="font-weight:bold;background:#f3f4f6;">
            <td>Total</td>
            <td v-for="bm in baseModelsDownloaded" :key="bm">
              (
                {{ getDownloadedTotal(bm, 'd1') }},
                {{ getDownloadedTotal(bm, 'd2') }}
              )
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
    },
    getDownloadedCellStyle(cell) {
      // Use d1+d2 as value, find global max for the table
      const val = (cell?.d1 || 0) + (cell?.d2 || 0);
      const max = this.getDownloadedGlobalMax();
      return this.getGreenGradientStyle(val, max);
    },
    getMatrixCellStyle(value) {
      const val = value || 0;
      const max = this.getMatrixGlobalMax();
      return this.getGreenGradientStyle(val, max);
    },
    getGreenGradientStyle(val, max) {
      if (!val || max === 0) {
        return '';
      }
      // Gradient from #f9f9f9 (0) to #bbf7d0 (max) to #22c55e (high)
      let percent = max ? val / max : 0;
      if (percent < 0.01) percent = 0.01;
      if (percent > 1) percent = 1;
      // Interpolate between #f9f9f9 and #bbf7d0, then toward #22c55e
      // We'll use a simple 2-stop gradient for now
      let bg = '';
      if (percent < 0.7) {
        // #f9f9f9 to #bbf7d0
        bg = this.interpolateColor('#f9f9f9', '#bbf7d0', percent / 0.7);
      } else {
        // #bbf7d0 to #22c55e
        bg = this.interpolateColor('#bbf7d0', '#22c55e', (percent - 0.7) / 0.3);
      }
      return `background: ${bg};`;
    },
    interpolateColor(a, b, t) {
      // a, b: hex colors; t: 0-1
      function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        const num = parseInt(hex, 16);
        return [num >> 16, (num >> 8) & 0xff, num & 0xff];
      }
      function rgbToHex([r, g, b]) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      }
      const rgbA = hexToRgb(a);
      const rgbB = hexToRgb(b);
      const rgb = rgbA.map((v, i) => Math.round(v + (rgbB[i] - v) * t));
      return rgbToHex(rgb);
    },
    getDownloadedTotal(bm, type) {
      let sum = 0;
      for (const row of this.matrixDownloaded) {
        sum += row[bm]?.[type] || 0;
      }
      return sum;
    },
    getMatrixTotal(bm) {
      let sum = 0;
      for (const row of this.matrix) {
        sum += row[bm] || 0;
      }
      return sum;
    },
    getDownloadedGlobalMax() {
      let max = 0;
      for (const bm of this.baseModelsDownloaded) {
        for (const row of this.matrixDownloaded) {
          const v = (row[bm]?.d1 || 0) + (row[bm]?.d2 || 0);
          if (v > max) max = v;
        }
      }
      return max;
    },
    getMatrixGlobalMax() {
      let max = 0;
      for (const bm of this.baseModels) {
        for (const row of this.matrix) {
          const v = row[bm] || 0;
          if (v > max) max = v;
        }
      }
      return max;
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