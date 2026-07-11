"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalysisBundle, getProjectBundles } from "@/lib/api";
import { formatBundleStatus, bundleStatusStyle } from "@/lib/status";

function BundleTable({
  bundles,
  projectId,
}: {
  bundles: AnalysisBundle[];
  projectId: string;
}) {
  if (bundles.length === 0) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Runtime</th>
            <th>Version</th>
            <th>Resources</th>
            <th>Updated</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((b) => (
            <tr key={b.id}>
              <td style={{ fontWeight: 500 }}>
                <Link
                  href={`/projects/${projectId}/analysis/${b.id}`}
                  style={{ color: "var(--color-primary)", textDecoration: "none" }}
                >
                  {b.name}
                </Link>
              </td>
              <td style={{ color: "var(--color-text-secondary)" }}>
                {b.runtime || "—"}
              </td>
              <td style={{ color: "var(--color-text-secondary)" }}>
                {b.version}
              </td>
              <td style={{ color: "var(--color-text-secondary)" }}>
                {b.resource_identifiers.length > 0
                  ? b.resource_identifiers.join(", ")
                  : "—"}
              </td>
              <td style={{ color: "var(--color-text-secondary)" }}>
                {new Date(b.updated_at).toLocaleDateString()}
              </td>
              <td>
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    ...bundleStatusStyle(b.status),
                  }}
                >
                  {formatBundleStatus(b.status)}
                </span>
              </td>
              <td>
                {b.status === "draft" ? (
                  <Link
                    href={`/projects/${projectId}/analysis/${b.id}/edit`}
                    style={{
                      color: "var(--color-primary)",
                      fontSize: "0.85rem",
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    Continue
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProjectAnalysisPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [bundles, setBundles] = useState<AnalysisBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjectBundles(projectId)
      .then(setBundles)
      .catch(() => setError("Failed to load analysis bundles"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const draftBundles = bundles.filter((b) => b.status === "draft");
  const submittedBundles = bundles.filter((b) => b.status !== "draft");

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--spacing-md)",
        }}
      >
        <h2 data-testid="analysis-heading" style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 0 }}>
          Analysis Bundles
        </h2>
        <Link href={`/projects/${projectId}/analysis/new`} className="btn btn-primary">
          New Draft Bundle
        </Link>
      </div>

      {loading ? (
        <div className="card empty-state">Loading...</div>
      ) : error ? (
        <div className="card empty-state">{error}</div>
      ) : bundles.length === 0 ? (
        <div className="card empty-state">
          No analysis bundles. Create your first draft to get started.
        </div>
      ) : (
        <div>
          {draftBundles.length > 0 && (
            <div style={{ marginBottom: "var(--spacing-xl)" }}>
              <h3
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-secondary)",
                  marginBottom: "var(--spacing-sm)",
                }}
              >
                Draft Bundles
              </h3>
              <BundleTable bundles={draftBundles} projectId={projectId} />
            </div>
          )}

          {submittedBundles.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--color-text-secondary)",
                  marginBottom: "var(--spacing-sm)",
                }}
              >
                Submitted Bundles
              </h3>
              <BundleTable bundles={submittedBundles} projectId={projectId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
