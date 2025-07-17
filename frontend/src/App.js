
import React, { useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

function App() {
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus("");
    setDownloadUrl("");
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("Uploading...");
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.job_id) {
        setJobId(data.job_id);
        setStatus("Processing...");
        pollStatus(data.job_id);
      } else {
        setError("Failed to start processing.");
      }
    } catch (err) {
      setError("Upload failed.");
    }
  };

  const pollStatus = async (jobId) => {
    let interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/status/${jobId}`);
        const data = await res.json();
        setStatus(data.status);
        if (data.status === "completed") {
          setDownloadUrl(`${API_URL}/download/${jobId}`);
          clearInterval(interval);
        } else if (data.status === "failed") {
          setError("Processing failed.");
          clearInterval(interval);
        }
      } catch (err) {
        setError("Error checking status.");
        clearInterval(interval);
      }
    }, 2000);
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 24, borderRadius: 8, boxShadow: "0 2px 8px #eee", background: "#fff" }}>
      <h2>BPMN Generator from SOP</h2>
      <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={handleFileChange} />
      <button style={{ marginTop: 16 }} onClick={handleUpload} disabled={!file}>Upload & Process</button>
      {status && <div style={{ marginTop: 16 }}>Status: {status}</div>}
      {downloadUrl && (
        <a href={downloadUrl} style={{ display: "block", marginTop: 16 }} download>
          Download BPMN XML
        </a>
      )}
      {error && <div style={{ color: "red", marginTop: 16 }}>{error}</div>}
      <div style={{ marginTop: 32, fontSize: 12, color: "#888" }}>
        Supported: PDF, DOCX, Images. Powered by AI multi-agent pipeline.
      </div>
    </div>
  );
}

export default App;
