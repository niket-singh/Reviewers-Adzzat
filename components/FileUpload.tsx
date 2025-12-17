'use client'

import { useState, useRef, DragEvent } from 'react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSize?: number 
  label?: string
  uploadProgress?: number 
  isUploading?: boolean
}

export default function FileUpload({
  onFileSelect,
  accept = '*',
  maxSize = 10 * 1024 * 1024, 
  label = 'Upload File',
  uploadProgress,
  isUploading = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`
    }

    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map((t) => t.trim())
      const fileType = file.type
      const fileExt = '.' + file.name.split('.').pop()

      const isAccepted = acceptedTypes.some(
        (type) =>
          type === fileType ||
          type === fileExt ||
          (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '')))
      )

      if (!isAccepted) {
        return `File type not accepted. Accepted types: ${accept}`
      }
    }

    return null
  }

  const handleFile = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setSelectedFile(file)
    onFileSelect(file)
  }

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-bold mb-2.5 text-gray-200">{label}</label>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10 scale-[1.02]'
            : 'border-gray-600 bg-gray-800/40 hover:border-purple-500/50 hover:bg-gray-800/60'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-4">

          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isDragging
                ? 'bg-purple-500/20 scale-110'
                : 'bg-gray-700/50'
            }`}
          >
            {isUploading ? (
              <svg
                className="w-8 h-8 text-purple-400 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className={`w-8 h-8 transition-colors ${
                  isDragging ? 'text-purple-400' : 'text-gray-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            )}
          </div>

          <div>
            {selectedFile && !isUploading ? (
              <div className="space-y-1">
                <p className="text-white font-semibold">{selectedFile.name}</p>
                <p className="text-gray-400 text-sm">{formatFileSize(selectedFile.size)}</p>
              </div>
            ) : (
              <>
                <p className="text-white font-semibold mb-1">
                  {isUploading ? 'Uploading...' : 'Drag & drop file here or click to browse'}
                </p>
                <p className="text-gray-400 text-sm">
                  Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB
                  {accept !== '*' && ` • Accepted: ${accept}`}
                </p>
              </>
            )}
          </div>
        </div>

        {isUploading && uploadProgress !== undefined && (
          <div className="mt-4">
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-purple-400 text-sm mt-2 font-semibold">{uploadProgress}%</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/50 rounded-xl">
          <p className="text-red-400 text-sm font-medium flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </p>
        </div>
      )}
    </div>
  )
}
