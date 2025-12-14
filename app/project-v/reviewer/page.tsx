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
}

export default function ProjectVReviewer() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<string>("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
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
    if (!loading && (!user || (user.role !== "REVIEWER" && user.role !== "ADMIN"))) {
      router.push("/");
    } else if (user) {
      fetchSubmissions();
    }
  }, [user, loading, router, fetchSubmissions]);

  const handleRequestChanges = async () => {
    if (!selectedSubmission) return;
    if (!feedback.trim()) {
      showToast("Please provide feedback", "error");
      return;
    }

    setProcessing(true);
    try {
      await apiClient.markChangesRequested(selectedSubmission.id, feedback);
      showToast("Changes requested successfully", "success");
      setShowFeedbackDialog(false);
      setFeedback("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to request changes";
      showToast(errorMessage, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalChecks = async (submissionId: string) => {
    setProcessing(true);
    try {
      await apiClient.markFinalChecks(submissionId);
      showToast("Marked for final checks successfully", "success");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Failed to mark for final checks";
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

  const getFilteredSubmissions = () => {
    let filtered = submissions;

    // Reviewers only see tasks assigned to them or pending review
    if (user?.role === "REVIEWER") {
      filtered = submissions.filter(
        (s) =>
          s.status === "PENDING_REVIEW" ||
          s.status === "CHANGES_DONE" ||
          s.status === "FINAL_CHECKS"
      );
    }

    if (filterStatus !== "ALL") {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }

    return filtered;
  };

  const filteredSubmissions = getFilteredSubmissions();

  if (loading || loadingSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
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
            <h1 className="text-3xl font-bold text-white">
              Project V - Reviewer Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Review and provide feedback on submissions
            </p>
          </div>
          <button
            onClick={() => router.push("/select-project")}
            className="px-4 py-2 text-gray-400 hover:text-white font-medium"
          >
            ← Back to Projects
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="All"
            count={filteredSubmissions.length}
            color="purple"
            onClick={() => setFilterStatus("ALL")}
            active={filterStatus === "ALL"}
          />
          <StatCard
            label="Pending Review"
            count={submissions.filter((s) => s.status === "PENDING_REVIEW").length}
            color="purple"
            onClick={() => setFilterStatus("PENDING_REVIEW")}
            active={filterStatus === "PENDING_REVIEW"}
          />
          <StatCard
            label="Changes Done"
            count={submissions.filter((s) => s.status === "CHANGES_DONE").length}
            color="indigo"
            onClick={() => setFilterStatus("CHANGES_DONE")}
            active={filterStatus === "CHANGES_DONE"}
          />
          <StatCard
            label="Final Checks"
            count={submissions.filter((s) => s.status === "FINAL_CHECKS").length}
            color="cyan"
            onClick={() => setFilterStatus("FINAL_CHECKS")}
            active={filterStatus === "FINAL_CHECKS"}
          />
        </div>

        {/* Submissions Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Contributor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      No submissions found for review
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <tr
                      key={submission.id}
                      className="hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">
                          {submission.title}
                        </div>
                        <div className="text-xs text-gray-400">{submission.category}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{submission.language}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-300">
                          {submission.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          {submission.contributor?.name || "Unknown"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                            submission.status
                          )}`}
                        >
                          {submission.status.replace(/_/g, " ")}
                        </span>
                        {submission.changesDone && (
                          <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                            ✓ CHANGES DONE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="text-purple-400 hover:text-purple-300 font-medium text-sm"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submission Details Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedSubmission.title}</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Submitted by {selectedSubmission.contributor?.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSubmission(null);
                    setShowFeedbackDialog(false);
                    setFeedback("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Task Details */}
                <div className="bg-gray-700 border border-gray-600 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-300 text-sm mb-1">Language:</h4>
                      <p className="text-white">{selectedSubmission.language}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-300 text-sm mb-1">Category:</h4>
                      <p className="text-white">{selectedSubmission.category}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-300 text-sm mb-1">Difficulty:</h4>
                      <p className="text-white">{selectedSubmission.difficulty}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-300 text-sm mb-1">Status:</h4>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          selectedSubmission.status
                        )}`}
                      >
                        {selectedSubmission.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-300 text-sm mb-1">Description:</h4>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">
                      {selectedSubmission.description}
                    </p>
                  </div>
                </div>

                {/* Repository Info */}
                <div className="bg-gray-700 border border-gray-600 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-3">Repository Information:</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-400 text-sm">Repository: </span>
                      <a
                        href={selectedSubmission.githubRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline text-sm"
                      >
                        {selectedSubmission.githubRepo}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Commit: </span>
                      <code className="text-sm bg-gray-900 text-gray-200 px-2 py-1 rounded">
                        {selectedSubmission.commitHash}
                      </code>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Issue: </span>
                      <a
                        href={selectedSubmission.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline text-sm"
                      >
                        View Issue
                      </a>
                    </div>
                  </div>
                </div>

                {/* Files */}
                <div className="bg-gray-700 border border-gray-600 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-3">Submitted Files:</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Test Patch</span>
                      <a
                        href={selectedSubmission.testPatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline text-sm"
                      >
                        Download
                      </a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Dockerfile</span>
                      <a
                        href={selectedSubmission.dockerfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline text-sm"
                      >
                        Download
                      </a>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Solution Patch</span>
                      <a
                        href={selectedSubmission.solutionPatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline text-sm"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>

                {/* Previous Feedback */}
                {selectedSubmission.reviewerFeedback && (
                  <div className="bg-orange-900 bg-opacity-30 border border-orange-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Previous Feedback:</h4>
                    <p className="text-gray-200 whitespace-pre-wrap">{selectedSubmission.reviewerFeedback}</p>
                  </div>
                )}

                {/* Reviewer Actions */}
                {(selectedSubmission.status === "PENDING_REVIEW" ||
                  selectedSubmission.status === "CHANGES_DONE") && (
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="font-semibold text-white mb-3">Reviewer Actions:</h4>
                    {!showFeedbackDialog ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowFeedbackDialog(true)}
                          disabled={processing}
                          className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => handleFinalChecks(selectedSubmission.id)}
                          disabled={processing}
                          className="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Mark for Final Checks
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Feedback for Contributor:
                          </label>
                          <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={6}
                            placeholder="Provide detailed feedback on what needs to be changed..."
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
                            disabled={processing}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleRequestChanges}
                            disabled={processing || !feedback.trim()}
                            className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {processing ? "Submitting..." : "Submit Feedback"}
                          </button>
                          <button
                            onClick={() => {
                              setShowFeedbackDialog(false);
                              setFeedback("");
                            }}
                            disabled={processing}
                            className="px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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

function StatCard({
  label,
  count,
  color,
  onClick,
  active,
}: {
  label: string;
  count: number;
  color: string;
  onClick: () => void;
  active: boolean;
}) {
  const colorClasses = {
    purple: active
      ? "bg-purple-500 text-white border-purple-600"
      : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    indigo: active
      ? "bg-indigo-500 text-white border-indigo-600"
      : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    cyan: active
      ? "bg-cyan-500 text-white border-cyan-600"
      : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
  };

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm font-medium">{label}</div>
    </button>
  );
}
