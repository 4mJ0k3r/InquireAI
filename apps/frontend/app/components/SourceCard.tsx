import {
  DocumentTextIcon,
  CloudIcon,
  GlobeAltIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import ProgressChip from "./ProgressChip";

interface SourceCardProps {
  provider: "notion" | "gdocs" | "site-docs" | "uploads";
  status: "connected" | "disconnected" | "syncing";
  lastSynced: string | null;
  progress?: number;
  onConnect: () => void;
}

const providerConfig = {
  notion: {
    name: "Notion",
    icon: DocumentTextIcon,
    description: "Sync your Notion pages and databases",
  },
  gdocs: {
    name: "Google Docs",
    icon: CloudIcon,
    description: "Import documents from Google Drive",
  },
  "site-docs": {
    name: "Site Documentation",
    icon: GlobeAltIcon,
    description: "Crawl and index website documentation",
  },
  uploads: {
    name: "File Uploads",
    icon: FolderIcon,
    description: "Upload PDFs, docs, and other files",
  },
};

export default function SourceCard({
  provider,
  status,
  lastSynced,
  progress = 0,
  onConnect,
}: SourceCardProps) {
  const config = providerConfig[provider];
  const Icon = config.icon;

  const dotColor =
    status === "connected"
      ? "bg-emerald-500"
      : status === "syncing"
        ? "bg-amber-400"
        : "bg-gray-400";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {config.name}
            </h3>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
        </div>
        <div className={`h-3 w-3 rounded-full ${dotColor}`} />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Status:</span>
          <span
            className={`font-medium capitalize ${
              status === "connected"
                ? "text-emerald-600"
                : status === "syncing"
                  ? "text-amber-600"
                  : "text-gray-600"
            }`}
          >
            {status}
          </span>
        </div>
        {lastSynced && (
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-gray-600">Last synced:</span>
            <span className="text-gray-900">{lastSynced}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {status === "disconnected" && (
          <button
            onClick={onConnect}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            Connect
          </button>
        )}

        {status === "syncing" && <ProgressChip progress={progress} />}

        {status === "connected" && (
          <div className="text-center">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
              ✓ Connected
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
