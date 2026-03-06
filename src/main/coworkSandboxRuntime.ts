// type SandboxCheckResult = { ok: true; runtimeInfo: SandboxRuntimeInfo } | { ok: false; error: string };

// export function ensureSandboxReady(): Promise<SandboxCheckResult> {
//   if (_ensureSandboxReadyPromise) {
//     return _ensureSandboxReadyPromise;
//   }
//   _ensureSandboxReadyPromise = _ensureSandboxReadyImpl();
//   _ensureSandboxReadyPromise.finally(() => {
//     _ensureSandboxReadyPromise = null;
//   });
//   return _ensureSandboxReadyPromise;
// }
