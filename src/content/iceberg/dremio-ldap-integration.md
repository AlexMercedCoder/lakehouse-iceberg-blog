---
term: "Dremio LDAP Integration"
description: "The configuration of Dremio authentication to validate user credentials and map groups against LDAP or Active Directory servers."
category: "Dremio-Specific Engine & Optimizations"
relatedTerms:
  - "dremio-coordinator-node"
  - "iceberg-access-control"
keywords:
  - dremio ldap
  - dremio active directory
  - dremio authentication
lastUpdated: 2026-05-29
---

## Dremio LDAP Integration

**Dremio LDAP Integration** enables enterprise administrators to delegate user authentication and group synchronization to Lightweight Directory Access Protocol (LDAP) servers or Microsoft Active Directory (AD). Integrating Dremio with an directory service ensures that database developers, data scientists, and business users can authenticate using their corporate credentials.

### Configuration Workflow

To configure authentication, administrators must modify files on the coordinator nodes. The process requires editing the main configuration file and creating a supporting connection specification file.

#### 1. Configuring dremio.conf

In `dremio.conf`, the authentication type must be set to `ldap`, and the location of the directory configuration file must be specified:

```hocon
services: {
  coordinator.enabled: true,
  coordinator.web.auth.type: "ldap",
  ldap_config: "ad.json"
}
```

#### 2. Specifying Connection Parameters in ad.json

The `ad.json` file contains parameters for establishing connections, binding credentials, and performing search queries for users and groups:

```json
{
  "connectionMode": "LDAPS",
  "servers": [
    {
      "hostname": "ad.example.com",
      "port": 636
    }
  ],
  "bindUser": "cn=dremio-svc,ou=ServiceAccounts,dc=example,dc=com",
  "bindPassword": "encrypted_password_string",
  "userSearchBase": "ou=Users,dc=example,dc=com",
  "userSearchFilter": "(sAMAccountName={0})",
  "groupSearchBase": "ou=Groups,dc=example,dc=com"
}
```

### Password Encryption

To secure the bind service account credentials, administrators must never store passwords in plaintext inside configuration files. Dremio provides a command-line tool to encrypt the password:

```bash
/* Run the encryption utility on a Dremio coordinator node */
bin/dremio-admin encrypt "plaintext_password"
```

The resulting secure ciphertext is copied directly into the `bindPassword` property inside the connection JSON file. After restarting the coordinator services, Dremio utilizes this identity to search the directory and validate incoming login requests.
