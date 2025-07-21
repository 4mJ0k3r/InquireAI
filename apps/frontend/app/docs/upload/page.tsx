"use client";

import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { CloudArrowUpIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import PrivateRoute from "../../components/PrivateRoute";
import Layout from "../../components/Layout";
import { uploadFile } from "../../services/api";

interface UploadJob {
  name: string;
  size: string;
  status: 'uploading' | 'completed' | 'error';
}

export default function UploadPage() {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const jobsListRef = useRef<HTMLUListElement>(null);

  const { acceptedFiles, fileRejections, getRootProps, getInputProps } = useDropzone({
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach((file) => {
        if (file.errors.some(e => e.code === 'file-too-large')) {
          toast.error(`File "${file.file.name}" is too large. Maximum size is 20MB.`);
        } else if (file.errors.some(e => e.code === 'file-invalid-type')) {
          toast.error(`File "${file.file.name}" is not supported. Please upload .txt, .md, .pdf, or .docx files.`);
        } else {
          toast.error(`File "${file.file.name}" was rejected.`);
        }
      });
    },
    disabled: isUploading
  });

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file uploads with simplified logic
  useEffect(() => {
    if (acceptedFiles.length > 0) {
      setIsUploading(true);
      
      // Create initial jobs with uploading status
      const initialJobs = acceptedFiles.map(file => ({
        name: file.name,
        size: formatFileSize(file.size),
        status: 'uploading' as const
      }));
      
      setJobs(initialJobs);
      
      // Process uploads
      const uploadPromises = acceptedFiles.map(async (file, index) => {
        try {
          await uploadFile(file);
          
          // Update job status to completed
          setJobs(prevJobs => 
            prevJobs.map((job, jobIndex) => 
              jobIndex === index ? { ...job, status: 'completed' } : job
            )
          );
          
          return { success: true, fileName: file.name };
        } catch (error: any) {
          console.error("Upload error:", error);
          const errorMessage = error.response?.data?.error?.message || `Failed to upload "${file.name}"`;
          
          // Update job status to error
          setJobs(prevJobs => 
            prevJobs.map((job, jobIndex) => 
              jobIndex === index ? { ...job, status: 'error' } : job
            )
          );
          
          toast.error(errorMessage);
          return { success: false, fileName: file.name };
        }
      });
      
      // Wait for all uploads to complete
      Promise.all(uploadPromises).then(results => {
        setIsUploading(false);
        
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        
        if (successCount > 0) {
          toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}!`);
        }
        
        if (errorCount > 0) {
          toast.error(`${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload.`);
        }
      });
      
      // Scroll to newest job after state update
      setTimeout(() => {
        if (jobsListRef.current) {
          jobsListRef.current.scrollTop = jobsListRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [acceptedFiles]);

  const completedJobsCount = jobs.filter(job => job.status === 'completed').length;
  const errorJobsCount = jobs.filter(job => job.status === 'error').length;

  return (
    <PrivateRoute>
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="mb-6 text-2xl font-bold">Upload documents</h1>
            <p className="text-gray-600">
              Upload your documents to add them to your knowledge base. Supported formats: .txt, .md, .pdf, .docx (max 20MB each)
            </p>
          </div>

          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`flex h-52 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
              isUploading
                ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                : "border-gray-300 bg-brand-bg/50 hover:border-brand-primary hover:bg-brand-bg/70"
            }`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className={`h-10 w-10 ${isUploading ? "text-gray-400" : "text-brand-primary"}`} />
            <p className={`mt-2 text-sm ${isUploading ? "text-gray-400" : "text-gray-600"}`}>
              {isUploading 
                ? "Upload in progress..." 
                : "Drag & drop files, or click to browse"
              }
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Supports .txt, .md, .pdf, .docx files up to 20MB
            </p>
          </div>

          {/* Upload Progress List */}
          {jobs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Upload Progress ({completedJobsCount + errorJobsCount}/{jobs.length} completed)
              </h2>
              <ul 
                ref={jobsListRef}
                className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4"
              >
                {jobs.map(({ name, size, status }, index) => (
                  <li
                    key={`${name}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-4 shadow-sm"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {status === 'completed' ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : status === 'error' ? (
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        ) : (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-gray-900">{name}</p>
                        <p className="text-sm text-gray-500">{size}</p>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {status === 'uploading' && (
                        <span className="text-sm text-gray-600">Loading...</span>
                      )}
                      {status === 'completed' && (
                        <span className="text-sm font-medium text-green-600">Success!</span>
                      )}
                      {status === 'error' && (
                        <span className="text-sm font-medium text-red-600">Failed</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {jobs.length === 0 && (
            <div className="rounded-lg bg-blue-50 p-4">
              <h3 className="text-sm font-medium text-blue-900">Getting Started</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Drag and drop files onto the upload area above</li>
                  <li>You can upload multiple files at once</li>
                  <li>Watch the live progress as your files are processed</li>
                  <li>Once uploaded, you can ask questions about your documents in the chat</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </PrivateRoute>
  );
}