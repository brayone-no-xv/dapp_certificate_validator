import { useState, useEffect, useCallback } from "react";
import {
  Networks,
  BASE_FEE,
  TransactionBuilder,
  Contract,
  scValToNative,
  Keypair,
  Account,
  rpc,
  Asset,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

const RPC_URL = import.meta.env.VITE_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK = Networks.TESTNET;
const LEGACY_NOTES_CONTRACT_ID = "CA5MNLJIQKIGIRU5ME4W5FWTSPRV7KUEYKGNKUNUUUWFEUKTKRGRQC3J";
const CERTIFICATE_CONTRACT_ID = "CB56EHRETWRDJTPDPOYBB3E3QBCDM7WUONACL4HIUXCUBHKLIXOA7R7U";
const envContractId = (import.meta.env.VITE_CONTRACT_ID || "").trim();
const CONTRACT_ID =
  !envContractId || envContractId === LEGACY_NOTES_CONTRACT_ID
    ? CERTIFICATE_CONTRACT_ID
    : envContractId;
const server = new rpc.Server(RPC_URL);

export function useContract() {
  const contract = new Contract(CONTRACT_ID);

  const [publicKey, setPublicKey] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState(null);
  const [freighterInstalled, setFreighterInstalled] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState(null);
  const [txSuccess, setTxSuccess] = useState(null);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(
    () => localStorage.getItem("wallet_disconnected") === "true"
  );
  const [xlmBalance, setXlmBalance] = useState(null);

  const isWalletConnected = !!publicKey;

  // Check Freighter on mount + poll every second to detect wallet changes
  useEffect(() => {
    async function check() {
      try {
        const res = await isConnected();
        setFreighterInstalled(!!res);
        if (res?.isConnected && !manuallyDisconnected) {
          const key = await getAddress();
          if (key?.address) setPublicKey(key.address);
        }
      } catch {
        setFreighterInstalled(false);
      }
    }

    check();

    const interval = setInterval(async () => {
      try {
        const res = await isConnected();
        if (res?.isConnected && !manuallyDisconnected) {
          const key = await getAddress();
          if (key?.address) {
            setPublicKey((prev) => {
              if (prev !== key.address) return key.address;
              return prev;
            });
          }
        } else if (!res?.isConnected) {
          setPublicKey(null);
        }
      } catch {
        setPublicKey(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [manuallyDisconnected]);

  // Connect wallet via Freighter
  const connectWallet = useCallback(async () => {
    setWalletLoading(true);
    setWalletError(null);
    localStorage.removeItem("wallet_disconnected");
    setManuallyDisconnected(false);
    try {
      await requestAccess();
      const key = await getAddress();
      if (!key?.address) throw new Error("Failed to get public key");
      setPublicKey(key.address);
      return key.address;
    } catch (err) {
      setWalletError(err.message);
      throw err;
    } finally {
      setWalletLoading(false);
    }
  }, []);

  // Disconnect wallet - clears local state and stops polling override
  const disconnectWallet = useCallback(() => {
    localStorage.setItem("wallet_disconnected", "true");
    setManuallyDisconnected(true);
    setPublicKey(null);
    setWalletError(null);
    setTxError(null);
    setTxSuccess(null);
  }, []);

  // Get XLM balance of connected wallet
  const getXLMBalance = useCallback(async (address) => {
    try {
      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${address || publicKey}`
      );
      const data = await response.json();
      const balance = data.balances?.find((b) => b.asset_type === "native");
      return balance ? balance.balance : "0";
    } catch (err) {
      console.error("getXLMBalance error:", err);
      return "0";
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      getXLMBalance(publicKey).then(setXlmBalance);
    } else {
      setXlmBalance(null);
    }
  }, [publicKey]);

  // Read data from contract (no wallet needed, no fees)
  //
  // Usage:
  //   const notes = await readContract("get_notes")
  //   const item  = await readContract("get_item", [
  //     nativeToScVal(id, { type: "u64" })
  //   ])
  const readContract = useCallback(async (functionName, args = []) => {
    try {
      const keypair = Keypair.random();
      const account = new Account(keypair.publicKey(), "0");

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK,
      })
        .addOperation(contract.call(functionName, ...args))
        .setTimeout(30)
        .build();

      const result = await server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(result)) throw new Error(result.error);

      return scValToNative(result.result?.retval);
    } catch (err) {
      console.error(`readContract(${functionName}) error:`, err);
      throw err;
    }
  }, []);

  // Write data to contract (requires wallet, triggers Freighter popup)
  //
  // Usage:
  //   await writeContract("create_note", [
  //     nativeToScVal("Title",   { type: "string" }),
  //     nativeToScVal("Content", { type: "string" }),
  //   ])
  //   await writeContract("delete_note", [
  //     nativeToScVal(id, { type: "u64" })
  //   ])
  const writeContract = useCallback(async (functionName, args = []) => {
    if (!publicKey) throw new Error("Wallet not connected");
    setTxLoading(true);
    setTxError(null);
    setTxSuccess(null);
    try {
      const account = await server.getAccount(publicKey);
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK,
      })
        .addOperation(contract.call(functionName, ...args))
        .setTimeout(30)
        .build();

      const simResult = await server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(simResult)) throw new Error(simResult.error);

      const preparedTx = rpc.assembleTransaction(tx, simResult).build();

      const signResult = await signTransaction(preparedTx.toXDR(), {
        network: "TESTNET",
        networkPassphrase: NETWORK,
      });
      if (signResult.error) throw new Error(signResult.error);

      const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK);
      const submitResult = await server.sendTransaction(signedTx);
      if (submitResult.status === "ERROR") throw new Error("Submit failed: " + submitResult.errorResult);

      const confirmation = await waitConfirmation(submitResult.hash);
      setTxSuccess(confirmation.hash);
      return confirmation;
    } catch (err) {
      setTxError(err.message);
      throw err;
    } finally {
      setTxLoading(false);
    }
  }, [publicKey]);

  // Poll for transaction confirmation
  async function waitConfirmation(hash, maxTry = 20) {
    for (let i = 0; i < maxTry; i++) {
      const res = await server.getTransaction(hash);
      if (res.status === "SUCCESS") return { success: true, hash };
      if (res.status === "FAILED") throw new Error("Transaction failed: " + hash);
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Transaction confirmation timeout");
  }

  return {
    publicKey,
    isWalletConnected,
    freighterInstalled,
    walletLoading,
    walletError,
    xlmBalance,
    getXLMBalance,
    connectWallet,
    disconnectWallet,
    readContract,
    writeContract,
    txLoading,
    txError,
    txSuccess,
  };
}