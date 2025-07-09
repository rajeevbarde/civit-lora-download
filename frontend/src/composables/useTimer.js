import { ref, onUnmounted } from 'vue';

export function useTimer() {
  const timer = ref(0);
  const startTime = ref(null);
  const interval = ref(null);
  const predictedSeconds = ref(0);

  const startTimer = () => {
    timer.value = 0;
    startTime.value = performance.now();
    if (interval.value) clearInterval(interval.value);
    interval.value = setInterval(() => {
      if (startTime.value) {
        timer.value = (performance.now() - startTime.value) / 1000;
      }
    }, 10);
  };

  const stopTimer = () => {
    if (interval.value) {
      clearInterval(interval.value);
      if (startTime.value) {
        timer.value = (performance.now() - startTime.value) / 1000;
      }
      interval.value = null;
      startTime.value = null;
    }
  };

  const setPrediction = (seconds) => {
    predictedSeconds.value = seconds;
  };

  const formatPrediction = () => {
    if (predictedSeconds.value <= 0) return '';
    const minutes = Math.floor(predictedSeconds.value / 60);
    const seconds = Math.floor(predictedSeconds.value % 60);
    return ` | Predicted: ${minutes}m ${seconds}s`;
  };

  const reset = () => {
    stopTimer();
    timer.value = 0;
    predictedSeconds.value = 0;
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stopTimer();
  });

  return {
    timer,
    predictedSeconds,
    startTimer,
    stopTimer,
    setPrediction,
    formatPrediction,
    reset
  };
} 