
import React, { useState } from "react";
import axios from "axios";

export default function App() {
  const [file, setFile] = useState(null);
  const [bpmnXML, setBpmnXML] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await axios.post("http://localhost:8000/upload", formData);
      const processRes = await axios.post("http://localhost:8000/process", {
        filename: uploadRes.data.filename
      });
      setBpmnXML(processRes.data.bpmn_xml);
    } catch (err) {
      alert("Something went wrong");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SOP to BPMN Generator</h1>
      <input type="file" accept=".pdf,.docx,.png,.jpg" onChange={(e) => setFile(e.target.files[0])} />
      <button className="bg-blue-500 text-white px-4 py-2 mt-4" onClick={handleFileUpload} disabled={loading}>
        {loading ? "Processing..." : "Upload & Generate BPMN"}
      </button>
      {bpmnXML && (
        <div className="mt-6">
          <h2 className="font-semibold">Generated BPMN XML:</h2>
          <textarea className="w-full h-64 p-2 border mt-2" value={bpmnXML} readOnly></textarea>
        </div>
      )}
    </div>
  );
}
