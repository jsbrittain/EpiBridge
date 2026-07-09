"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ExecutionEnvironment,
  ArtefactList,
  getExecutionEnvironment,
  getEnvironmentArtefacts,
  getEnvironmentArtefactUrl,
} from "@/lib/api";

export default function EnvironmentDetailPage() {
  const params = useParams();
  const identifier = params.identifier as string;

  const [env, setEnv] = useState<ExecutionEnvironment | null>(null);
  const [artefacts, setArtefacts] = useState<ArtefactList | null>(null);
  const [dockerfile, setDockerfile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [envData, artefactData] = await Promise.all([
        getExecutionEnvironment(identifier),
        getEnvironmentArtefacts(identifier),
      ]);
      setEnv(envData);
      setArtefacts(artefactData);

      if (artefactData.artefacts.includes("Dockerfile")) {
        const url = getEnvironmentArtefactUrl(identifier, "Dockerfile");
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          setDockerfile(await res.text());
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load environment");
    }
  }, [identifier]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <>
        <Link href="/environments" style={{ color: "var(--color-primary)", textDecoration: "none", fontSize: "0.9rem" }}>
          ← Environments
        </Link>
        <div className="card empty-state" style={{ marginTop: "var(--spacing-lg)" }}>
          {error}
        </div>
      </>
    );
  }

  if (!env) {
    return <div className="card empty-state">Loading…</div>;
  }

  const hasManifest = artefacts?.artefacts.includes("manifest.yaml");

  return (
    <>
      <Link href="/environments" style={{ color: "var(--color-primary)", textDecoration: "none", fontSize: "0.9rem" }}>
        ← Environments
      </Link>

      <h1 className="page-title" style={{ marginTop: "var(--spacing-md)" }}>
        {env.display_name}
      </h1>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Environment Details
        </h2>
        <table className="table" style={{ marginBottom: 0 }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 500, width: "180px" }}>Name</td>
              <td>{env.name}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Identifier</td>
              <td><code>{env.identifier}</code></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Runtime</td>
              <td>{env.runtime}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Description</td>
              <td>{env.description || "—"}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 500 }}>Image</td>
              <td><code>{env.image_reference}</code></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: "var(--spacing-lg)" }}>
        <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Local Development
        </h2>
        <p style={{ marginBottom: "var(--spacing-md)", color: "var(--color-text-secondary)" }}>
          Reproduce this execution environment locally using Docker.
        </p>

        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <label style={{ display: "block", fontWeight: 500, marginBottom: "var(--spacing-xs)", fontSize: "0.9rem" }}>
            Pull the image
          </label>
          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            <code
              style={{
                flex: 1,
                padding: "var(--spacing-sm) var(--spacing-md)",
                background: "var(--color-bg-code, #f5f5f5)",
                borderRadius: "4px",
                fontSize: "0.85rem",
                whiteSpace: "pre-wrap",
              }}
            >
              docker pull {env.image_reference}
            </code>
            <button
              className="btn btn-secondary"
              style={{ flexShrink: 0 }}
              onClick={() => navigator.clipboard.writeText(`docker pull ${env.image_reference}`)}
            >
              Copy
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "var(--spacing-md)" }}>
          <label style={{ display: "block", fontWeight: 500, marginBottom: "var(--spacing-xs)", fontSize: "0.9rem" }}>
            Run a container
          </label>
          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            <code
              style={{
                flex: 1,
                padding: "var(--spacing-sm) var(--spacing-md)",
                background: "var(--color-bg-code, #f5f5f5)",
                borderRadius: "4px",
                fontSize: "0.85rem",
                whiteSpace: "pre-wrap",
              }}
            >
              docker run --rm -v $(pwd):/analysis -v $(pwd)/data:/data:ro {env.image_reference}
            </code>
            <button
              className="btn btn-secondary"
              style={{ flexShrink: 0 }}
              onClick={() =>
                navigator.clipboard.writeText(`docker run --rm -v $(pwd):/analysis -v $(pwd)/data:/data:ro ${env.image_reference}`)
              }
            >
              Copy
            </button>
          </div>
        </div>
      </div>

      {dockerfile && (
        <div className="card" style={{ marginTop: "var(--spacing-lg)" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Dockerfile
          </h2>
          <pre
            style={{
              background: "var(--color-bg-code, #f5f5f5)",
              padding: "var(--spacing-md)",
              borderRadius: "4px",
              overflowX: "auto",
              fontSize: "0.85rem",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {dockerfile}
          </pre>
        </div>
      )}

      {artefacts && artefacts.artefacts.length > 0 && (
        <div className="card" style={{ marginTop: "var(--spacing-lg)" }}>
          <h2 style={{ marginTop: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Published Artefacts
          </h2>
          <ul style={{ margin: 0, paddingLeft: "var(--spacing-lg)" }}>
            {artefacts.artefacts.filter((f) => f !== "manifest.yaml" || hasManifest).map((file) => (
              <li key={file} style={{ marginBottom: "var(--spacing-xs)" }}>
                {file === "manifest.yaml" || file === "Dockerfile" ? (
                  <span>{file}</span>
                ) : (
                  <a
                    href={getEnvironmentArtefactUrl(identifier, file)}
                    style={{ color: "var(--color-primary)", textDecoration: "none" }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {file}
                  </a>
                )}
                {file === "manifest.yaml" && (
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginLeft: "var(--spacing-sm)" }}>
                    (registry metadata)
                  </span>
                )}
                {file === "Dockerfile" && (
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", marginLeft: "var(--spacing-sm)" }}>
                    (shown above)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
