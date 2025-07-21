interface ProgressChipProps {
  progress: number;
}

export default function ProgressChip({ progress }: ProgressChipProps) {
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-gray-600">Syncing...</span>
        <span className="font-medium text-gray-900">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
