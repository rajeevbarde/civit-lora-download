<template>
  <FileScannerLogic :saved-paths="savedPaths">
    <template #default="logic">
      <div class="lora-scanner-page">
        <!-- Top Section - Horizontal Split -->
        <div class="top-section">
          <!-- Top Left - LoRA Folders -->
          <div class="top-left-section">
            <PathManager 
              ref="pathManager"
              @paths-updated="handlePathsUpdated"
            />
          </div>
          
          <!-- Top Right - Scan and Register LoRA -->
          <div class="top-right-section">
            <ActionButtons
              :scanning-unique-loras="logic.scanningUniqueLoras"
              :validating-files="logic.validatingFiles"
              :has-saved-paths="logic.hasSavedPaths"
              @scan-click="logic.handleScanClick"
              @validate-click="logic.handleValidateClick"
            />
          </div>
        </div>
        
        <!-- Bottom Section - Results -->
        <div class="bottom-section">
          <p v-if="logic.message" class="message">{{ logic.message }}</p>
          
          <!-- Unique Loras Results Component -->
          <UniqueLorasResults
            :unique-loras-results="logic.uniqueLorasResults"
            :orphan-files="logic.orphanFiles"
            :registering="logic.registering"
            :register-result="logic.registerResult"
            :register-timer="logic.registerTimer"
            @register-click="logic.handleRegisterClick"
          />
          
          <!-- Validation Results Component -->
          <ValidationResults
            :validation-results="logic.validationResults"
            @mismatch-deleted="logic.handleMismatchDeleted"
          />
        </div>
      </div>
    </template>
  </FileScannerLogic>
</template>
  
  <script>
  import PathManager from '@/components/filescanner/PathManager.vue';
  import ActionButtons from '@/components/filescanner/ActionButtons.vue';
  import UniqueLorasResults from '@/components/filescanner/UniqueLorasResults.vue';
  import ValidationResults from '@/components/filescanner/ValidationResults.vue';
  import FileScannerLogic from '@/components/filescanner/FileScannerLogic.vue';
  
  export default {
    name: 'LoRAScanner',
    components: {
      PathManager,
      ActionButtons,
      UniqueLorasResults,
      ValidationResults,
      FileScannerLogic
    },
    data() {
      return {
        savedPaths: []
      };
    },
    methods: {
      handlePathsUpdated(updatedPaths) {
        // Update saved paths from the event data
        this.savedPaths = updatedPaths || [];
      }
    }
  };
  </script>
  
  <style scoped>
  .lora-scanner-page {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    min-height: 100vh;
    box-sizing: border-box;
  }

  .top-section {
    display: flex;
    gap: 2rem;
    flex-shrink: 0;
  }

  .top-left-section {
    flex: 1;
    min-width: 0;
  }

  .top-right-section {
    flex: 1;
    min-width: 0;
  }

  .bottom-section {
    flex-shrink: 0;
  }

  .message {
    margin: 0 0 1rem 0;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #007bff;
  }

  /* Responsive design for smaller screens */
  @media (max-width: 1024px) {
    .top-section {
      flex-direction: column;
    }
    
    .top-left-section,
    .top-right-section {
      flex: none;
    }
  }
  </style> 