import type { DeviceCapabilities } from '../types/festival';

let cachedCapabilities: DeviceCapabilities | null = null;

export function detectDeviceCapabilities(): DeviceCapabilities {
  if (cachedCapabilities) return cachedCapabilities;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      webglSupported: false,
      isSoftwareGl: true,
      isLowPower: true,
      particleCount: 300,
      dpr: 1,
    };
  }

  let webglSupported = false;
  let isSoftwareGl = false;

  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      (probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);

    if (gl) {
      webglSupported = true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const rendererStr = String(gl.getParameter(param) || '');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
        rendererStr
      );
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    webglSupported = false;
  }

  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const isSmallViewport = window.innerWidth < 768;
  const isLowPower = isSoftwareGl || cores <= 4 || isSmallViewport;

  const particleCount = isSoftwareGl ? 320 : isLowPower ? 550 : 1200;
  const dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, isLowPower ? 1.5 : 2);

  cachedCapabilities = {
    webglSupported,
    isSoftwareGl,
    isLowPower,
    particleCount,
    dpr,
  };

  return cachedCapabilities;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
