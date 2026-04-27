import { useRef, useState } from "react";
import "./App.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const API_URL = API_BASE_URL ? `${API_BASE_URL}/upload` : "/upload";

function formatField(value) {
  return value || "Not Found";
}

function shortValue(value, maxLength = 64) {
  const text = formatField(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [uploads, setUploads] = useState([]);
  const inputRef = useRef(null);

  const setFileIfPdf = (file) => {
    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      setSelectedFile(null);
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    const [file] = event.target.files || [];
    setFileIfPdf(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const [file] = event.dataTransfer.files || [];
    setFileIfPdf(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Choose a PDF file first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("invoice", selectedFile);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      const responseText = await response.text();
      const contentType = response.headers.get("content-type") || "";
      let data;

      if (contentType.includes("application/json")) {
        data = JSON.parse(responseText);
      } else {
        throw new Error(
          `Server returned non-JSON response (${response.status}). Check backend URL/proxy.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract invoice data.");
      }

      setResult(data);
      setUploads((prev) => [
        {
          id: Date.now(),
          fileName: selectedFile.name,
          extractedAt: new Date().toLocaleString(),
          data,
        },
        ...prev,
      ]);
    } catch (uploadError) {
      setResult(null);
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <header className="app-topbar">
        <div>
          <p className="topbar-tag">Invoice Intelligence</p>
          <h1 className="topbar-title">PDF Invoice Data Extractor</h1>
        </div>
      </header>
      <div className="app-layout">
        <section className="panel panel-main">
          <div className="panel-header">
            <span className="badge">Smart Invoice Parser</span>
            <h1 className="title">Upload Invoice PDF</h1>
            <p className="subtitle">
              Extract GST Number, Client Name, and Scope of Work in one click.
            </p>
          </div>

          <section
            className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="visually-hidden"
              onChange={handleFileChange}
            />
            <p className="dropzone-title">Drag & drop your invoice PDF here</p>
            <p className="dropzone-subtitle">or</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn btn-dark"
            >
              Choose PDF
            </button>
            <p className="file-name">
              {selectedFile ? `Selected: ${selectedFile.name}` : "No file selected"}
            </p>
          </section>

          <div className="actions">
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Processing..." : "Upload & Extract"}
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setError("");
                setSelectedFile(null);
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
              }}
              className="btn btn-light"
            >
              Reset
            </button>
          </div>

          {error ? <p className="message message-error">{error}</p> : null}

          {result ? (
            <section className="result-section">
              <h2 className="result-title">Extracted Information</h2>
              <div className="result-list">
                <article className="result-row">
                  <p className="result-label">Invoice Type</p>
                  <p className="result-value">{formatField(result.invoiceType)}</p>
                </article>
                <article className="result-row">
                  <p className="result-label">Pages Parsed</p>
                  <p className="result-value">{formatField(String(result.pagesParsed || "Not Found"))}</p>
                </article>
                <article className="result-row">
                  <p className="result-label">Client Name</p>
                  <p className="result-value">{formatField(result.clientName)}</p>
                </article>
                <article className="result-row">
                  <p className="result-label">Scope of Work</p>
                  <div className="result-value result-value-wide">
                    {Array.isArray(result.scopeOfWork) && result.scopeOfWork.length > 0 ? (
                      <div className="scope-list">
                        {result.scopeOfWork.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="scope-item">
                            <p className="scope-title">{formatField(item.title)}</p>
                            {item.details?.length ? (
                              <ul className="scope-details">
                                {item.details.map((detail, detailIndex) => (
                                  <li key={`${detail}-${detailIndex}`}>{detail}</li>
                                ))}
                              </ul>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "Not Found"
                    )}
                  </div>
                </article>
                <article className="result-row">
                  <p className="result-label">Company GST</p>
                  <p className="result-value">{formatField(result.companyGST || result.gstNumber)}</p>
                </article>
                <article className="result-row">
                  <p className="result-label">Client GST</p>
                  <p className="result-value">{formatField(result.clientGST)}</p>
                </article>
                <article className="result-row">
                  <p className="result-label">TRN</p>
                  <p className="result-value">{formatField(result.trn)}</p>
                </article>
                <article className="result-row">
                  <p className="result-label">Invoice Number</p>
                  <p className="result-value">{formatField(result.invoiceNumber)}</p>
                </article>
                <article className="result-row">
                  <p className="result-label">Total Amount</p>
                  <p className="result-value">{formatField(result.totalAmount)}</p>
                </article>
              </div>

              <div className="raw-json">
                <p className="raw-json-label">Raw JSON</p>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            </section>
          ) : null}
        </section>

        <aside className="panel panel-side">
          <h2 className="side-title">Recent Uploads</h2>
          <p className="side-subtitle">Quick view of your latest extracted invoices.</p>

          <div className="history-list">
            {uploads.length === 0 ? (
              <p className="history-empty">No uploads yet.</p>
            ) : (
              uploads.slice(0, 5).map((item) => (
                <article key={item.id} className="history-card">
                  <p className="history-file">{item.fileName}</p>
                  <p className="history-time">{item.extractedAt}</p>
                  <p className="history-meta">Type: {shortValue(item.data.invoiceType, 24)}</p>
                  <p className="history-meta">Pages: {shortValue(String(item.data.pagesParsed || "Not Found"), 24)}</p>
                  <p className="history-meta">Client: {shortValue(item.data.clientName, 30)}</p>
                  <p className="history-meta">Amount: {shortValue(item.data.totalAmount, 20)}</p>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default App;
