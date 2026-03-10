Key Usage apprach

- HAIP does not allow to use self signed certificates to sign an attestation
- it should be possible to rotate keys and their certificates. The rotation should have no impact on the reference of the usage
- to reduce the amount of keys in a trust list, the idea would be to include an intermediary ca into the trust list, that is used to issue the signing certificates. This is not required for access certificates, but primarily for singing and revocation list management.
- there needs to be some kind of config that would allow me to define an intermediary cert, that will rotate the underlying signing keys based on a defined rotation strategy. At one time I only need one active signing key.
- the signing key that was used will be embedded into the credential, so there is no need to host it. The intermediary certificate will be linked in the trust list.
