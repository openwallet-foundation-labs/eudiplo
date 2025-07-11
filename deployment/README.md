# Deployments

In this directory there are multiple deployment configurations for EUDIPLO.

Before running any of these, make sure you have the necessary environment, you
find the required ones in the `example.env` file.

## Minimal

Starting just the EUDIPLO service, this is the simplest way to get started. It
uses sqlite for storage and manages the keys in the filesystem. Good for
development and testing, but not recommended for production.

## Full

This deployment uses a PostgreSQL database and Hashicorp Vault for user
management.

Please check the documentation how to run Vault in production. Maybe this script
can help: https://github.com/ahmetkaftan/docker-vault or
https://gist.github.com/Mishco/b47b341f852c5934cf736870f0b5da81
