<template>
  <div class="duplicate-tab-content">
    <!-- Disk Duplicates Table -->
    <table v-if="tabType === 'disk'" class="unique-loras-table">
      <thead>
        <tr>
          <th>File Name</th>
          <th>File Paths</th>
          <th>Hash Check</th>
          <th>Identify Metadata</th>
          <th>Actions</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(group, idx) in duplicateData" :key="group.filename + idx">
          <td>{{ group.filename }}</td>
          <td>
            <div v-for="(path, pathIdx) in group.paths" :key="pathIdx" class="file-path-item">
              {{ path }}
            </div>
          </td>
          <td>
            <button 
              @click="$emit('hash-check', group.filename)"
              :disabled="loadingStates.hashCheckLoading[group.filename] || loadingStates.hashCheckedFiles.has(group.filename)"
              class="hash-check-btn"
            >
              {{ loadingStates.hashCheckLoading[group.filename] ? 'Calculating...' : 'Check Hash' }}
            </button>
            <div v-if="results.hashResults[group.filename]" class="hash-result">
              {{ results.hashResults[group.filename] }}
            </div>
          </td>
          <td>
            <button 
              @click="$emit('identify-metadata', group.filename)"
              :disabled="loadingStates.metadataLoading[group.filename] || !loadingStates.hashCheckedFiles.has(group.filename) || loadingStates.identifiedFiles.has(group.filename)"
              :title="!loadingStates.hashCheckedFiles.has(group.filename) ? 'Please check hash first' : loadingStates.identifiedFiles.has(group.filename) ? 'Already identified' : ''"
              class="metadata-btn"
            >
              {{ loadingStates.metadataLoading[group.filename] ? 'Searching...' : 'Identify' }}
            </button>
            <div v-if="results.metadataResults[group.filename]" class="metadata-result">
              <div v-html="results.metadataResults[group.filename]"></div>
            </div>
          </td>
          <td>
            <div v-if="loadingStates.hashCheckedFiles.has(group.filename) && results.hashResults[group.filename] && results.identicalHashModels[group.filename]">
              <div v-for="(path, pathIdx) in group.paths" :key="pathIdx" class="action-item">
                <div class="file-path">{{ path }}</div>
                <select 
                  v-model="selectedActions[path]" 
                  class="action-dropdown"
                  :disabled="!results.identicalHashModels[group.filename] || results.identicalHashModels[group.filename].length === 0"
                >
                  <option 
                    v-for="model in getModelsForPath(path, group.filename)" 
                    :key="`${model.modelId}-${model.modelVersionId}`"
                    :value="`${model.modelId}/${model.modelVersionId}/${model.fileName}`"
                  >
                    {{ model.modelId }}/{{ model.modelVersionId }}/{{ model.fileName }}
                  </option>
                  <option value="_duplicate">rename as _duplicate</option>
                </select>
              </div>
              <button 
                @click="$emit('register-actions', { filename: group.filename, selectedActions: this.selectedActions })"
                :disabled="!hasSelectedActions(group.filename) || isRegistrationSuccessful(group.filename)"
                class="register-btn"
                :class="{ 'success': isRegistrationSuccessful(group.filename) }"
              >
                {{ getRegisterButtonText(group.filename) }}
              </button>
            </div>
          </td>
          <td>
            <div v-if="results.registrationResults[group.filename]" class="registration-result">
              <div v-for="(result, path) in results.registrationResults[group.filename]" :key="path" class="result-item">
                <div class="result-path"><strong>Path:</strong> {{ path }}</div>
                <div class="result-action"><strong>Action:</strong> {{ result.action }}</div>
                <div class="result-status" :class="result.status">
                  <strong>Status:</strong> {{ result.message }}
                </div>
              </div>
            </div>
          </td>
        </tr>
        <tr v-if="duplicateData.length === 0"><td colspan="6" class="no-unique-files">No duplicates on disk found.</td></tr>
      </tbody>
    </table>

    <!-- Database Duplicates Table -->
    <table v-else-if="tabType === 'db'" class="unique-loras-table">
      <thead>
        <tr>
          <th>Full Path</th>
          <th>Database check</th>
          <th>Identify metadata</th>
          <th>Action</th>
          <th>Results</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(file, idx) in duplicateData" :key="file.fullPath + idx">
          <td>{{ file.fullPath }}</td>
          <td>
            <button 
              class="db-check-btn" 
              @click="$emit('database-check', file)"
              :disabled="loadingStates.dbCheckLoading[file.fullPath] || loadingStates.dbCheckedFiles.has(file.fullPath)"
            >
              {{ loadingStates.dbCheckLoading[file.fullPath] ? 'Checking...' : loadingStates.dbCheckedFiles.has(file.fullPath) ? 'Completed' : 'Check' }}
            </button>
            <div v-if="results.dbCheckResults[file.fullPath]" class="db-check-result">
              <div v-if="results.dbCheckResults[file.fullPath].success" class="db-check-success">
                <div class="db-check-count">Found {{ results.dbCheckResults[file.fullPath].count }} model(s):</div>
                <div v-for="(model, index) in results.dbCheckResults[file.fullPath].models" :key="index" class="model-link-item">
                  <div class="model-link-container">
                    <a 
                      :href="model.url" 
                      target="_blank" 
                      class="model-link"
                    >
                      {{ model.modelId }}/{{ model.modelVersionId }}
                    </a>
                    <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                  </div>
                </div>
              </div>
              <div v-else class="db-check-error">
                {{ results.dbCheckResults[file.fullPath].message }}
              </div>
            </div>
          </td>
          <td>
            <button 
              class="identify-metadata-btn" 
              @click="$emit('identify-metadata', file)"
              :disabled="loadingStates.identifyMetadataLoading[file.fullPath] || loadingStates.metadataIdentifiedFiles.has(file.fullPath) || !loadingStates.dbCheckedFiles.has(file.fullPath)"
            >
              {{ loadingStates.identifyMetadataLoading[file.fullPath] ? 'Identifying...' : loadingStates.metadataIdentifiedFiles.has(file.fullPath) ? 'Completed' : 'Identify' }}
            </button>
            <div v-if="results.identifyMetadataResults[file.fullPath]" class="identify-metadata-result">
              <div v-html="results.identifyMetadataResults[file.fullPath]"></div>
            </div>
          </td>
          <td>
            <div class="action-section">
              <div v-if="results.comparisonResults[file.fullPath]" class="comparison-result">
                <div class="comparison-header">Comparison Results:</div>
                <div v-if="results.comparisonResults[file.fullPath].status === 'both_not_found'" class="comparison-both-not-found">
                  ❌ Not found in database or CivitAI
                </div>
                <div v-else-if="results.comparisonResults[file.fullPath].status === 'only_civitai_found'" class="comparison-only-civitai">
                  ✅ Found in CivitAI only
                  <div class="model-info">
                    Model: {{ results.comparisonResults[file.fullPath].metadataModel.modelId }}/{{ results.comparisonResults[file.fullPath].metadataModel.modelVersionId }}
                    <span v-if="results.comparisonResults[file.fullPath].isAlreadyRegistered" class="already-registered-note">(Already registered)</span>
                  </div>
                  <button 
                    class="register-btn"
                    @click="$emit('register-model', { file, model: results.comparisonResults[file.fullPath].metadataModel })"
                    :disabled="loadingStates.registrationLoading[file.fullPath] || loadingStates.registeredFiles.has(file.fullPath) || results.comparisonResults[file.fullPath].isAlreadyRegistered"
                  >
                    {{ loadingStates.registrationLoading[file.fullPath] ? 'Registering...' : 
                       loadingStates.registeredFiles.has(file.fullPath) ? 'Completed' : 
                       results.comparisonResults[file.fullPath].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                  </button>
                </div>
                <div v-else-if="results.comparisonResults[file.fullPath].status === 'only_db_found'" class="comparison-only-db">
                  ✅ Found in database only
                  <div class="db-models">
                    <div v-for="(model, index) in results.comparisonResults[file.fullPath].dbModels" :key="index" class="db-model-item">
                      <div class="model-link-container">
                        <span>{{ model.modelId }}/{{ model.modelVersionId }}</span>
                        <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else-if="results.comparisonResults[file.fullPath].status === 'match_found'" class="comparison-match">
                  ✅ Perfect match found!
                  <div class="match-info">
                    Model: {{ results.comparisonResults[file.fullPath].metadataModel.modelId }}/{{ results.comparisonResults[file.fullPath].metadataModel.modelVersionId }}
                    <span v-if="results.comparisonResults[file.fullPath].isAlreadyRegistered" class="already-registered-note">(Already registered)</span>
                  </div>
                  <button 
                    class="register-btn"
                    @click="$emit('register-model', { file, model: results.comparisonResults[file.fullPath].metadataModel })"
                    :disabled="loadingStates.registrationLoading[file.fullPath] || loadingStates.registeredFiles.has(file.fullPath) || results.comparisonResults[file.fullPath].isAlreadyRegistered"
                  >
                    {{ loadingStates.registrationLoading[file.fullPath] ? 'Registering...' : 
                       loadingStates.registeredFiles.has(file.fullPath) ? 'Completed' : 
                       results.comparisonResults[file.fullPath].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                  </button>
                </div>
                <div v-else-if="results.comparisonResults[file.fullPath].status === 'mismatch'" class="comparison-mismatch">
                  ⚠️ Mismatch detected
                  <div class="mismatch-details">
                    <div class="civitai-model">
                      CivitAI: {{ results.comparisonResults[file.fullPath].metadataModel.modelId }}/{{ results.comparisonResults[file.fullPath].metadataModel.modelVersionId }}
                    </div>
                    <div class="db-models">
                      Database: 
                      <div v-for="(model, index) in results.comparisonResults[file.fullPath].dbModels" :key="index" class="db-model-item">
                        <div class="model-link-container">
                          <span>{{ model.modelId }}/{{ model.modelVersionId }}</span>
                          <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    class="register-btn"
                    @click="$emit('register-model', { file, model: results.comparisonResults[file.fullPath].metadataModel })"
                    :disabled="loadingStates.registrationLoading[file.fullPath] || loadingStates.registeredFiles.has(file.fullPath) || results.comparisonResults[file.fullPath].isAlreadyRegistered"
                  >
                    {{ loadingStates.registrationLoading[file.fullPath] ? 'Registering...' : 
                       loadingStates.registeredFiles.has(file.fullPath) ? 'Completed' : 
                       results.comparisonResults[file.fullPath].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                  </button>
                </div>
              </div>
              <div v-else class="action-placeholder">
                Complete Check & Identify to see comparison
              </div>
            </div>
          </td>
          <td>
            <div v-if="results.registrationResults[file.fullPath]" class="registration-result">
              <div class="result-item">
                <div class="result-status" :class="results.registrationResults[file.fullPath].status">
                  <strong>Status:</strong> {{ results.registrationResults[file.fullPath].message }}
                </div>
              </div>
            </div>
          </td>
        </tr>
        <tr v-if="duplicateData.length === 0"><td colspan="5" class="no-unique-files">No duplicates in DB found.</td></tr>
      </tbody>
    </table>

    <!-- Both Duplicates Table -->
    <table v-else-if="tabType === 'diskdb'" class="unique-loras-table">
      <thead>
        <tr>
          <th>File Name</th>
          <th>File Paths</th>
          <th>Hash Check</th>
          <th>Database check</th>
          <th>Identify metadata</th>
          <th>Action</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(group, idx) in duplicateData" :key="group.filename + idx">
          <td>{{ group.filename }}</td>
          <td>
            <div v-for="(path, pathIdx) in group.paths" :key="pathIdx" class="file-path-item">
              {{ path }}
            </div>
          </td>
          <td>
            <button 
              @click="$emit('hash-check', group.filename)"
              :disabled="loadingStates.hashCheckLoading[group.filename] || loadingStates.hashCheckedFiles.has(group.filename)"
              class="hash-check-btn"
            >
              {{ loadingStates.hashCheckLoading[group.filename] ? 'Calculating...' : 'Check Hash' }}
            </button>
            <div v-if="results.hashResults[group.filename]" class="hash-result">
              {{ results.hashResults[group.filename] }}
            </div>
          </td>
          <td>
            <button
              class="db-check-btn"
              @click="$emit('database-check', { fullPath: group.paths[0] })"
              :disabled="!loadingStates.hashCheckedFiles.has(group.filename) || !results.hashDetails[group.filename] || results.hashDetails[group.filename].uniqueHashes.size !== 1 || loadingStates.dbCheckLoading[group.paths[0]] || loadingStates.dbCheckedFiles.has(group.paths[0])"
              :title="!loadingStates.hashCheckedFiles.has(group.filename) ? 'Please check hash first' : (results.hashDetails[group.filename] && results.hashDetails[group.filename].uniqueHashes.size !== 1 ? 'Files must be identical in hash' : loadingStates.dbCheckedFiles.has(group.paths[0]) ? 'Already checked' : '')"
            >
              {{ loadingStates.dbCheckLoading[group.paths[0]] ? 'Checking...' : loadingStates.dbCheckedFiles.has(group.paths[0]) ? 'Completed' : 'Check' }}
            </button>
            <div v-if="results.dbCheckResults[group.paths[0]]" class="db-check-result">
              <div v-if="results.dbCheckResults[group.paths[0]].success" class="db-check-success">
                <div class="db-check-count">Found {{ results.dbCheckResults[group.paths[0]].count }} model(s):</div>
                <div v-for="(model, index) in results.dbCheckResults[group.paths[0]].models" :key="index" class="model-link-item">
                  <div class="model-link-container">
                    <a 
                      :href="model.url" 
                      target="_blank" 
                      class="model-link"
                    >
                      {{ model.modelId }}/{{ model.modelVersionId }}
                    </a>
                    <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                  </div>
                </div>
              </div>
              <div v-else class="db-check-error">
                {{ results.dbCheckResults[group.paths[0]].message }}
              </div>
            </div>
          </td>
          <td>
            <button
              class="identify-metadata-btn"
              @click="$emit('identify-metadata', { fullPath: group.paths[0] })"
              :disabled="loadingStates.identifyMetadataLoading[group.paths[0]] || loadingStates.metadataIdentifiedFiles.has(group.paths[0]) || !loadingStates.dbCheckedFiles.has(group.paths[0])"
              :title="!loadingStates.dbCheckedFiles.has(group.paths[0]) ? 'Please complete database check first' : loadingStates.metadataIdentifiedFiles.has(group.paths[0]) ? 'Already identified' : ''"
            >
              {{ loadingStates.identifyMetadataLoading[group.paths[0]] ? 'Identifying...' : loadingStates.metadataIdentifiedFiles.has(group.paths[0]) ? 'Completed' : 'Identify' }}
            </button>
            <div v-if="results.identifyMetadataResults[group.paths[0]]" class="identify-metadata-result">
              <div v-html="results.identifyMetadataResults[group.paths[0]]"></div>
            </div>
          </td>
          <td>
            <div class="action-section">
              <div v-if="results.comparisonResults[group.paths[0]]" class="comparison-result">
                <div class="comparison-header">Comparison Results:</div>
                <div v-if="results.comparisonResults[group.paths[0]].status === 'both_not_found'" class="comparison-both-not-found">
                  ❌ Not found in database or CivitAI
                </div>
                <div v-else-if="results.comparisonResults[group.paths[0]].status === 'only_civitai_found'" class="comparison-only-civitai">
                  ✅ Found in CivitAI only
                  <div class="model-info">
                    Model: {{ results.comparisonResults[group.paths[0]].metadataModel.modelId }}/{{ results.comparisonResults[group.paths[0]].metadataModel.modelVersionId }}
                    <span v-if="results.comparisonResults[group.paths[0]].isAlreadyRegistered" class="already-registered-note">(Already registered)</span>
                  </div>
                  <button 
                    class="register-btn"
                    @click="$emit('register-model', { file: { fullPath: group.paths[0] }, model: results.comparisonResults[group.paths[0]].metadataModel })"
                    :disabled="loadingStates.registrationLoading[group.paths[0]] || loadingStates.registeredFiles.has(group.paths[0]) || results.comparisonResults[group.paths[0]].isAlreadyRegistered"
                  >
                    {{ loadingStates.registrationLoading[group.paths[0]] ? 'Registering...' : 
                       loadingStates.registeredFiles.has(group.paths[0]) ? 'Completed' : 
                       results.comparisonResults[group.paths[0]].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                  </button>
                </div>
                <div v-else-if="results.comparisonResults[group.paths[0]].status === 'only_db_found'" class="comparison-only-db">
                  ✅ Found in database only
                  <div class="db-models">
                    <div v-for="(model, index) in results.comparisonResults[group.paths[0]].dbModels" :key="index" class="db-model-item">
                      <div class="model-link-container">
                        <span>{{ model.modelId }}/{{ model.modelVersionId }}</span>
                        <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else-if="results.comparisonResults[group.paths[0]].status === 'match_found'" class="comparison-match">
                  ✅ Perfect match found!
                  <div class="match-info">
                    Model: {{ results.comparisonResults[group.paths[0]].metadataModel.modelId }}/{{ results.comparisonResults[group.paths[0]].metadataModel.modelVersionId }}
                    <span v-if="results.comparisonResults[group.paths[0]].isAlreadyRegistered" class="already-registered-note">(Already registered)</span>
                  </div>
                  <button 
                    class="register-btn"
                    @click="$emit('register-model', { file: { fullPath: group.paths[0] }, model: results.comparisonResults[group.paths[0]].metadataModel })"
                    :disabled="loadingStates.registrationLoading[group.paths[0]] || loadingStates.registeredFiles.has(group.paths[0]) || results.comparisonResults[group.paths[0]].isAlreadyRegistered"
                  >
                    {{ loadingStates.registrationLoading[group.paths[0]] ? 'Registering...' : 
                       loadingStates.registeredFiles.has(group.paths[0]) ? 'Completed' : 
                       results.comparisonResults[group.paths[0]].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                  </button>
                </div>
                <div v-else-if="results.comparisonResults[group.paths[0]].status === 'mismatch'" class="comparison-mismatch">
                  ⚠️ Mismatch detected
                  <div class="mismatch-details">
                    <div class="civitai-model">
                      CivitAI: {{ results.comparisonResults[group.paths[0]].metadataModel.modelId }}/{{ results.comparisonResults[group.paths[0]].metadataModel.modelVersionId }}
                    </div>
                    <div class="db-models">
                      Database: 
                      <div v-for="(model, index) in results.comparisonResults[group.paths[0]].dbModels" :key="index" class="db-model-item">
                        <div class="model-link-container">
                          <span>{{ model.modelId }}/{{ model.modelVersionId }}</span>
                          <span v-if="model.isRegistered" class="registered-indicator" title="Registered (isDownloaded=1, file_path exists)">✅</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    class="register-btn"
                    @click="$emit('register-model', { file: { fullPath: group.paths[0] }, model: results.comparisonResults[group.paths[0]].metadataModel })"
                    :disabled="loadingStates.registrationLoading[group.paths[0]] || loadingStates.registeredFiles.has(group.paths[0]) || results.comparisonResults[group.paths[0]].isAlreadyRegistered"
                  >
                    {{ loadingStates.registrationLoading[group.paths[0]] ? 'Registering...' : 
                       loadingStates.registeredFiles.has(group.paths[0]) ? 'Completed' : 
                       results.comparisonResults[group.paths[0]].isAlreadyRegistered ? 'Already Registered' : 'Register' }}
                  </button>
                </div>
              </div>
              <div v-else class="action-placeholder">
                Complete Check & Identify to see comparison
              </div>
            </div>
          </td>
          <td>
            <div v-if="results.registrationResults[group.paths[0]]" class="registration-result">
              <div class="result-item">
                <div class="result-status" :class="results.registrationResults[group.paths[0]].status">
                  <strong>Status:</strong> {{ results.registrationResults[group.paths[0]].message }}
                </div>
              </div>
            </div>
          </td>
        </tr>
        <tr v-if="duplicateData.length === 0"><td colspan="7" class="no-unique-files">No duplicates on disk & DB found.</td></tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'DuplicateIssuesTab',
  props: {
    tabType: {
      type: String,
      required: true,
      validator: value => ['disk', 'db', 'diskdb'].includes(value)
    },
    duplicateData: {
      type: Array,
      required: true
    },
    loadingStates: {
      type: Object,
      required: true
    },
    results: {
      type: Object,
      required: true
    },
    frontendBaseUrl: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      selectedActions: {}
    }
  },
  emits: [
    'hash-check', 
    'identify-metadata', 
    'register-actions', 
    'database-check', 
    'register-model'
  ],
  methods: {
    getModelsForPath(path, filename) {
      const hashDetail = this.results.hashDetails[filename];
      if (!hashDetail) return [];
      
      const pathHash = this.results.pathHashMapping[path];
      if (!pathHash) return [];
      
      // For identical hashes, return all models
      if (hashDetail.uniqueHashes.size === 1) {
        return this.results.identicalHashModels[filename] || [];
      }
      
      // For non-identical hashes, return only models that match this path's hash
      return (this.results.identicalHashModels[filename] || []).filter(model => {
        // Extract hash from model (it was stored as hash.substring(0, 8) + '...')
        const modelHash = model.hash;
        return modelHash && pathHash.startsWith(modelHash.substring(0, 8));
      });
    },
    hasSelectedActions(filename) {
      // Check if any actions are selected for this file group
      let group = this.duplicateData.find(g => g.filename === filename);
      if (!group) return false;
      
      const hasAllSelections = group.paths.some(path => this.selectedActions[path] && this.selectedActions[path] !== '');
      
      // Also validate that there are no duplicate values (excluding _duplicate)
      const validationResult = this.validateSelectedActions(filename);
      
      return hasAllSelections && validationResult.isValid;
    },
    validateSelectedActions(filename) {
      let group = this.duplicateData.find(g => g.filename === filename);
      if (!group) {
        return { isValid: false, errorMessage: 'File group not found' };
      }
      
      // Get all selected values for this file group
      const selectedValues = group.paths
        .map(path => this.selectedActions[path])
        .filter(value => value && value !== ''); // Filter out empty values
      
      // Check if all paths have selected values
      if (selectedValues.length !== group.paths.length) {
        return { isValid: false, errorMessage: 'Please select an action for all files' };
      }
      
      // Create a map to track values (excluding _duplicate)
      const valueCounts = {};
      const duplicateValues = [];
      
      selectedValues.forEach(value => {
        if (value !== '_duplicate') {
          valueCounts[value] = (valueCounts[value] || 0) + 1;
          if (valueCounts[value] === 2) { // First duplicate found
            duplicateValues.push(value);
          }
        }
      });
      
      if (duplicateValues.length > 0) {
        return { 
          isValid: false, 
          errorMessage: `Duplicate values found: ${duplicateValues.join(', ')}. Each file must have a unique action (except "_duplicate").` 
        };
      }
      
      return { isValid: true };
    },
    isRegistrationSuccessful(filename) {
      const results = this.results.registrationResults[filename];
      if (!results) return false;
      
      // Check if all actions were successful
      const allSuccessful = Object.values(results).every(result => 
        result.status === 'success'
      );
      
      return allSuccessful;
    },
    getRegisterButtonText(filename) {
      if (this.isRegistrationSuccessful(filename)) {
        return '✅ Completed';
      }
      return 'Register';
    },
    isSingleFileRegistrationSuccessful(filePath) {
      const results = this.results.registrationResults[filePath];
      if (!results) return false;
      
      return results.status === 'success';
    }
  }
}
</script>

<style scoped>
.unique-loras-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  table-layout: fixed;
}

.unique-loras-table th, .unique-loras-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.unique-loras-table th:nth-child(1), .unique-loras-table td:nth-child(1) { /* File Name */
  width: 15%;
}

.unique-loras-table th:nth-child(2), .unique-loras-table td:nth-child(2) { /* File Paths */
  width: 25%;
}

.unique-loras-table th:nth-child(3), .unique-loras-table td:nth-child(3) { /* Hash Check */
  width: 15%;
}

.unique-loras-table th:nth-child(4), .unique-loras-table td:nth-child(4) { /* Identify Metadata */
  width: 15%;
}

.unique-loras-table th:nth-child(5), .unique-loras-table td:nth-child(5) { /* Actions */
  width: 15%;
}

.unique-loras-table th:nth-child(6), .unique-loras-table td:nth-child(6) { /* Result */
  width: 15%;
}

.unique-loras-table th:nth-child(7), .unique-loras-table td:nth-child(7) { /* Result */
  width: 15%;
}

.unique-loras-table th {
  background: #f8f8f8;
  font-weight: bold;
}

.no-unique-files {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 2rem;
}

.file-path-item {
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #eee;
}

.file-path-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.hash-check-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
}

.hash-check-btn:hover:not(:disabled) {
  background: #218838;
}

.hash-check-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.hash-result {
  font-size: 12px;
  font-weight: 500;
  padding: 0.25rem 0;
}

.metadata-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
}

.metadata-btn:hover:not(:disabled) {
  background: #138496;
}

.metadata-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.metadata-result {
  font-size: 11px;
  font-weight: 500;
  padding: 0.25rem 0;
}

.metadata-result div {
  margin: 0;
  white-space: pre;
  font-family: inherit;
}

.metadata-result div a {
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
}

.metadata-result div a:hover {
  color: #0056b3;
}

.action-item {
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #eee;
}

.action-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.action-dropdown {
  width: 100%;
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
}

.register-btn {
  background: #28a745;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  margin-top: 0.5rem;
}

.register-btn:hover:not(:disabled) {
  background: #218838;
}

.register-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.register-btn.success {
  background: #28a745;
  color: white;
  cursor: default;
}

.register-btn.success:disabled {
  background: #28a745;
  color: white;
  cursor: default;
}

.registration-result {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 0.85rem;
}

.result-item {
  margin-bottom: 0.25rem;
}

.result-status {
  font-weight: 500;
}

.result-status.success {
  color: #28a745;
}

.result-status.error {
  color: #dc3545;
}

.db-check-btn {
  background: #ffc107;
  color: #333;
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
}

.db-check-btn:hover:not(:disabled) {
  background: #ffb300;
}

.db-check-btn:disabled {
  background: #e0e0e0;
  color: #aaa;
  cursor: not-allowed;
}

.db-check-result {
  margin-top: 0.5rem;
  font-size: 12px;
}

.db-check-success {
  color: #28a745;
}

.db-check-error {
  color: #dc3545;
}

.model-link {
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
}

.model-link:hover {
  text-decoration: underline;
}

.db-check-count {
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.model-link-item {
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #dee2e6;
}

.model-link-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.identify-metadata-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
  margin-bottom: 0.5rem;
}

.identify-metadata-btn:hover:not(:disabled) {
  background: #138496;
}

.identify-metadata-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.identify-metadata-result {
  font-size: 11px;
  font-weight: 500;
  padding: 0.25rem 0;
}

.identify-metadata-result div {
  margin: 0;
  white-space: pre;
  font-family: inherit;
}

.identify-metadata-result div a {
  color: #007bff;
  text-decoration: underline;
  cursor: pointer;
}

.identify-metadata-result div a:hover {
  color: #0056b3;
}

.action-section {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 0.85rem;
}

.action-placeholder {
  color: #6c757d;
  font-weight: 500;
}

.comparison-result {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 0.85rem;
}

.comparison-header {
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
}

.comparison-both-not-found {
  color: #dc3545;
  font-weight: bold;
}

.comparison-only-civitai {
  color: #28a745;
  font-weight: bold;
}

.comparison-only-db {
  color: #28a745;
  font-weight: bold;
}

.comparison-match {
  color: #28a745;
  font-weight: bold;
}

.comparison-mismatch {
  color: #f0ad4e;
  font-weight: bold;
}

.model-info {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #666;
}

.db-models {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: #666;
}

.db-model-item {
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid #dee2e6;
}

.db-model-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.model-link-container {
  display: flex;
  align-items: center;
}

.registered-indicator {
  margin-left: 0.25rem;
  font-size: 0.8rem;
  color: #28a745;
}

.already-registered-note {
  color: #dc3545;
  font-size: 0.8rem;
  margin-left: 0.5rem;
}
</style> 