"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ToastContainer";
import axios from "axios";

interface Submission {
  id: string;
  description: string;
  githubRepo: string;
  commitHash: string;
  issueUrl: string;
  status: string;
  processingComplete: boolean;
  cloneSuccess: boolean;
  cloneError?: string;
  testPatchSuccess: boolean;
  testPatchError?: string;
  dockerBuildSuccess: boolean;
  dockerBuildError?: string;
  baseTestSuccess: boolean;
  baseTestError?: string;
  newTestSuccess: boolean;
  newTestError?: string;
  solutionPatchSuccess: boolean;
  solutionPatchError?: string;
  finalBaseTestSuccess: boolean;
  finalBaseTestError?: string;
  finalNewTestSuccess: boolean;
  finalNewTestError?: string;
  processingLogs?: string;
  createdAt: string;
}

export default function ProjectVContributor() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
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

  const fetchSubmissions = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/projectv/submissions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSubmissions(response.data || []);
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
      const token = localStorage.getItem("authToken");
      const formDataToSend = new FormData();
      formDataToSend.append("description", formData.description);
      formDataToSend.append("githubRepo", formData.githubRepo);
      formDataToSend.append("commitHash", formData.commitHash);
      formDataToSend.append("issueUrl", formData.issueUrl);
      formDataToSend.append("testPatch", files.testPatch);
      formDataToSend.append("dockerfile", files.dockerfile);
      formDataToSend.append("solutionPatch", files.solutionPatch);

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/projectv/submissions`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      showToast(
        "Submission created successfully! Processing started.",
        "success"
      );

      // Reset form
      setFormData({
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
      const errorMessage =
        error.response?.data?.error || "Failed to create submission";
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TASK_SUBMITTED":
        return "bg-blue-100 text-blue-800";
      case "ELIGIBLE_FOR_MANUAL_REVIEW":
        return "bg-yellow-100 text-yellow-800";
      case "FINAL_CHECKS":
        return "bg-purple-100 text-purple-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canSubmit = (submission: Submission) => {
    return (
      submission.processingComplete &&
      submission.cloneSuccess &&
      submission.testPatchSuccess &&
      submission.dockerBuildSuccess &&
      submission.baseTestSuccess &&
      submission.newTestSuccess &&
      submission.solutionPatchSuccess &&
      submission.finalBaseTestSuccess &&
      submission.finalNewTestSuccess
    );
  };

  if (loading || loadingSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Project V - Contributor
            </h1>
            <p className="text-gray-600 mt-1">
              Submit your Docker-based solutions
            </p>
          </div>
          <button
            onClick={() => router.push("/select-project")}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Projects
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Submission Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              New Submission
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (ASCII only)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  value={formData.githubRepo}
                  onChange={(e) =>
                    setFormData({ ...formData, githubRepo: e.target.value })
                  }
                  placeholder="https://github.com/user/repo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commit Hash
                </label>
                <input
                  type="text"
                  value={formData.commitHash}
                  onChange={(e) =>
                    setFormData({ ...formData, commitHash: e.target.value })
                  }
                  placeholder="abc123def456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue URL
                </label>
                <input
                  type="url"
                  value={formData.issueUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, issueUrl: e.target.value })
                  }
                  placeholder="https://github.com/user/repo/issues/123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Patch (.patch)
                </label>
                <input
                  type="file"
                  accept=".patch"
                  onChange={(e) =>
                    setFiles({
                      ...files,
                      testPatch: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dockerfile
                </label>
                <input
                  type="file"
                  onChange={(e) =>
                    setFiles({
                      ...files,
                      dockerfile: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Solution Patch (.patch)
                </label>
                <input
                  type="file"
                  accept=".patch"
                  onChange={(e) =>
                    setFiles({
                      ...files,
                      solutionPatch: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </div>

          {/* Submissions List */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              My Submissions
            </h2>
            <div className="space-y-3 max-h-[800px] overflow-y-auto">
              {submissions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No submissions yet
                </p>
              ) : (
                submissions.map((submission) => (
                  <div
                    key={submission.id}
                    onClick={() => setSelectedSubmission(submission)}
                    className="border border-gray-200 rounded-lg p-4 hover:border-yellow-500 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {submission.githubRepo.split("/").slice(-2).join("/")}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${getStatusColor(
                          submission.status
                        )}`}
                      >
                        {submission.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {submission.description}
                    </p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{submission.commitHash.substring(0, 7)}</span>
                      <span>
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {submission.processingComplete && (
                      <div className="mt-2">
                        {canSubmit(submission) ? (
                          <span className="text-xs text-green-600 font-semibold">
                            ✓ All tests passed
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 font-semibold">
                            ✗ Some tests failed
                          </span>
                        )}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  Submission Details
                </h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700">Repository:</h4>
                  <a
                    href={selectedSubmission.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {selectedSubmission.githubRepo}
                  </a>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700">Description:</h4>
                  <p className="text-gray-600">
                    {selectedSubmission.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-700">
                      Commit Hash:
                    </h4>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {selectedSubmission.commitHash}
                    </code>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-700">Issue:</h4>
                    <a
                      href={selectedSubmission.issueUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Issue
                    </a>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">
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
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Processing Logs:
                    </h4>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-64 overflow-y-auto">
                      {selectedSubmission.processingLogs}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusItem({
  label,
  success,
  error,
}: {
  label: string;
  success: boolean;
  error?: string;
}) {
  return (
    <div className="flex items-start justify-between p-2 bg-gray-50 rounded">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center">
        {success ? (
          <span className="text-green-600 font-semibold text-sm">✓</span>
        ) : error ? (
          <div className="flex items-center">
            <span className="text-red-600 font-semibold text-sm mr-2">✗</span>
            <span className="text-xs text-red-600" title={error}>
              {error.substring(0, 30)}...
            </span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">⏳</span>
        )}
      </div>
    </div>
  );
}
