"use client";

import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/Layout";
import ChatPage from "./ChatPage";

export default function Chat() {
  return (
    <PrivateRoute>
      <Layout>
        <ChatPage />
      </Layout>
    </PrivateRoute>
  );
}
