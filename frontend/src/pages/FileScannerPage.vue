<template>
  <FileScannerLogic :saved-paths="savedPaths">
    <template #default="logic">
      <div class="lora-scanner-page">
        <!-- Path Management Component -->
        <PathManager 
          ref="pathManager"
          @paths-updated="handlePathsUpdated"
        />
        
        <hr style="margin: 1.5rem 0;" />
        
        <!-- Action Buttons Component -->
        <ActionButtons
          :scanning-unique-loras="logic.scanningUniqueLoras"
          :validating-files="logic.validatingFiles"
          :has-saved-paths="logic.hasSavedPaths"
          @scan-click="logic.handleScanClick"
          @validate-click="logic.handleValidateClick"
        />
        
        <p v-if="logic.message">{{ logic.message }}</p>
        
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
  }
  </style> 