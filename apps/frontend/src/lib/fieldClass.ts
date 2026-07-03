// Shared class for native <select>/<textarea> so they match the Input component
// (which owns this styling for <input>). Keeps the three create forms in sync.
export const fieldClass =
  'flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-600 ' +
  'focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors'
