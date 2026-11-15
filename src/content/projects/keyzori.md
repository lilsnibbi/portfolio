## Licensing, on your own terms.

Keyzori is an open-source, self-hosted license management project for software products. It's built around an HTTP API, so licensing can fit into the software that needs it.

I'm currently rebuilding version 2. It's still in development, and the code is available to explore on GitHub.

## The building blocks.

The v2 API brings together a few of the core controls that software licensing needs:

- **Expiry.** Time-based limits for licenses.
- **Usage meters.** Track the use of a licensed product.
- **Device and IP limits.** Control where a license can be used.

> **Project status**
>
> Version 2 is a work in progress. The development branch is the best place to follow the implementation as it changes.

## A backend-focused stack.

The project uses TypeScript and Bun, with PostgreSQL and Redis behind the HTTP API. It's the kind of backend and developer-tooling work I enjoy: making a useful system out of a set of well-defined pieces.

A software product connects to the Keyzori HTTP API, backed by PostgreSQL and Redis

```text
Software product
↓
Keyzori HTTP API
↓
PostgreSQL + Redis
```

## Built in the open.

Keyzori is open source and self-hosted. You can read the code, explore the v2 branch, and follow the rebuild as it develops.

The repository and development links at the top of this page lead directly to the project.
