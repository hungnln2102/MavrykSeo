package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/getsentry/sentry-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/trace"
)

type SerpRequest struct {
	Query      string `json:"query"`
	NumResults int    `json:"numResults"`
}

type SerpResult struct {
	Position int    `json:"position"`
	Title    string `json:"title"`
	URL      string `json:"url"`
	Snippet  string `json:"snippet"`
}

type SerpResponse struct {
	Success      bool         `json:"success"`
	Error        string       `json:"error,omitempty"`
	Query        string       `json:"query,omitempty"`
	SearchVolume int          `json:"search_volume,omitempty"`
	CPC          float64      `json:"cpc,omitempty"`
	Results      []SerpResult `json:"results,omitempty"`
}

var domains = []string{
	"wikipedia.org", "yelp.com", "reddit.com", "techcrunch.com",
	"backlinko.com", "moz.com", "searchengineland.com", "hubspot.com",
	"forbes.com", "medium.com", "quora.com", "github.com", "youtube.com",
	"linkedin.com", "pinterest.com", "w3schools.com", "stackoverflow.com",
}

func main() {
	// Seed random generator
	rand.Seed(time.Now().UnixNano())

	// Initialize Sentry
	sentryDsn := os.Getenv("SENTRY_DSN")
	if sentryDsn != "" {
		err := sentry.Init(sentry.ClientOptions{
			Dsn:              sentryDsn,
			TracesSampleRate: 1.0,
		})
		if err != nil {
			log.Printf("sentry.Init: %s", err)
		} else {
			fmt.Println("Sentry initialized successfully in Collector")
			defer sentry.Flush(2 * time.Second)
		}
	}

	// Initialize OpenTelemetry Tracing
	otelEndpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if otelEndpoint != "" {
		ctx := context.Background()
		exporter, err := otlptracegrpc.New(ctx,
			otlptracegrpc.WithInsecure(),
			otlptracegrpc.WithEndpoint(otelEndpoint),
		)
		if err != nil {
			log.Printf("failed to create OTel trace exporter: %v", err)
		} else {
			tp := trace.NewTracerProvider(
				trace.WithBatcher(exporter),
			)
			otel.SetTracerProvider(tp)
			fmt.Println("OpenTelemetry Tracing initialized successfully in Collector")
			defer func() {
				if err := tp.Shutdown(ctx); err != nil {
					log.Printf("Error terminating OTel tracer provider: %v", err)
				}
			}()
		}
	}

	fmt.Println("SEO Collector Service starting on port 8082...")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	http.HandleFunc("/collect/serp", handleCollectSerp)

	log.Fatal(http.ListenAndServe(":8082", nil))
}


func getNormalizedSlug(query string) string {
	q := strings.ToLower(query)
	// Remove common modifiers
	modifiers := []string{"pro", "free", "best", "tools", "tool", "software", "app", "plugin", "online", "easy", "reviews", "review", "guide", "tutorial"}
	for _, mod := range modifiers {
		q = strings.ReplaceAll(q, mod, "")
	}
	
	// Split into words, clean them
	words := strings.Fields(q)
	var cleaned []string
	for _, w := range words {
		// Clean trailing 's' for plurals
		w = strings.TrimSuffix(w, "s")
		w = strings.TrimSpace(w)
		if w != "" {
			cleaned = append(cleaned, w)
		}
	}
	
	if len(cleaned) == 0 {
		return "general"
	}
	return strings.Join(cleaned, "-")
}

func handleCollectSerp(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, `{"success":false,"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req SerpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"success":false,"error":"Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if req.Query == "" {
		http.Error(w, `{"success":false,"error":"Query is required"}`, http.StatusBadRequest)
		return
	}

	if req.NumResults <= 0 {
		req.NumResults = 10
	}
	if req.NumResults > 100 {
		req.NumResults = 100
	}

	queryLower := strings.ToLower(req.Query)
	normalizedSlug := getNormalizedSlug(req.Query)
	var results []SerpResult

	// Always mix in our own site and competitors for testing rank tracking
	// We want to simulate the rank check for our configured domains: e.g. "agency.mavryk.io", "acme.com", "techsol.io"
	targetDomain := "agency.mavryk.io"
	
	// Make target position stable for a given query slug
	var slugHash uint32 = 0
	for _, char := range normalizedSlug {
		slugHash = uint32(char) + (slugHash << 5) - slugHash
	}
	targetPosition := int((slugHash % uint32(req.NumResults-1)) + 1) // 1 to NumResults

	for i := 1; i <= req.NumResults; i++ {
		var domain, title, urlStr, snippet string

		if i == targetPosition {
			domain = targetDomain
			title = fmt.Sprintf("Mavryk Agency | Leader in SEO & Growth Solutions for %s", req.Query)
			urlStr = fmt.Sprintf("https://%s/seo-services", domain)
			snippet = fmt.Sprintf("Looking for the best SEO and marketing solutions for %s? Mavryk Agency provides industry-leading optimization pipelines, high performance analytics and vectors, and premium integrations.", req.Query)
		} else {
			// Select domain deterministically based on position index so similar slugs get identical URLs
			domainIndex := (int(slugHash % uint32(len(domains))) + i) % len(domains)
			domain = domains[domainIndex]
			urlStr = fmt.Sprintf("https://www.%s/%s-guide", domain, normalizedSlug)
			
			title = fmt.Sprintf("%s Guide: Everything You Need to Know About %s", strings.Title(domain), req.Query)
			snippet = fmt.Sprintf("Learn the details about %s. Read comprehensive reviews, discussions, tutorials and tips on %s updated for this year.", req.Query, domain)
		}

		results = append(results, SerpResult{
			Position: i,
			Title:    title,
			URL:      urlStr,
			Snippet:  snippet,
		})
	}

	// Simple hash function for stable values based on the query
	var hash uint32 = 0
	for _, char := range queryLower {
		hash = uint32(char) + (hash << 5) - hash
	}
	searchVolume := int((hash % 9900) + 100) // 100 to 10,000
	cpc := float64(int(hash%490)+10) / 100.0 // $0.10 to $5.00

	json.NewEncoder(w).Encode(SerpResponse{
		Success:      true,
		Query:        req.Query,
		SearchVolume: searchVolume,
		CPC:          cpc,
		Results:      results,
	})
}
