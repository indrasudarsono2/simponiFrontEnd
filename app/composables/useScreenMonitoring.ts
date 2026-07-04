export function useScreenMonitoring() {
  const runtimeConfig = useRuntimeConfig();
  const screenMonitoringEnabled =
    String(runtimeConfig.public.screenMonitoringEnabled).toLowerCase() !==
    "false";
  const screenStream = shallowRef<MediaStream | null>(null);
  const isScreenInitializing = ref(false);
  const isScreenReady = ref(false);
  const screenError = ref<string | null>(null);
  const screenSupportError = ref<string | null>(null);
  let screenVideoElement: HTMLVideoElement | null = null;

  function checkScreenMonitoringSupport(): boolean {
    if (!import.meta.client) return false;

    if (!window.isSecureContext) {
      screenSupportError.value =
        "Screen monitoring requires HTTPS or localhost. Please use a secure connection.";
      return false;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !navigator.mediaDevices?.getDisplayMedia ||
      typeof HTMLCanvasElement === "undefined" ||
      typeof HTMLCanvasElement.prototype.toBlob !== "function"
    ) {
      screenSupportError.value =
        "Your browser version does not support examination monitoring. Please update Chrome, Edge, Firefox, or Safari to the latest version.";
      return false;
    }

    screenSupportError.value = null;
    return true;
  }

  function stopScreenCapture() {
    if (screenStream.value) {
      screenStream.value.getTracks().forEach((track) => track.stop());
      screenStream.value = null;
    }
    if (screenVideoElement) {
      screenVideoElement.srcObject = null;
      screenVideoElement = null;
    }
    isScreenReady.value = false;
  }

  async function startScreenCapture(): Promise<boolean> {
    if (!import.meta.client) return false;
    if (!checkScreenMonitoringSupport()) {
      screenError.value = screenSupportError.value;
      return false;
    }

    isScreenInitializing.value = true;
    screenError.value = null;
    stopScreenCapture();

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: false,
      });
      const videoTrack = stream.getVideoTracks()[0];
      const displaySurface = videoTrack?.getSettings().displaySurface;

      if (!displaySurface) {
        stream.getTracks().forEach((track) => track.stop());
        screenSupportError.value =
          "Your browser cannot verify Entire Screen sharing. Please update your browser or use the latest Chrome or Edge.";
        screenError.value = screenSupportError.value;
        return false;
      }

      if (displaySurface !== "monitor") {
        stream.getTracks().forEach((track) => track.stop());
        screenError.value =
          "Entire Screen is required. Please try again and select Entire Screen.";
        return false;
      }

      screenStream.value = stream;
      screenVideoElement = document.createElement("video");
      screenVideoElement.muted = true;
      screenVideoElement.playsInline = true;
      screenVideoElement.srcObject = stream;
      await screenVideoElement.play();
      isScreenReady.value = true;

      if (videoTrack) {
        videoTrack.onended = () => {
          isScreenReady.value = false;
          screenError.value =
            "Screen sharing was stopped. Share Entire Screen again to continue.";
        };
      }

      return true;
    } catch (error: unknown) {
      stopScreenCapture();
      const name = String((error as { name?: unknown })?.name || "").toLowerCase();
      screenError.value = name.includes("notallowed")
        ? "Screen sharing permission is required to continue examination."
        : "Unable to start screen sharing. Please try again and select Entire Screen.";
      return false;
    } finally {
      isScreenInitializing.value = false;
    }
  }

  function captureScreenSnapshotBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = screenVideoElement;
      if (!video || !screenStream.value || !isScreenReady.value) {
        resolve(null);
        return;
      }

      const sourceWidth = video.videoWidth || 1920;
      const sourceHeight = video.videoHeight || 1080;
      const maxWidth = 1920;
      const scale = sourceWidth > maxWidth ? maxWidth / sourceWidth : 1;
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(null);
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
    });
  }

  return {
    screenMonitoringEnabled,
    screenSupportError,
    isScreenInitializing,
    isScreenReady,
    screenError,
    checkScreenMonitoringSupport,
    startScreenCapture,
    stopScreenCapture,
    captureScreenSnapshotBlob,
  };
}
