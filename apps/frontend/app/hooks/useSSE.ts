import { useState, useEffect } from "react";
import { useAuth } from "@/store/useAuth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useJobStream(jobId?: string) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('pending');

  useEffect(() => {
    if (!jobId) return;

    const token = useAuth.getState().token;
    const url = `${API_BASE}/docs/jobs/${jobId}/stream${token ? `?token=${token}` : ''}`;
    
    const es = new EventSource(url, {
      withCredentials: true,
    });

    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        setProgress(data.progress || 0);
        setStatus(data.status || 'pending');
      } catch (error) {
        console.error("Error parsing SSE data:", error);
      }
    };

    es.onerror = () => {
      console.log("SSE connection error, closing...");
      es.close();
    };

    return () => es.close();
  }, [jobId]);

  return { progress, status };
}
