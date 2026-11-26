
import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import { Modal } from './Modal';
import { Button } from './Button';
import {
  detectEvidenceModality,
  formatFileSize,
} from '../utils/formatters';
import { useNotification } from './NotificationContext';
import { cerberusApi } from '../services/api';

interface UploadEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedFileEntry {
  id: string;
  file: File;
  name: string;
  sizeLabel: string;
  modality: string;
  extension: string;
  valid: boolean;
}

export function UploadEvidenceModal({
  isOpen,
  onClose,
}: UploadEvidenceModalProps) {
  const { notify } = useNotification();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<SelectedFileEntry[]>([]);
  const [authorProvenance, setAuthorProvenance] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0 || isUploading) return;

    setUploadFeedback(null);

    const nextEntries: SelectedFileEntry[] = Array.from(incoming).map(
      (file) => {
        const detected = detectEvidenceModality(file.name);

        return {
          id: `${file.name}-${file.size}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
          file,
          name: file.name,
          sizeLabel: formatFileSize(file.size),
          modality: detected.modality,
          extension: detected.extension,
          valid: detected.valid,
        };
      }
    );

    const invalidCount = nextEntries.filter(
      (file) => !file.valid
    ).length;

    if (invalidCount > 0) {
      setUploadFeedback({
        type: 'error',
        message: `${invalidCount} unsupported file(s). Supported formats: PDF, XLSX, PNG, JPG, JPEG.`,
      });
    }

    setFiles((previous) => [...previous, ...nextEntries]);
  };

  const removeFile = (id: string) => {
    if (isUploading) return;

    setFiles((previous) =>
      previous.filter((item) => item.id !== id)
    );

    setUploadFeedback(null);
  };

  const handleUpload = async () => {
    if (isUploading) return;

    if (files.length === 0) {
      setUploadFeedback({
        type: 'error',
        message: 'Please select at least one evidence file.',
      });
      return;
    }

    const validFiles = files.filter((file) => file.valid);

    if (validFiles.length === 0) {
      setUploadFeedback({
        type: 'error',
        message: 'Please select a supported PDF, XLSX, PNG, JPG, or JPEG file.',
      });
      return;
    }

    setIsUploading(true);
    setUploadFeedback(null);

    let uploadedCount = 0;

    try {
      // FastAPI accepts one file per request.
      // Upload files sequentially.
      for (const item of validFiles) {
        await cerberusApi.ingestEvidence(
          item.file,
          authorProvenance.trim()
        );

        uploadedCount += 1;

        // Remove successfully uploaded files from the queue.
        setFiles((previous) =>
          previous.filter((file) => file.id !== item.id)
        );
      }

      const successMessage =
        `${uploadedCount} evidence file(s) uploaded successfully.`;

      setUploadFeedback({
        type: 'success',
        message: successMessage,
      });

      notify({
        title: 'Evidence Uploaded',
        message: successMessage,
        tone: 'success',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'An unexpected upload error occurred.';

      setUploadFeedback({
        type: 'error',
        message:
          `${uploadedCount} file(s) uploaded. ` +
          `The next upload failed: ${errorMessage}`,
      });

      notify({
        title: 'Upload Incomplete',
        message: errorMessage,
        tone: 'warning',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;

    setIsDragging(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Evidence"
      subtitle="Supported formats: PDF, XLSX, PNG, JPG, JPEG · Live FastAPI upload"
      maxWidthClass="max-w-xl"
    >
      <div className="space-y-5">

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!isUploading) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors duration-150 ${
            isDragging
              ? 'border-[#A6FF78] bg-[#A6FF78]/5'
              : 'border-[#2E3E35] bg-[#0D110F] hover:border-[#3E5548]'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#222E27] bg-[#121916] text-[#A6FF78]">
            <UploadCloud className="h-6 w-6" aria-hidden="true" />
          </div>

          <p className="mt-4 text-sm font-medium text-[#F5F7F5]">
            Drag and drop evidence files here
          </p>

          <p className="mt-1 text-xs text-[#9AA69E]">
            Accepts PDF, XLSX, PNG, JPG, and JPEG documents
          </p>

          <input
            ref={inputRef}
            type="file"
            multiple
            disabled={isUploading}
            accept=".pdf,.xlsx,.png,.jpg,.jpeg"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = '';
            }}
            className="sr-only"
          />

          <Button
            variant="secondary"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="mt-4"
          >
            Browse Files
          </Button>
        </div>

        {/* Author Provenance */}
        <div className="space-y-2">
          <label
            htmlFor="author-provenance"
            className="text-xs font-medium text-[#9AA69E]"
          >
            Author / Evidence Provenance (Optional)
          </label>

          <input
            id="author-provenance"
            type="text"
            value={authorProvenance}
            disabled={isUploading}
            onChange={(event) =>
              setAuthorProvenance(event.target.value)
            }
            placeholder="Enter source, author, or evidence origin"
            className="w-full rounded-lg border border-[#2E3E35] bg-[#0D110F] px-3 py-2.5 text-sm text-[#F5F7F5] outline-none placeholder:text-[#66736B] focus:border-[#A6FF78]"
          />
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#9AA69E]">
                Selected Files ({files.length})
              </p>

              <button
                type="button"
                disabled={isUploading}
                onClick={() => {
                  setFiles([]);
                  setUploadFeedback(null);
                }}
                className="text-xs text-[#9AA69E] hover:text-[#F5F7F5] disabled:opacity-40"
              >
                Clear all
              </button>
            </div>

            <ul className="divide-y divide-[#222E27] rounded-xl border border-[#222E27] bg-[#0D110F]">
              {files.map((item) => {
                const Icon =
                  item.extension === 'PDF'
                    ? FileText
                    : item.extension === 'XLSX'
                    ? FileSpreadsheet
                    : ImageIcon;

                return (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          item.valid
                            ? 'text-[#A6FF78]'
                            : 'text-rose-400'
                        }`}
                        aria-hidden="true"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#F5F7F5]">
                          {item.name}
                        </p>

                        <p className="mt-0.5 text-xs text-[#9AA69E]">
                          {item.modality} · {item.extension} · {item.sizeLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {item.valid ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[#34D399]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Invalid
                        </span>
                      )}

                      <button
                        type="button"
                        disabled={isUploading}
                        onClick={() => removeFile(item.id)}
                        aria-label={`Remove ${item.name}`}
                        className="rounded-md p-1 text-[#9AA69E] hover:bg-[#18211C] hover:text-rose-400 disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Upload Feedback */}
        {uploadFeedback && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-xl border p-4 text-xs leading-relaxed ${
              uploadFeedback.type === 'error'
                ? 'border-rose-500/30 bg-rose-950/20 text-rose-200'
                : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
            }`}
          >
            {uploadFeedback.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            )}

            <div>
              <p className="font-semibold">
                {uploadFeedback.type === 'success'
                  ? 'Upload Successful'
                  : 'Upload Notice'}
              </p>

              <p className="mt-0.5 opacity-90">
                {uploadFeedback.message}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#222E27] pt-4">
          <p className="text-xs text-[#7D8A82]">
            Target: <span className="font-mono">POST /ingest</span>
            <span className="text-emerald-400"> · Connected</span>
          </p>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={handleClose}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={isUploading || files.length === 0}
              onClick={handleUpload}
            >
              {isUploading ? 'Uploading...' : 'Upload Evidence'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
