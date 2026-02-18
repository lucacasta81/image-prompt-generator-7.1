// Fix: Augmentations for the global scope can only be directly nested in external modules or ambient module declarations.
// Adding `export {}` makes this file an external module, allowing `declare global` to be used.
export {};

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}