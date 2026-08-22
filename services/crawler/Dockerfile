FROM golang:1.25-alpine AS builder
WORKDIR /src/services/crawler
COPY services/crawler/go.mod services/crawler/go.sum ./
RUN go mod download
COPY services/crawler/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags=-w -o crawler main.go

FROM alpine:3.19 AS runner
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /src/services/crawler/crawler ./crawler
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 8081
CMD /app/crawler
