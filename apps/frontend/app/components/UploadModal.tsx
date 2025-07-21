"use client";

import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { 
  XMarkIcon, 
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from "@heroicons/react/24/outline";
import { uploadFile } from "@/services/api";

interface UploadJob {
  name: string;
  size: string;
  status: 'uploading' | 'completed' | 'error';
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (fileCount: number) => void;
  currentFileCount: number;
}

export default function UploadModal({ 
  isOpen, 
  onClose, 
  onUploadComplete,
  currentFileCount 
}: UploadModalProps) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const jobsListRef = useRef<HTMLUListElement>(null);

  const { getRootProps, getInputProps, acceptedFiles, isDragActive } = useDropzone({
    accept: {
      'text/plain': ['.txt', '.md'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024, // 10 MB
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach((file) => {
        if (file.errors.some(error => error.code === 'file-too-large')) {
          toast.error(`File "${file.file.name}" is too large. Maximum size is 10MB.`);
        } else if (file.errors.some(error => error.code === 'file-invalid-type')) {
          toast.error(`File "${file.file.name}" is not supported. Please upload .txt, .md, .pdf, or .docx files.`);
        } else {
          toast.error(`File "${file.file.name}" was rejected.`);
        }
      });
    }
  });

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Track processed files to prevent re-processing
  const processedFilesRef = useRef<Set<string>>(new Set());

  // Handle file uploads with improved logic
  useEffect(() => {
    if (acceptedFiles.length > 0 && !isUploading) {
      // Filter out already processed files
      const newFiles = acceptedFiles.filter(file => {
        const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
        return !processedFilesRef.current.has(fileKey);
      });

      if (newFiles.length === 0) {
        return; // No new files to process
      }

      // Mark files as being processed
      newFiles.forEach(file => {
        const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
        processedFilesRef.current.add(fileKey);
      });

      const currentUploadBatch = newFiles.length;
      setIsUploading(true);
      setHasNotified(false);
      
      // Create initial jobs with uploading status
      const initialJobs = newFiles.map(file => ({
        name: file.name,
        size: formatFileSize(file.size),
        status: 'uploading' as const
      }));
      
      // Add new jobs to existing jobs instead of replacing
      setJobs(prevJobs => [...prevJobs, ...initialJobs]);
      
      // Process uploads
      const uploadPromises = newFiles.map(async (file, index) => {
        try {
          await uploadFile(file);
          
          // Update job status to completed
          setJobs(prevJobs => {
            const newJobs = [...prevJobs];
            const jobIndex = newJobs.length - currentUploadBatch + index;
            if (newJobs[jobIndex]) {
              newJobs[jobIndex] = { ...newJobs[jobIndex], status: 'completed' };
            }
            return newJobs;
          });
          
          return { success: true, fileName: file.name };
        } catch (error: any) {
          console.error("Upload error:", error);
          const errorMessage = error.response?.data?.error?.message || `Failed to upload "${file.name}"`;
          
          // Update job status to error
          setJobs(prevJobs => {
            const newJobs = [...prevJobs];
            const jobIndex = newJobs.length - currentUploadBatch + index;
            if (newJobs[jobIndex]) {
              newJobs[jobIndex] = { ...newJobs[jobIndex], status: 'error' };
            }
            return newJobs;
          });
          
          toast.error(errorMessage);
          return { success: false, fileName: file.name };
        }
      });
      
      // Wait for all uploads to complete
      Promise.all(uploadPromises).then(results => {
        setIsUploading(false); // Reset uploading state to allow new uploads
        
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        
        if (successCount > 0) {
          toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}!`);
          onUploadComplete(successCount);
        }
        
        if (errorCount > 0) {
          toast.error(`${errorCount} file${errorCount > 1 ? 's' : ''} failed to upload.`);
        }
        
        setHasNotified(true);
      });
      
      // Scroll to newest job after state update
      setTimeout(() => {
        if (jobsListRef.current) {
          jobsListRef.current.scrollTop = jobsListRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [acceptedFiles, onUploadComplete]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setJobs([]);
      setIsUploading(false);
      setHasNotified(false);
      processedFilesRef.current.clear(); // Clear processed files tracking
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const completedJobsCount = jobs.filter(job => job.status === 'completed').length;
  const errorJobsCount = jobs.filter(job => job.status === 'error').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6"
          style={{
            background: 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/60 rounded-lg">
              <CloudArrowUpIcon className="h-6 w-6 text-gray-700" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Manual Uploads</h2>
              <p className="text-white/80 text-sm">Files: {currentFileCount + completedJobsCount}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={`flex h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : isUploading
                ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            <input {...getInputProps()} />
            <CloudArrowUpIcon className={`h-8 w-8 ${
              isDragActive ? "text-blue-500" : isUploading ? "text-gray-400" : "text-gray-500"
            }`} />
            <p className={`mt-2 text-sm font-medium ${
              isDragActive ? "text-blue-600" : isUploading ? "text-gray-400" : "text-gray-600"
            }`}>
              {isDragActive 
                ? "Drop files here..." 
                : isUploading 
                ? "Upload in progress..." 
                : "Drag & drop files, or click to browse"
              }
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Supports PDF, DOCX, Markdown, TXT • Max 10MB per file
            </p>
          </div>

          {/* File Size Limits */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <DocumentIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Supported File Types</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              PDF, DOCX, Markdown (.md), Text (.txt) • Maximum 10MB per file
            </p>
          </div>

          {/* Upload Progress List */}
          {jobs.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Upload Progress ({completedJobsCount + errorJobsCount}/{jobs.length})
                </h3>
              </div>
              
              <ul 
                ref={jobsListRef}
                className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                {jobs.map(({ name, size, status }, index) => (
                  <li
                    key={`${name}-${index}`}
                    className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {status === 'completed' ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : status === 'error' ? (
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                        ) : (
                          <DocumentIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-gray-900">{name}</p>
                        <p className="text-sm text-gray-500">{size}</p>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {status === 'uploading' && (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-600">Loading...</span>
                        </div>
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

          {/* Help Guide */}
          <div className="mt-6">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="font-medium text-gray-900">How to upload your documents</span>
              {showHelp ? (
                <ChevronUpIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              )}
            </button>
            
            {showHelp && (
              <div className="mt-3 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">1. Select Your Files</h4>
                    <p>Drag and drop files into the upload area above, or click to browse your computer.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">2. Supported Formats</h4>
                    <p>Upload PDF documents, Word files (.docx), Markdown files (.md), or plain text files (.txt).</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">3. File Processing</h4>
                    <p>Files are automatically processed and indexed for AI search. You can upload multiple files at once.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">4. Start Chatting</h4>
                    <p>Once uploaded, you can ask questions about your documents in the chat interface.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}