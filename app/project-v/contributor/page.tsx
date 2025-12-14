"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ToastContainer";
import { apiClient } from "@/lib/api-client";

interface Submission {
  id: string;
  title: string;
  language: string;
  category: string;
  difficulty: string;
  description: string;
  githubRepo: string;
  commitHash: string;
  issueUrl: string;
  testPatchUrl: string;
  dockerfileUrl: string;
  solutionPatchUrl: string;
  status: string;
  reviewerFeedback?: string;
  hasChangesRequested: boolean;
  changesDone: boolean;
  accountPostedIn?: string;
  createdAt: string;
  contributor?: {
    id: string;
    name: string;
    email: string;
  };
  tester?: {
    id: string;
    name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    name: string;
    email: string;
  };
  // Processing fields
  processingLogs?: string;
  processingComplete?: boolean;
  cloneSuccess?: boolean;
  cloneError?: string;
  testPatchSuccess?: boolean;
  testPatchError?: string;
  dockerBuildSuccess?: boolean;
  dockerBuildError?: string;
  baseTestSuccess?: boolean;
  baseTestError?: string;
  newTestSuccess?: boolean;
  newTestError?: string;
  solutionPatchSuccess?: boolean;
  solutionPatchError?: string;
  finalBaseTestSuccess?: boolean;
  finalBaseTestError?: string;
  finalNewTestSuccess?: boolean;
  finalNewTestError?: string;
}

