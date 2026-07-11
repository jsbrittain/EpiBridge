"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnalysisBundle, createDraftBundle, getProjectBundles } from "@/lib/api";
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

function NewDraftDialog({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const bundle = await createDraftBundle(projectId, name.trim());
      router.push(`/projects/${projectId}/analysis/${bundle.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create draft");
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface, #fff)",
          borderRadius: "var(--radius-lg, 8px)",
          padding: "var(--spacing-lg)",
          maxWidth: "420px",
          width: "90%",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--spacing-md)", marginTop: 0 }}>
          New Draft Bundle
        </h2>
        {error && (
          <div style={{ color: "#d32f2f", fontSize: "0.85rem", marginBottom: "var(--spacing-sm)" }}>
            {error}
          </div>
        )}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bundle name"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%",
            padding: "var(--spacing-sm) var(--spacing-md)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.9rem",
            marginBottom: "var(--spacing-md)",
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: "var(--spacing-sm)", justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create Draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectAnalysisPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [bundles, setBundles] = useState<AnalysisBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewDraft, setShowNewDraft] = useState(false);

  const load = () => {
    setLoading(true);
    getProjectBundles(projectId)
      .then(setBundles)
      .catch(() => setError("Failed to load analysis bundles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const draftBundles = bundles.filter((b) => b.status === "draft");
  const submittedBundles = bundles.filter((b) => b.status !== "draft");

  return (
    <div>
      {showNewDraft && (
        <NewDraftDialog
          projectId={projectId}
          onClose={() => setShowNewDraft(false)}
        />
      )}

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
        <button className="btn btn-primary" onClick={() => setShowNewDraft(true)}>
          New Draft Bundle
        </button>
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
