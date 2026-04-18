#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, NotesContractClient<'static>, Address, Address) {
	let env = Env::default();
	env.mock_all_auths();

	let contract_id = env.register(NotesContract, ());
	let client = NotesContractClient::new(&env, &contract_id);
	let issuer = Address::generate(&env);
	let owner = Address::generate(&env);
	(env, client, issuer, owner)
}

#[test]
fn issue_and_verify_certificate() {
	let (env, client, issuer, owner) = setup();
	let hash = String::from_str(
		&env,
		"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	);
	let doc_name = String::from_str(&env, "Kartu Mahasiswa");
	let note = String::from_str(&env, "Diterbitkan untuk validasi data");

	let id = client.issue_certificate(&issuer, &owner, &hash, &doc_name, &note);
	let certificate = client.verify_by_hash(&hash).unwrap();

	assert_eq!(id, 1);
	assert_eq!(certificate.id, id);
	assert_eq!(certificate.hash_hex, hash);
	assert_eq!(certificate.doc_name, doc_name);
	assert_eq!(certificate.issuer, issuer);
	assert_eq!(certificate.owner, owner);
	assert!(!certificate.revoked);
}

#[test]
fn get_by_owner_and_issuer_returns_records() {
	let (env, client, issuer, owner) = setup();

	let hash_1 = String::from_str(
		&env,
		"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
	);
	let hash_2 = String::from_str(
		&env,
		"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
	);

	client.issue_certificate(
		&issuer,
		&owner,
		&hash_1,
		&String::from_str(&env, "Ijazah S1"),
		&String::from_str(&env, "Batch 2026"),
	);
	client.issue_certificate(
		&issuer,
		&owner,
		&hash_2,
		&String::from_str(&env, "Sertifikat Kompetensi"),
		&String::from_str(&env, "Asli"),
	);

	let owner_records = client.get_by_owner(&owner);
	let issuer_records = client.get_by_issuer(&issuer);

	assert_eq!(owner_records.len(), 2);
	assert_eq!(issuer_records.len(), 2);
}

#[test]
fn revoke_certificate_updates_status() {
	let (env, client, issuer, owner) = setup();
	let hash = String::from_str(
		&env,
		"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
	);

	let id = client.issue_certificate(
		&issuer,
		&owner,
		&hash,
		&String::from_str(&env, "Surat Kerja"),
		&String::from_str(&env, "Digunakan untuk onboarding"),
	);

	let revoked = client.revoke_certificate(&issuer, &id, &String::from_str(&env, "Kedaluwarsa"));
	assert!(revoked);

	let cert = client.get_certificate(&id).unwrap();
	assert!(cert.revoked);
	assert_eq!(cert.revoke_reason, String::from_str(&env, "Kedaluwarsa"));
}

#[test]
#[should_panic(expected = "hash already registered")]
fn duplicate_hash_should_fail() {
	let (env, client, issuer, owner) = setup();
	let hash = String::from_str(
		&env,
		"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
	);

	client.issue_certificate(
		&issuer,
		&owner,
		&hash,
		&String::from_str(&env, "Doc 1"),
		&String::from_str(&env, "First"),
	);

	client.issue_certificate(
		&issuer,
		&owner,
		&hash,
		&String::from_str(&env, "Doc 2"),
		&String::from_str(&env, "Second"),
	);
}

#[test]
#[should_panic(expected = "only issuer can revoke")]
fn revoke_by_other_wallet_should_fail() {
	let (env, client, issuer, owner) = setup();
	let other_issuer = Address::generate(&env);
	let hash = String::from_str(
		&env,
		"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
	);

	let id = client.issue_certificate(
		&issuer,
		&owner,
		&hash,
		&String::from_str(&env, "Kontrak Kerja"),
		&String::from_str(&env, "Untuk verifikasi HR"),
	);

	client.revoke_certificate(&other_issuer, &id, &String::from_str(&env, "Tidak berwenang"));
}
