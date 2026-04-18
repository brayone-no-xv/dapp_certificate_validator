import { useCallback, useEffect, useMemo, useState } from "react";
import { nativeToScVal } from "@stellar/stellar-sdk";
import { useContract } from "./hooks/useContract";

const s = {
  app: { maxWidth: 860, margin: "0 auto", padding: "2rem 1.2rem", fontFamily: "ui-sans-serif, system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: "1px solid #e5e7eb", gap: "1rem", flexWrap: "wrap" },
  titleWrap: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  title: { fontSize: "1.28rem", fontWeight: 700, margin: 0, color: "#111827" },
  subtitle: { margin: 0, fontSize: "0.86rem", color: "#6b7280" },
  btnPrimary: { background: "#0f766e", color: "#fff", border: "none", padding: "0.55rem 1.1rem", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  btnOutline: { background: "transparent", color: "#374151", border: "1px solid #d1d5db", padding: "0.52rem 1.1rem", borderRadius: 8, cursor: "pointer" },
  btnDanger: { background: "#b91c1c", color: "#fff", border: "none", padding: "0.38rem 0.8rem", borderRadius: 6, cursor: "pointer", fontSize: "0.8rem" },
  btnMuted: { background: "#334155", color: "#fff", border: "none", padding: "0.55rem 1.1rem", borderRadius: 8, cursor: "pointer", fontWeight: 600 },
  tabs: { display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" },
  tabBtn: { border: "1px solid #cbd5e1", borderRadius: 8, padding: "0.5rem 0.9rem", background: "#fff", cursor: "pointer", color: "#334155", fontWeight: 600 },
  tabBtnActive: { border: "1px solid #0f766e", borderRadius: 8, padding: "0.5rem 0.9rem", background: "#ccfbf1", cursor: "pointer", color: "#115e59", fontWeight: 700 },
  walletInfo: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 },
  address: { fontSize: "0.77rem", color: "#475569", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", background: "#f1f5f9", padding: "0.38rem 0.7rem", borderRadius: 6 },
  balance: { fontSize: "0.73rem", color: "#0f766e", fontWeight: 700 },
  walletRow: { display: "flex", alignItems: "center", gap: 10 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.15rem", marginBottom: "0.85rem" },
  form: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.15rem", marginBottom: "1.1rem" },
  input: { width: "100%", border: "1px solid #cbd5e1", borderRadius: 7, padding: "0.58rem 0.75rem", fontSize: "0.94rem", boxSizing: "border-box", marginBottom: "0.75rem", outline: "none" },
  label: { display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "0.3rem" },
  error: { color: "#b91c1c", fontSize: "0.85rem", margin: "0.45rem 0" },
  success: { color: "#15803d", fontSize: "0.85rem", margin: "0.45rem 0" },
  sectionTitle: { fontWeight: 700, marginBottom: "0.8rem", color: "#0f172a", fontSize: "0.95rem" },
  empty: { textAlign: "center", color: "#94a3b8", padding: "1.4rem 0", fontSize: "0.9rem" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" },
  pillGood: { display: "inline-block", background: "#dcfce7", color: "#166534", padding: "0.2rem 0.5rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 },
  pillBad: { display: "inline-block", background: "#fee2e2", color: "#991b1b", padding: "0.2rem 0.5rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 },
  meta: { margin: "0.25rem 0", color: "#475569", fontSize: "0.84rem" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.76rem", color: "#64748b", wordBreak: "break-all" },
  actions: { display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", marginTop: "0.4rem" },
};

const HASH_REGEX = /^[a-f0-9]{64}$/;

function isValidStellarAddress(value) {
  return /^G[A-Z2-7]{55}$/.test((value || "").trim());
}

function shortAddress(value) {
  const str = value ? String(value) : "";
  if (str.length < 12) return str;
  return `${str.slice(0, 6)}...${str.slice(-6)}`;
}

function toU64(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return BigInt(String(value));
}

function formatTimestamp(ts) {
  const num = Number(ts || 0);
  if (!num) return "-";
  return new Date(num * 1000).toLocaleString();
}

async function sha256File(file) {
  const raw = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeCert(value) {
  if (!value) return null;
  return {
    id: value.id,
    hash_hex: String(value.hash_hex || ""),
    doc_name: String(value.doc_name || ""),
    issuer: String(value.issuer || ""),
    owner: String(value.owner || ""),
    issued_at: value.issued_at,
    revoked: Boolean(value.revoked),
    revoked_at: value.revoked_at,
    revoke_reason: String(value.revoke_reason || ""),
    note: String(value.note || ""),
  };
}

export default function App() {
  const {
    publicKey,
    isWalletConnected,
    walletLoading,
    walletError,
    connectWallet,
    disconnectWallet,
    readContract,
    writeContract,
    txLoading,
    txError,
    txSuccess,
    xlmBalance,
  } = useContract();

  const [activeTab, setActiveTab] = useState("issue");

  const [ownerAddress, setOwnerAddress] = useState("");
  const [docName, setDocName] = useState("");
  const [docNote, setDocNote] = useState("");
  const [issueFile, setIssueFile] = useState(null);
  const [lastIssuedHash, setLastIssuedHash] = useState("");

  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyHashInput, setVerifyHashInput] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyMessage, setVerifyMessage] = useState("");

  const [issuedCerts, setIssuedCerts] = useState([]);
  const [ownedCerts, setOwnedCerts] = useState([]);

  const issueAddressDefault = useMemo(() => publicKey || "", [publicKey]);

  useEffect(() => {
    if (!ownerAddress && issueAddressDefault) {
      setOwnerAddress(issueAddressDefault);
    }
  }, [ownerAddress, issueAddressDefault]);

  const loadMyCertificates = useCallback(async () => {
    if (!publicKey) {
      setIssuedCerts([]);
      setOwnedCerts([]);
      return;
    }

    const addressVal = nativeToScVal(publicKey, { type: "address" });
    const [issuerData, ownerData] = await Promise.all([
      readContract("get_by_issuer", [addressVal]),
      readContract("get_by_owner", [addressVal]),
    ]);

    setIssuedCerts((issuerData || []).map(normalizeCert));
    setOwnedCerts((ownerData || []).map(normalizeCert));
  }, [publicKey, readContract]);

  useEffect(() => {
    loadMyCertificates().catch(() => {
      setIssuedCerts([]);
      setOwnedCerts([]);
    });
  }, [loadMyCertificates]);

  async function handleIssueCertificate() {
    if (!isWalletConnected) return;
    if (!issueFile) throw new Error("Please select a document file.");
    if (!isValidStellarAddress(ownerAddress)) throw new Error("Owner address is invalid.");
    if (!docName.trim()) throw new Error("Document name is required.");

    const hash = await sha256File(issueFile);
    await writeContract("issue_certificate", [
      nativeToScVal(publicKey, { type: "address" }),
      nativeToScVal(ownerAddress.trim(), { type: "address" }),
      nativeToScVal(hash, { type: "string" }),
      nativeToScVal(docName.trim(), { type: "string" }),
      nativeToScVal(docNote.trim(), { type: "string" }),
    ]);

    setLastIssuedHash(hash);
    setDocName("");
    setDocNote("");
    setIssueFile(null);
    await loadMyCertificates();
  }

  async function handleVerify() {
    let hash = verifyHashInput.trim().toLowerCase();

    if (verifyFile) {
      hash = await sha256File(verifyFile);
      setVerifyHashInput(hash);
    }

    if (!HASH_REGEX.test(hash)) {
      setVerifyResult(null);
      setVerifyMessage("Hash is invalid. Use a 64-char lowercase hex SHA-256 hash.");
      return;
    }

    const data = await readContract("verify_by_hash", [nativeToScVal(hash, { type: "string" })]);
    if (!data) {
      setVerifyResult(null);
      setVerifyMessage("Certificate not found.");
      return;
    }

    setVerifyResult(normalizeCert(data));
    setVerifyMessage("Certificate found.");
  }

  async function handleRevoke(id) {
    if (!isWalletConnected) return;
    await writeContract("revoke_certificate", [
      nativeToScVal(publicKey, { type: "address" }),
      nativeToScVal(toU64(id), { type: "u64" }),
      nativeToScVal("Revoked by issuer", { type: "string" }),
    ]);
    await loadMyCertificates();
    if (verifyResult && String(verifyResult.id) === String(id)) {
      await handleVerify();
    }
  }

  function renderCertCard(cert, showActions = false) {
    return (
      <div key={String(cert.id)} style={s.card}>
        <p style={{ ...s.sectionTitle, marginBottom: "0.45rem" }}>{cert.doc_name}</p>
        <p style={s.meta}>ID: {String(cert.id)}</p>
        <p style={s.meta}>Issuer: {shortAddress(cert.issuer)}</p>
        <p style={s.meta}>Owner: {shortAddress(cert.owner)}</p>
        <p style={s.meta}>Issued: {formatTimestamp(cert.issued_at)}</p>
        <p style={s.meta}>Status: {cert.revoked ? <span style={s.pillBad}>REVOKED</span> : <span style={s.pillGood}>VALID</span>}</p>
        <p style={s.meta}>Note: {cert.note || "-"}</p>
        {cert.revoked && <p style={s.meta}>Revoke reason: {cert.revoke_reason || "-"}</p>}
        <p style={s.mono}>Hash: {cert.hash_hex}</p>

        {showActions && !cert.revoked && String(cert.issuer) === String(publicKey) && (
          <div style={s.actions}>
            <button style={s.btnDanger} onClick={() => handleRevoke(cert.id)} disabled={txLoading}>
              {txLoading ? "Processing..." : "Revoke"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={s.titleWrap}>
          <h1 style={s.title}>Document Certificate DApp</h1>
          <p style={s.subtitle}>Anti-fraud proof: register and verify document hashes on Stellar.</p>
        </div>

        {isWalletConnected ? (
          <div style={s.walletInfo}>
            <div style={s.walletRow}>
              <span style={s.address}>
                {publicKey.slice(0, 6)}...{publicKey.slice(-6)}
              </span>
              <button style={s.btnOutline} onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
            {xlmBalance !== null && (
              <span style={s.balance}>
                {parseFloat(xlmBalance).toFixed(2)} XLM
              </span>
            )}
          </div>
        ) : (
          <button style={s.btnPrimary} onClick={connectWallet} disabled={walletLoading}>
            {walletLoading ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>

      <div style={s.tabs}>
        <button style={activeTab === "issue" ? s.tabBtnActive : s.tabBtn} onClick={() => setActiveTab("issue")}>Issue</button>
        <button style={activeTab === "verify" ? s.tabBtnActive : s.tabBtn} onClick={() => setActiveTab("verify")}>Verify</button>
        <button style={activeTab === "my" ? s.tabBtnActive : s.tabBtn} onClick={() => setActiveTab("my")}>My Certificates</button>
      </div>

      {walletError && <p style={s.error}>Wallet error: {walletError}</p>}
      {txError && <p style={s.error}>Transaction error: {txError}</p>}
      {txSuccess && <p style={s.success}>Transaction confirmed: {txSuccess.slice(0, 12)}...</p>}

      {activeTab === "issue" && (
        <div style={s.form}>
          <p style={s.sectionTitle}>Issue Certificate</p>

          {!isWalletConnected && (
            <p style={s.error}>Connect wallet first to issue a certificate.</p>
          )}

          <div style={s.row}>
            <div>
              <label style={s.label}>Owner Address</label>
              <input
                style={s.input}
                placeholder="G..."
                value={ownerAddress}
                onChange={(e) => setOwnerAddress(e.target.value)}
              />
            </div>
            <div>
              <label style={s.label}>Document Name</label>
              <input
                style={s.input}
                placeholder="Example: University Certificate"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
              />
            </div>
          </div>

          <label style={s.label}>Note (optional)</label>
          <input
            style={s.input}
            placeholder="Any verification note"
            value={docNote}
            onChange={(e) => setDocNote(e.target.value)}
          />

          <label style={s.label}>Document File</label>
          <input
            style={s.input}
            type="file"
            onChange={(e) => setIssueFile(e.target.files?.[0] || null)}
          />

          {lastIssuedHash && (
            <p style={s.mono}>Last issued hash: {lastIssuedHash}</p>
          )}

          <div style={s.actions}>
            <button
              style={s.btnPrimary}
              onClick={() => handleIssueCertificate().catch(() => {})}
              disabled={txLoading || !isWalletConnected}
            >
              {txLoading ? "Issuing..." : "Issue Certificate"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "verify" && (
        <div style={s.form}>
          <p style={s.sectionTitle}>Verify Certificate</p>

          <label style={s.label}>Upload File (recommended)</label>
          <input
            style={s.input}
            type="file"
            onChange={(e) => setVerifyFile(e.target.files?.[0] || null)}
          />

          <label style={s.label}>Or enter hash manually</label>
          <input
            style={s.input}
            placeholder="64-char SHA-256 hex"
            value={verifyHashInput}
            onChange={(e) => setVerifyHashInput(e.target.value.toLowerCase())}
          />

          <div style={s.actions}>
            <button style={s.btnMuted} onClick={() => handleVerify().catch(() => {})}>
              Verify
            </button>
          </div>

          {verifyMessage && (
            <p style={verifyResult ? s.success : s.error}>{verifyMessage}</p>
          )}

          {verifyResult && renderCertCard(verifyResult, false)}
        </div>
      )}

      {activeTab === "my" && (
        <div>
          <div style={s.form}>
            <p style={s.sectionTitle}>Issued by Me ({issuedCerts.length})</p>
            {!isWalletConnected && <p style={s.empty}>Connect wallet to load your data.</p>}
            {isWalletConnected && issuedCerts.length === 0 && <p style={s.empty}>No certificates issued yet.</p>}
            {issuedCerts.map((cert) => renderCertCard(cert, true))}
          </div>

          <div style={s.form}>
            <p style={s.sectionTitle}>Owned by Me ({ownedCerts.length})</p>
            {!isWalletConnected && <p style={s.empty}>Connect wallet to load your data.</p>}
            {isWalletConnected && ownedCerts.length === 0 && <p style={s.empty}>No owned certificates found.</p>}
            {ownedCerts.map((cert) => renderCertCard(cert, false))}
          </div>
        </div>
      )}

    </div>
  );
}