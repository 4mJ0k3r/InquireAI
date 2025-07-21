"use client";

import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/Layout";

export default function Analytics() {
  return (
    <PrivateRoute>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600">
              View insights and analytics about your chatbot usage.
            </p>
          </div>

          <div className="rounded-lg bg-white p-8 text-center shadow">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Usage Analytics
            </h2>
            <p className="mb-4 text-gray-600">
              Track performance and user interactions.
            </p>
            <div className="mb-4 text-4xl">📊</div>
            <p className="text-sm text-gray-500">Coming soon...</p>
          </div>
        </div>
      </Layout>
    </PrivateRoute>
  );
}
