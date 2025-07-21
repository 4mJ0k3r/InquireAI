"use client";

import Link from "next/link";
import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/Layout";
import { CloudArrowUpIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

export default function Documents() {
  return (
    <PrivateRoute>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600">
              Manage your uploaded documents and knowledge base.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/docs/upload"
              className="group rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-brand-primary/10 p-3">
                  <CloudArrowUpIcon className="h-6 w-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-brand-primary">
                    Upload Documents
                  </h3>
                  <p className="text-sm text-gray-600">
                    Drag and drop files to upload with live progress tracking
                  </p>
                </div>
              </div>
            </Link>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-gray-100 p-3">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Manage Documents
                  </h3>
                  <p className="text-sm text-gray-600">
                    View, organize, and delete your uploaded documents
                  </p>
                  <p className="mt-2 text-xs text-gray-500">Coming soon...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </PrivateRoute>
  );
}
