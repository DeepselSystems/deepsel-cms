/**
 * Stub component for parallel edit warning.
 * Shows a warning when another user is editing the same resource.
 */
export default function ParallelEditWarning({ warning, onDismiss }) {
  if (!warning) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center justify-between">
      <p className="text-sm text-yellow-800">{warning}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium ml-4"
        >
          ✕
        </button>
      )}
    </div>
  );
}
