"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  AnalysisBundle,
  AuditEvent,
  getAdminBundles,
  getAuditEvents,
  approveBundle,
  rejectBundle,
  supersedeBundle,
} from "@/lib/api";
import { formatBundleStatus, bundleStatusStyle } from "@/lib/status";

const STATUS_FILTERS = [
  { value: "submitted", label: "Awaiting Review" },
  { value: "approved_for_execution", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "superseded", label: "Superseded" },
  { value: "all", label: "All Bundles" },
];

function eventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    "bundle.created": "Created",
    "bundle.submitted": "Submitted",
    "bundle.approved": "Approved",
    "bundle.rejected": "Rejected",
    "bundle.superseded": "Superseded",
    "execution.requested": "Execution requested",
    "execution.started": "Execution started",
    "execution.completed": "Execution completed",
    "execution.failed": "Execution failed",
  };
  return labels[eventType] || eventType;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function AdminSubmissionsPage() {
  const { user } = useAuth();
  const [bundles, setBundles] = useState<AnalysisBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("submitted");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bundleAudit, setBundleAudit] = useState<Record<string, AuditEvent[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminBundles();
      setBundles(data);
    } catch {
      setError("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredBundles =
    statusFilter === "all"
      ? bundles
      : bundles.filter((b) => b.status === statusFilter);

  const handleAction = async (
    _actionLabel: string,
    bundleId: string,
    apiFn: (id: string) => Promise<AnalysisBundle>,
  ) => {
    setActionError(null);
    setActionLoading(true);
    try {
      await apiFn(bundleId);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExpand = async (bundleId: string) => {
    if (expandedId === bundleId) {
      setExpandedId(null);
      return;
    }
    if (!bundleAudit[bundleId]) {
      try {
        const res = await getAuditEvents({
          resource_type: "analysis_bundle",
          resource_id: bundleId,
          limit: 20,
        });
        setBundleAudit((prev) => ({ ...prev, [bundleId]: res.items }));
      } catch {
        setBundleAudit((prev) => ({ ...prev, [bundleId]: [] }));
      }
    }
    setExpandedId(bundleId);
  };

  const canReview = user?.capabilities.includes("bundle.review");

  return (
    <>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "var(--spacing-sm)" }}>
        Submission Operations
      </h2>

      <div style={{ display: "flex", gap: "var(--spacing-xs)", marginBottom: "var(--spacing-md)", flexWrap: "wrap" }}>
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            style={{
              padding: "4px 12px",
              fontSize: "0.85rem",
              background:
                statusFilter === opt.value
                  ? "var(--color-primary, #1976d2)"
                  : "transparent",
              color:
                statusFilter === opt.value
                  ? "#fff"
                  : "var(--color-text-secondary)",
              border: "1px solid",
              borderColor:
                statusFilter === opt.value
                  ? "var(--color-primary, #1976d2)"
                  : "var(--color-border)",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: statusFilter === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div
          style={{
            padding: "8px 12px",
            marginBottom: "var(--spacing-md)",
            background: "#f8d7da",
            color: "#721c24",
            borderRadius: "4px",
            fontSize: "0.85rem",
          }}
        >
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="card empty-state">Loading...</div>
      ) : error ? (
        <div className="card empty-state">{error}</div>
      ) : filteredBundles.length === 0 ? (
        <div className="card empty-state">
          {statusFilter === "submitted"
            ? "No submissions awaiting review."
            : `No bundles with status "${formatBundleStatus(statusFilter)}".`}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Runtime</th>
                <th>Version</th>
                {canReview && <th>Actions</th>}
                <th>History</th>
              </tr>
            </thead>
            <tbody>
              {filteredBundles.map((b) => {
                const badge = bundleStatusStyle(b.status);
                return (
                  <>
                    <tr key={b.id}>
                      <td style={{ fontWeight: 500 }}>{b.name}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            ...badge,
                          }}
                        >
                          {formatBundleStatus(b.status)}
                        </span>
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        {b.runtime}
                      </td>
                      <td style={{ color: "var(--color-text-secondary)" }}>
                        {b.version}
                      </td>
                      {canReview && (
                        <td>
                          <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
                            {b.status === "submitted" && (
                              <>
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    background: "var(--color-success, #2e7d32)",
                                    color: "#fff",
                                    border: "none",
                                  }}
                                  onClick={() =>
                                    handleAction("Approve", b.id, approveBundle)
                                  }
                                  disabled={actionLoading}
                                >
                                  {actionLoading ? "Processing…" : "Approve"}
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{
                                    background: "var(--color-danger, #c62828)",
                                    color: "#fff",
                                    border: "none",
                                  }}
                                  onClick={() =>
                                    handleAction("Reject", b.id, rejectBundle)
                                  }
                                  disabled={actionLoading}
                                >
                                  {actionLoading ? "Processing…" : "Reject"}
                                </button>
                              </>
                            )}
                            {b.status === "approved_for_execution" && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: "#fff3cd",
                                  color: "#856404",
                                  border: "1px solid #856404",
                                }}
                                onClick={() =>
                                  handleAction(
                                    "Supersede",
                                    b.id,
                                    supersedeBundle,
                                  )
                                }
                                disabled={actionLoading}
                              >
                                {actionLoading ? "Processing…" : "Supersede"}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      <td>
                        <button
                          onClick={() => handleExpand(b.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                            padding: 0,
                            color: "var(--color-primary, #1976d2)",
                            textDecoration:
                              expandedId === b.id ? "underline" : "none",
                          }}
                        >
                          {expandedId === b.id ? "Hide" : "Show"} history
                        </button>
                      </td>
                    </tr>
                    {expandedId === b.id && (
                      <tr key={`${b.id}-audit`}>
                        <td
                          colSpan={canReview ? 6 : 5}
                          style={{ padding: "0 16px 8px 16px" }}
                        >
                          {!bundleAudit[b.id] ? (
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              Loading...
                            </div>
                          ) : bundleAudit[b.id].length === 0 ? (
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              No audit events for this submission.
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.85rem" }}>
                              {bundleAudit[b.id].map((e) => (
                                <div
                                  key={e.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "4px 0",
                                    borderBottom:
                                      "1px solid var(--color-border, #eee)",
                                  }}
                                >
                                  <span style={{ fontWeight: 500 }}>
                                    {eventLabel(e.event_type)}
                                  </span>
                                  <span
                                    style={{
                                      color: "var(--color-text-secondary)",
                                    }}
                                  >
                                    {e.actor_display_name} —{" "}
                                    {formatTime(e.occurred_at)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
