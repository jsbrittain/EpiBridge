"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ExecutionEnvironment, getExecutionEnvironments } from "@/lib/api";

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<ExecutionEnvironment[]>([]);

  const loadEnvironments = useCallback(async () => {
    try {
      const data = await getExecutionEnvironments();
      setEnvironments(data);
    } catch {
      setEnvironments([]);
    }
  }, []);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  return (
    <>
      <h1 className="page-title">Execution Environments</h1>

      {environments.length === 0 ? (
        <div className="card empty-state">
          No execution environments available.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Runtime</th>
                <th>Description</th>
                <th>Image</th>
              </tr>
            </thead>
            <tbody>
              {environments.map((env) => (
                <tr key={env.id}>
                  <td style={{ fontWeight: 500 }}>
                    <Link
                      href={`/environments/${env.identifier}`}
                      style={{ color: "var(--color-primary)", textDecoration: "none" }}
                    >
                      {env.display_name}
                    </Link>
                  </td>
                  <td style={{ color: "var(--color-text-secondary)" }}>
                    {env.runtime}
                  </td>
                  <td style={{ color: "var(--color-text-secondary)" }}>
                    {env.description || "—"}
                  </td>
                  <td style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
                    <code>{env.image_reference}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
