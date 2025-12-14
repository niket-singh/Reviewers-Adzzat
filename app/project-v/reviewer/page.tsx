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
  accountPostedIn?: string;
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
  contributor?: {
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
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [accountPostedIn, setAccountPostedIn] = useState<string>("");

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
    if (!loading && (!user || (user.role !== "REVIEWER" && user.role !== "ADMIN"))) {
      router.push("/");
    } else if (user) {
      fetchSubmissions();
    }
  }, [user, loading, router, fetchSubmissions]);

  const updateStatus = async (submissionId: string, newStatus: string, includeAccount: boolean = false) => {
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("authToken");
      const payload: any = { status: newStatus };

      // Only include accountPostedIn if explicitly requested
      if (includeAccount && accountPostedIn.trim()) {
        payload.accountPostedIn = accountPostedIn.trim();
      }

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/projectv/submissions/${submissionId}/status`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      showToast("Status updated successfully", "success");
      fetchSubmissions();
      setSelectedSubmission(null);
      setAccountPostedIn(""); // Reset the account input
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "Failed to update status";
      showToast(errorMessage, "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TASK_SUBMITTED":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "ELIGIBLE_FOR_MANUAL_REVIEW":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "FINAL_CHECKS":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-300";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
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

  const filteredSubmissions = submissions.filter((submission) => {
    if (filterStatus === "ALL") return true;
    return submission.status === filterStatus;
  });

  if (loading || loadingSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
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
              Project V - Tester Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Review and manage submissions
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="All"
            count={submissions.length}
            color="blue"
            onClick={() => setFilterStatus("ALL")}
            active={filterStatus === "ALL"}
          />
          <StatCard
            label="Submitted"
            count={
              submissions.filter((s) => s.status === "TASK_SUBMITTED").length
            }
            color="blue"
            onClick={() => setFilterStatus("TASK_SUBMITTED")}
            active={filterStatus === "TASK_SUBMITTED"}
          />
          <StatCard
            label="Review"
            count={
              submissions.filter(
                (s) => s.status === "ELIGIBLE_FOR_MANUAL_REVIEW"
              ).length
            }
            color="yellow"
            onClick={() => setFilterStatus("ELIGIBLE_FOR_MANUAL_REVIEW")}
            active={filterStatus === "ELIGIBLE_FOR_MANUAL_REVIEW"}
          />
          <StatCard
            label="Final"
            count={
              submissions.filter((s) => s.status === "FINAL_CHECKS").length
            }
            color="purple"
            onClick={() => setFilterStatus("FINAL_CHECKS")}
            active={filterStatus === "FINAL_CHECKS"}
          />
          <StatCard
            label="Approved"
            count={
              submissions.filter((s) => s.status === "APPROVED").length
            }
            color="green"
            onClick={() => setFilterStatus("APPROVED")}
            active={filterStatus === "APPROVED"}
          />
        </div>

        {/* Submissions Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Repository
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Contributor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tests
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
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      No submissions found
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
                          {submission.githubRepo.split("/").slice(-2).join("/")}
                        </div>
                        <div className="text-xs text-gray-400">
                          {submission.commitHash.substring(0, 7)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          {submission.contributor?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {submission.contributor?.email}
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
                      </td>
                      <td className="px-6 py-4">
                        {submission.processingComplete ? (
                          canSubmit(submission) ? (
                            <span className="text-sm text-green-600 font-semibold">
                              ✓ Passed
                            </span>
                          ) : (
                            <span className="text-sm text-red-600 font-semibold">
                              ✗ Failed
                            </span>
                          )
                        ) : (
                          <span className="text-sm text-gray-400">
                            Processing...
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          className="text-yellow-400 hover:text-yellow-300 font-medium text-sm"
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
            <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    Submission Review
                  </h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Submitted by {selectedSubmission.contributor?.name}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:text-white"
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

              <div className="space-y-6">
                {/* Repository Info */}
                <div className="bg-gray-700 border border-gray-600 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-300 text-sm mb-1">
                        Repository:
                      </h4>
                      <a
                        href={selectedSubmission.githubRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:underline text-sm"
                      >
                        {selectedSubmission.githubRepo}
                      </a>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-300 text-sm mb-1">
                        Commit:
                      </h4>
                      <code className="text-sm bg-gray-900 text-gray-200 px-2 py-1 rounded border border-gray-600">
                        {selectedSubmission.commitHash}
                      </code>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-300 text-sm mb-1">
                        Issue:
                      </h4>
                      <a
                        href={selectedSubmission.issueUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:underline text-sm"
                      >
                        View Issue
                      </a>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-300 text-sm mb-1">
                        Status:
                      </h4>
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
                    <h4 className="font-semibold text-gray-300 text-sm mb-1">
                      Description:
                    </h4>
                    <p className="text-sm text-gray-200">
                      {selectedSubmission.description}
                    </p>
                  </div>
                </div>

                {/* Processing Status */}
                <div>
                  <h4 className="font-semibold text-white mb-3">
                    Validation Pipeline:
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
                      label="4. Run Base Tests (should pass)"
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
                      label="7. Rebuild & Run Base Tests"
                      success={selectedSubmission.finalBaseTestSuccess}
                      error={selectedSubmission.finalBaseTestError}
                    />
                    <StatusItem
                      label="8. Run New Tests (should pass)"
                      success={selectedSubmission.finalNewTestSuccess}
                      error={selectedSubmission.finalNewTestError}
                    />
                  </div>
                </div>

                {/* Processing Logs */}
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

                {/* Account Posted In */}
                {selectedSubmission.accountPostedIn && (
                  <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">
                      Account Posted In:
                    </h4>
                    <p className="text-gray-200">{selectedSubmission.accountPostedIn}</p>
                  </div>
                )}

                {/* Status Update Buttons */}
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="font-semibold text-white mb-3">
                    Update Status:
                  </h4>

                  {/* Account Input for Task Submitted */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Posted In (for Task Submitted status):
                    </label>
                    <input
                      type="text"
                      value={accountPostedIn}
                      onChange={(e) => setAccountPostedIn(e.target.value)}
                      placeholder="Enter account name..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent placeholder-gray-400"
                      disabled={updatingStatus}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      This will be saved when you click &ldquo;Task Submitted&rdquo; button
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusButton
                      label="Task Submitted"
                      status="TASK_SUBMITTED"
                      color="blue"
                      currentStatus={selectedSubmission.status}
                      onClick={() =>
                        updateStatus(selectedSubmission.id, "TASK_SUBMITTED", true)
                      }
                      disabled={updatingStatus}
                    />
                    <StatusButton
                      label="Eligible for Manual Review"
                      status="ELIGIBLE_FOR_MANUAL_REVIEW"
                      color="yellow"
                      currentStatus={selectedSubmission.status}
                      onClick={() =>
                        updateStatus(
                          selectedSubmission.id,
                          "ELIGIBLE_FOR_MANUAL_REVIEW"
                        )
                      }
                      disabled={updatingStatus}
                    />
                    <StatusButton
                      label="Final Checks"
                      status="FINAL_CHECKS"
                      color="purple"
                      currentStatus={selectedSubmission.status}
                      onClick={() =>
                        updateStatus(selectedSubmission.id, "FINAL_CHECKS")
                      }
                      disabled={updatingStatus}
                    />
                    {user?.role === "ADMIN" && (
                      <StatusButton
                        label="Approved"
                        status="APPROVED"
                        color="green"
                        currentStatus={selectedSubmission.status}
                        onClick={() =>
                          updateStatus(selectedSubmission.id, "APPROVED")
                        }
                        disabled={updatingStatus}
                      />
                    )}
                    <StatusButton
                      label="Rejected"
                      status="REJECTED"
                      color="red"
                      currentStatus={selectedSubmission.status}
                      onClick={() =>
                        updateStatus(selectedSubmission.id, "REJECTED")
                      }
                      disabled={updatingStatus}
                    />
                  </div>
                </div>
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
    blue: active
      ? "bg-yellow-500 text-white border-yellow-600"
      : "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    yellow: active
      ? "bg-yellow-500 text-white border-yellow-600"
      : "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100",
    purple: active
      ? "bg-purple-500 text-white border-purple-600"
      : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    green: active
      ? "bg-green-500 text-white border-green-600"
      : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100",
    red: active
      ? "bg-red-500 text-white border-red-600"
      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
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

function StatusButton({
  label,
  status,
  color,
  currentStatus,
  onClick,
  disabled,
}: {
  label: string;
  status: string;
  color: string;
  currentStatus: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const isActive = currentStatus === status;
  const colorClasses = {
    blue: isActive
      ? "bg-yellow-600 text-white border-yellow-700"
      : "bg-white text-yellow-600 border-yellow-300 hover:bg-yellow-50",
    yellow: isActive
      ? "bg-yellow-600 text-white border-yellow-700"
      : "bg-white text-yellow-600 border-yellow-300 hover:bg-yellow-50",
    purple: isActive
      ? "bg-purple-600 text-white border-purple-700"
      : "bg-white text-purple-600 border-purple-300 hover:bg-purple-50",
    green: isActive
      ? "bg-green-600 text-white border-green-700"
      : "bg-white text-green-600 border-green-300 hover:bg-green-50",
    red: isActive
      ? "bg-red-600 text-white border-red-700"
      : "bg-white text-red-600 border-red-300 hover:bg-red-50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || isActive}
      className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      {label}
    </button>
  );
}
