# Logging & Telemetry Configuration

The backend now uses a shared [`pino`](https://github.com/pinojs/pino) logger that powers
startup diagnostics, development utilities, and the simulation telemetry event bus. Logs are
structured JSON by default so they can be indexed easily or piped through tooling such as
`pino-pretty`, `jq`, or your observability stack of choice.

## Environment Variables

| Variable                    | Description                                                                                                     | Default                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `WEEBBREED_LOG_LEVEL`       | Overrides the logger level. Accepts `trace`, `debug`, `info`, `warning`, `warn`, `error`, `fatal`, or `silent`. | `debug` in development, `info` in production |
| `WEEBBREED_LOG_DESTINATION` | Controls where logs are written. Use `stdout`, `stderr`, or `file:/absolute/or/relative/path`.                  | `stdout`                                     |

If `WEEBBREED_LOG_LEVEL` is not provided the logger falls back to `LOG_LEVEL`, allowing the
service to integrate with existing environment conventions.

When `WEEBBREED_LOG_DESTINATION` starts with `file:` the path is resolved relative to the current
working directory (unless an absolute path is provided). Parent directories are created on demand,
so `file:./logs/backend.log` will create the `logs` folder if it is missing.

## Sample `.env`

```dotenv
# Verbose logging with per-tick telemetry details
WEEBBREED_LOG_LEVEL=debug

# Write structured logs to logs/backend.log (relative to the project root)
WEEBBREED_LOG_DESTINATION=file:./logs/backend.log
```

To see a human-readable stream in development, pipe the output through `pino-pretty`:

```bash
pnpm --filter @weebbreed/backend dev | pnpm exec pino-pretty
```

## Telemetry Context

Every event emitted via `runtime/eventBus` is mirrored to the logger with structured context
including the event `type`, originating `tick`, severity (`level`), timestamp, and any tags. UI
stream fan-out packets (Socket.IO, SSE) are also logged at `debug`, exposing batch sizes and tick
information for downstream consumers without disrupting the broadcast path.
