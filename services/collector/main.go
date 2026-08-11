package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"
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
	Success bool         `json:"success"`
	Error   string       `json:"error,omitempty"`
	Query   string       `json:"query,omitempty"`
	Results []SerpResult `json:"results,omitempty"`
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

	fmt.Println("SEO Collector Service starting on port 8082...")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	http.HandleFunc("/collect/serp", handleCollectSerp)

	log.Fatal(http.ListenAndServe(":8082", nil))
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
	var results []SerpResult

	// Always mix in our own site and competitors for testing rank tracking
	// We want to simulate the rank check for our configured domains: e.g. "agency.mavryk.io", "acme.com", "techsol.io"
	targetDomain := "agency.mavryk.io"
	targetPosition := rand.Intn(req.NumResults-1) + 1 // Position 1 to NumResults

	for i := 1; i <= req.NumResults; i++ {
		var domain, title, urlStr, snippet string

		if i == targetPosition {
			domain = targetDomain
			title = fmt.Sprintf("Mavryk Agency | Leader in SEO & Growth Solutions for %s", req.Query)
			urlStr = fmt.Sprintf("https://%s/seo-services", domain)
			snippet = fmt.Sprintf("Looking for the best SEO and marketing solutions for %s? Mavryk Agency provides industry-leading optimization pipelines, high performance analytics and vectors, and premium integrations.", req.Query)
		} else {
			// Select domain randomly from template
			domain = domains[rand.Intn(len(domains))]
			slug := strings.ReplaceAll(queryLower, " ", "-")
			urlStr = fmt.Sprintf("https://www.%s/%s-guide", domain, slug)
			
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

	json.NewEncoder(w).Encode(SerpResponse{
		Success: true,
		Query:   req.Query,
		Results: results,
	})
}