export default function ProjectVContributor() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    language: "",
    category: "",
    difficulty: "Easy",
    description: "",
    githubRepo: "",
    commitHash: "",
    issueUrl: "",
  });

  const [files, setFiles] = useState({
    testPatch: null as File | null,
    dockerfile: null as File | null,
    solutionPatch: null as File | null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      const data = await apiClient.getProjectVSubmissions();
      setSubmissions(data || []);
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      showToast("Failed to fetch submissions", "error");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "CONTRIBUTOR")) {
      router.push("/");
    } else if (user) {
      fetchSubmissions();
    }
  }, [user, loading, router, fetchSubmissions]);

  const validateDescription = (text: string): boolean => {
    // Check for non-ASCII characters
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 127) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate description
    if (!validateDescription(formData.description)) {
      showToast("Description must contain only ASCII characters", "error");
      return;
    }

    // Validate all fields are filled
    if (
      !formData.title ||
      !formData.language ||
      !formData.category ||
      !formData.difficulty ||
      !formData.description ||
      !formData.githubRepo ||
      !formData.commitHash ||
      !formData.issueUrl ||
      !files.testPatch ||
      !files.dockerfile ||
      !files.solutionPatch
    ) {
      showToast("All fields are required", "error");
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("language", formData.language);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("difficulty", formData.difficulty);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("githubRepo", formData.githubRepo);
      formDataToSend.append("commitHash", formData.commitHash);
      formDataToSend.append("issueUrl", formData.issueUrl);
      formDataToSend.append("testPatch", files.testPatch);
      formDataToSend.append("dockerfile", files.dockerfile);
      formDataToSend.append("solutionPatch", files.solutionPatch);

      await apiClient.createProjectVSubmission(formDataToSend);

      showToast("Submission created successfully!", "success");

      // Reset form
      setFormData({
        title: "",
        language: "",
        category: "",
        difficulty: "Easy",
        description: "",
        githubRepo: "",
        commitHash: "",
        issueUrl: "",
      });
      setFiles({
        testPatch: null,
        dockerfile: null,
        solutionPatch: null,
      });

      // Refresh submissions
      fetchSubmissions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to create submission";
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkChangesDone = async (submissionId: string) => {
    setProcessing(true);
    try {
      await apiClient.markChangesDone(submissionId);
      showToast("Marked as changes done successfully", "success");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to mark changes as done";
      showToast(errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) {
      return;
    }

    setProcessing(true);
    try {
      await apiClient.deleteProjectVSubmission(submissionId);
      showToast("Submission deleted successfully", "success");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to delete submission";
      showToast(errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TASK_SUBMITTED":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "IN_TESTING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "PENDING_REVIEW":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "CHANGES_REQUESTED":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "CHANGES_DONE":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "FINAL_CHECKS":
        return "bg-cyan-100 text-cyan-800 border-cyan-300";
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-300";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  if (loading || loadingSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Project V - Contributor</h1>
            <p className="text-gray-300 mt-1">Submit your task solutions</p>
          </div>
          <button
            onClick={() => router.push("/select-project")}
            className="px-4 py-2 text-gray-300 hover:text-white font-medium"
          >
            ← Back to Projects
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Submission Form */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">New Submission</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Fix authentication bug in login"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Language *
                  </label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., JavaScript, Python"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Backend, Frontend"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Difficulty *
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (ASCII only) *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe the task and solution..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  value={formData.githubRepo}
                  onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://github.com/username/repo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Commit Hash *
                </label>
                <input
                  type="text"
                  value={formData.commitHash}
                  onChange={(e) => setFormData({ ...formData, commitHash: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="e.g., abc123def456..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  GitHub Issue URL *
                </label>
                <input
                  type="url"
                  value={formData.issueUrl}
                  onChange={(e) => setFormData({ ...formData, issueUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://github.com/username/repo/issues/123"
                />
              </div>

              <div className="space-y-3">
                <FileInput
                  label="Test Patch"
                  file={files.testPatch}
                  onChange={(file) => setFiles({ ...files, testPatch: file })}
                />
                <FileInput
                  label="Dockerfile"
                  file={files.dockerfile}
                  onChange={(file) => setFiles({ ...files, dockerfile: file })}
                />
                <FileInput
                  label="Solution Patch"
                  file={files.solutionPatch}
                  onChange={(file) => setFiles({ ...files, solutionPatch: file })}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Task"}
              </button>
            </form>
          </div>

          {/* Submissions List */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">My Submissions</h2>
            <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {submissions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No submissions yet</p>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:bg-gray-650 transition-colors cursor-pointer"
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-white">{submission.title}</h3>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          submission.status
                        )}`}
                      >
                        {submission.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">
                      {submission.language} • {submission.difficulty}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </div>
                    {submission.status === "CHANGES_REQUESTED" && (
                      <div className="mt-2 text-xs text-orange-400 font-semibold">
                        ⚠️ Changes requested by reviewer
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Submission Details Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white">
                  Submission Details
                </h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Status */}
                <div>
                  <h4 className="font-semibold text-gray-300 mb-2">Status:</h4>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(
                      selectedSubmission.status
                    )}`}
                  >
                    {selectedSubmission.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Repository */}
                <div>
                  <h4 className="font-semibold text-gray-300">Repository:</h4>
                  <a
                    href={selectedSubmission.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {selectedSubmission.githubRepo}
                  </a>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-semibold text-gray-300">Description:</h4>
                  <p className="text-gray-200">
                    {selectedSubmission.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-300">
                      Commit Hash:
                    </h4>
                    <code className="text-sm bg-gray-900 text-gray-200 px-2 py-1 rounded border border-gray-600">
                      {selectedSubmission.commitHash}
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-300">Issue:</h4>
                    <a
                      href={selectedSubmission.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:underline text-sm"
                    >
                      View Issue
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">
                    Processing Status:
                  </h4>
                  <div className="space-y-2">
                    <StatusItem
                      label="1. Clone Repository"
                      success={selectedSubmission.cloneSuccess}
                      error={selectedSubmission.cloneError}
                    />
                    <StatusItem
                      label="2. Apply Test Patch"
                      success={selectedSubmission.testPatchSuccess}
                      error={selectedSubmission.testPatchError}
                    />
                    <StatusItem
                      label="3. Build Docker"
                      success={selectedSubmission.dockerBuildSuccess}
                      error={selectedSubmission.dockerBuildError}
                    />
                    <StatusItem
                      label="4. Run Base Tests"
                      success={selectedSubmission.baseTestSuccess}
                      error={selectedSubmission.baseTestError}
                    />
                    <StatusItem
                      label="5. Run New Tests (should fail)"
                      success={selectedSubmission.newTestSuccess}
                      error={selectedSubmission.newTestError}
                    />
                    <StatusItem
                      label="6. Apply Solution Patch"
                      success={selectedSubmission.solutionPatchSuccess}
                      error={selectedSubmission.solutionPatchError}
                    />
                    <StatusItem
                      label="7. Final Base Tests"
                      success={selectedSubmission.finalBaseTestSuccess}
                      error={selectedSubmission.finalBaseTestError}
                    />
                    <StatusItem
                      label="8. Final New Tests"
                      success={selectedSubmission.finalNewTestSuccess}
                      error={selectedSubmission.finalNewTestError}
                    />
                  </div>
                </div>

                {selectedSubmission.processingLogs && (
                  <div>
                    <h4 className="font-semibold text-white mb-2">
                      Processing Logs:
                    </h4>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto border border-gray-700">
                      {selectedSubmission.processingLogs}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="border-t border-gray-700 pt-4 flex gap-3">
                  {selectedSubmission.status === "CHANGES_REQUESTED" && (
                    <button
                      onClick={() => handleMarkChangesDone(selectedSubmission.id)}
                      disabled={processing}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing ? "Processing..." : "Mark Changes as Done"}
                    </button>
                  )}
                  {(selectedSubmission.status === "TASK_SUBMITTED" ||
                    selectedSubmission.status === "CHANGES_REQUESTED") && (
                    <button
                      onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                      disabled={processing}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FileInput({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label} *
      </label>
      <input
        type="file"
        onChange={(e) => {
          const selectedFile = e.target.files?.[0] || null;
          onChange(selectedFile);
        }}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
      />
      {file && (
        <p className="mt-1 text-sm text-gray-400">
          Selected: {file.name}
        </p>
      )}
    </div>
  );
}

function StatusItem({
  label,
  success,
  error,
}: {
  label: string;
  success?: boolean;
  error?: string;
}) {
  return (
    <div
      className={`flex items-start justify-between p-3 rounded-lg border ${
        success
          ? "bg-green-900 bg-opacity-30 border-green-700"
          : error
          ? "bg-red-900 bg-opacity-30 border-red-700"
          : "bg-gray-700 border-gray-600"
      }`}
    >
      <span className="text-sm text-gray-200 font-medium">{label}</span>
      <div className="flex items-center">
        {success ? (
          <span className="text-green-400 font-bold text-lg">✓</span>
        ) : error ? (
          <div className="flex flex-col items-end">
            <span className="text-red-400 font-bold text-lg">✗</span>
            {error && (
              <span className="text-xs text-red-300 mt-1 max-w-xs text-right">
                {error}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-lg">⏳</span>
        )}
      </div>
    </div>
  );
}
