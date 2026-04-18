#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Certificate {
    pub id: u64,
    pub hash_hex: String,
    pub doc_name: String,
    pub issuer: Address,
    pub owner: Address,
    pub issued_at: u64,
    pub revoked: bool,
    pub revoked_at: u64,
    pub revoke_reason: String,
    pub note: String,
}

#[contracttype]
#[derive(Clone, Debug)]
pub enum DataKey {
    Counter,
    CertById(u64),
    IdByHash(String),
    OwnerCerts(Address),
    IssuerCerts(Address),
}

#[contract]
pub struct NotesContract;

#[contractimpl]
impl NotesContract {
    pub fn issue_certificate(
        env: Env,
        issuer: Address,
        owner: Address,
        hash_hex: String,
        doc_name: String,
        note: String,
    ) -> u64 {
        issuer.require_auth();

        if hash_hex.len() != 64 {
            panic!("invalid hash length");
        }

        let by_hash_key = DataKey::IdByHash(hash_hex.clone());
        if env.storage().instance().has(&by_hash_key) {
            panic!("hash already registered");
        }

        let id = next_id(&env);
        let cert = Certificate {
            id,
            hash_hex: hash_hex.clone(),
            doc_name,
            issuer: issuer.clone(),
            owner: owner.clone(),
            issued_at: env.ledger().timestamp(),
            revoked: false,
            revoked_at: 0,
            revoke_reason: String::from_str(&env, ""),
            note,
        };

        env.storage().instance().set(&DataKey::CertById(id), &cert);
        env.storage().instance().set(&by_hash_key, &id);

        let mut owner_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::OwnerCerts(owner.clone()))
            .unwrap_or(Vec::new(&env));
        owner_ids.push_back(id);
        env.storage()
            .instance()
            .set(&DataKey::OwnerCerts(owner), &owner_ids);

        let mut issuer_ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::IssuerCerts(issuer.clone()))
            .unwrap_or(Vec::new(&env));
        issuer_ids.push_back(id);
        env.storage()
            .instance()
            .set(&DataKey::IssuerCerts(issuer), &issuer_ids);

        id
    }

    pub fn verify_by_hash(env: Env, hash_hex: String) -> Option<Certificate> {
        let id = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::IdByHash(hash_hex));
        match id {
            Some(value) => env.storage().instance().get(&DataKey::CertById(value)),
            None => None,
        }
    }

    pub fn get_certificate(env: Env, id: u64) -> Option<Certificate> {
        env.storage().instance().get(&DataKey::CertById(id))
    }

    pub fn get_by_owner(env: Env, owner: Address) -> Vec<Certificate> {
        let ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::OwnerCerts(owner))
            .unwrap_or(Vec::new(&env));
        collect_certificates(&env, ids)
    }

    pub fn get_by_issuer(env: Env, issuer: Address) -> Vec<Certificate> {
        let ids: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::IssuerCerts(issuer))
            .unwrap_or(Vec::new(&env));
        collect_certificates(&env, ids)
    }

    pub fn revoke_certificate(env: Env, issuer: Address, id: u64, reason: String) -> bool {
        issuer.require_auth();

        let mut cert: Certificate = env
            .storage()
            .instance()
            .get(&DataKey::CertById(id))
            .unwrap_or_else(|| panic!("certificate not found"));

        if cert.issuer != issuer {
            panic!("only issuer can revoke");
        }

        if cert.revoked {
            return false;
        }

        cert.revoked = true;
        cert.revoked_at = env.ledger().timestamp();
        cert.revoke_reason = reason;
        env.storage().instance().set(&DataKey::CertById(id), &cert);
        true
    }
}

fn next_id(env: &Env) -> u64 {
    let current: u64 = env
        .storage()
        .instance()
        .get(&DataKey::Counter)
        .unwrap_or(0);
    let next = current + 1;
    env.storage().instance().set(&DataKey::Counter, &next);
    next
}

fn collect_certificates(env: &Env, ids: Vec<u64>) -> Vec<Certificate> {
    let mut list = Vec::new(env);
    for i in 0..ids.len() {
        let id = ids.get(i).unwrap();
        if let Some(cert) = env.storage().instance().get(&DataKey::CertById(id)) {
            list.push_back(cert);
        }
    }
    list
}

mod test;
