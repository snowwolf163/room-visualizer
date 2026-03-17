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
        <div className="text-green-700 font-medium">No error detected!</div>
      ) : (
        <>
          {errors.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-red-600">Errors</h2>
              <ul className="list-disc pl-6 space-y-1 text-red-600">
                {errors.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {infos.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Notices</h2>
              <ul className="list-disc pl-6 space-y-1 text-gray-800">
                {infos.map((msg, idx) => (
                  <li key={idx}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {detectedHeaders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Detected Headers</h2>
          <div className="rounded-md border p-3 text-sm bg-muted/30">
            {detectedHeaders.join(", ")}
          </div>
        </div>
      )}
    </div>
  );
}