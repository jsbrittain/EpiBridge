"use client";

import styles from "./LogViewer.module.css";

interface LogViewerProps {
  log: string;
  title?: string;
  maxHeight?: string;
}

export default function LogViewer({ log, title, maxHeight = "400px" }: LogViewerProps) {
  if (!log) return null;

  return (
    <div className={styles.wrapper}>
      {title && <div className={styles.header}>{title}</div>}
      <pre className={styles.log} style={{ maxHeight }}>
        {log}
      </pre>
    </div>
  );
}
