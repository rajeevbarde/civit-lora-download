<template>
  <div class="pagination-section">
    <div class="pagination-controls">
      <button 
        :disabled="currentPage === 1 || isChangingPage"
        @click="changePage(currentPage - 1)"
        class="pagination-btn prev-btn"
      >
        <span class="btn-icon">◀️</span>
        <span class="btn-text">{{ isChangingPage ? 'Loading...' : 'Previous' }}</span>
      </button>
      <div class="page-info">
        <span class="page-label">Page</span>
        <span class="page-number">{{ currentPage }}</span>
      </div>
      <button 
        @click="changePage(currentPage + 1)"
        :disabled="isChangingPage"
        class="pagination-btn next-btn"
      >
        <span class="btn-text">{{ isChangingPage ? 'Loading...' : 'Next' }}</span>
        <span class="btn-icon">▶️</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'ModelPagination',
  props: {
    currentPage: {
      type: Number,
      default: 1
    },
    isChangingPage: {
      type: Boolean,
      default: false
    }
  },
  emits: ['page-change'],
  setup(props, { emit }) {
    const changePage = (newPage) => {
      if (newPage >= 1 && !props.isChangingPage) {
        emit('page-change', newPage);
      }
    };

    return {
      changePage
    };
  }
}
</script>

<style scoped>
/* Enhanced Pagination */
.pagination-section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e9ecef;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
}

.pagination-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.pagination-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.pagination-btn:disabled {
  background: #b8c2cc;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.page-label {
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
}

.page-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #667eea;
}

.btn-icon {
  font-size: 1rem;
}

.btn-text {
  font-weight: 600;
}

/* Responsive Design */
@media (max-width: 768px) {
  .pagination-controls {
    flex-direction: column;
    gap: 1rem;
  }
  
  .pagination-btn {
    width: 100%;
    justify-content: center;
  }
}
</style> 