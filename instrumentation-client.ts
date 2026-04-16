// instrumentation-client.ts
const _originalConsoleError = console.error.bind(console);

console.error = (...args: unknown[]) => {
  const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");

  if (
    msg.includes("permission-denied") &&
    msg.includes("snapshot listener")
  ) {
    return; // silently swallow — cosmetic Firebase sign-out noise
  }

  _originalConsoleError(...args);
};