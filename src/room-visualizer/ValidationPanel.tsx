type ValidationPanelProps = {
  errors: string[];
  infos: string[];
  detectedHeaders: string[];
};

export default function ValidationPanel({
  errors,
  infos,
  detectedHeaders,
}: ValidationPanelProps) {
  return (
    <div className="space-y-4">
      {errors.length === 0 && infos.length === 0 ? (
        <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-700 dark:text-green-300">
          No error detected!
        </div>
      ) : (
        <>
          {errors.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                Errors
              </h2>
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3">
                <ul className="list-disc pl-6 space-y-1 text-sm text-red-700 dark:text-red-300">
                  {errors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {infos.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                Notices
              </h2>
              <div className="rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-3">
                <ul className="list-disc pl-6 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  {infos.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}

      {detectedHeaders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Detected Headers</h2>
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-foreground">
            {detectedHeaders.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}