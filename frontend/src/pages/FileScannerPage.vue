<template>
  <FileScannerLogic :saved-paths="savedPaths">
    <template #default="logic">
      <div class="lora-scanner-page">
        <!-- Top Section - Horizontal Split -->
        <div class="top-section">
          <!-- Top Left - Scan, Register and Validate -->
          <div class="top-left-section">
            <ActionButtons
              :scanning-unique-loras="logic.scanningUniqueLoras"
              :validating-files="logic.validatingFiles"
              :has-saved-paths="logic.hasSavedPaths"
              @scan-click="logic.handleScanClick"
              @validate-click="logic.handleValidateClick"
            />
          </div>
          
          <!-- Top Right - LoRA Folders -->
          <div class="top-right-section">
            <PathManager 
              ref="pathManager"
              @paths-updated="handlePathsUpdated"
            />
          </div>
        </div>
        
        <!-- Bottom Section - Results -->
        <div class="bottom-section">
          <div v-if="logic.message" class="message-container">
            <div class="message-content">
              <div v-if="logic.message.includes('Scanning')" class="loading-animation">
                <div class="spinner"></div>
              </div>
              <span class="message-text">{{ logic.message }}</span>
            </div>
          </div>
          
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
    flex: 0 0 70%;
    min-width: 0;
  }

  .top-right-section {
    flex: 0 0 30%;
    min-width: 0;
  }

  .bottom-section {
    flex-shrink: 0;
  }

  .message-container {
    margin: 0 0 1rem 0;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .message-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .loading-animation {
    display: flex;
    align-items: center;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top: 2px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .message-text {
    color: white;
    font-weight: 500;
    font-size: 1.1rem;
    margin: 0;
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