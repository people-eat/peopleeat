# peopleeat Grafana dashboards

Versioned dashboards for `https://grafana.people-eat.com` (folder UID `peopleeat`).

| File                          | Dashboard UID            |
| ----------------------------- | ------------------------ |
| `peopleeat-overview.json`     | `peopleeat-overview`     |
| `peopleeat-graphql.json`      | `peopleeat-graphql`      |
| `peopleeat-jobs-ingress.json` | `peopleeat-jobs-ingress` |
| `peopleeat-client.json`       | `peopleeat-client`       |

## Regenerate

```bash
node ops/grafana/dashboards/generate.mjs
```

## Push

Import each JSON in Grafana (Dashboards → New → Import) into folder **peopleeat**, or `POST /api/dashboards/db` with
`folderUid: "peopleeat"` and `overwrite: true`. Datasource UIDs must be `prometheus` and `tempo` (as on Coolify).

See [docs/architecture/observability.md](../../../docs/architecture/observability.md#d-grafana-apm-dashboards).
