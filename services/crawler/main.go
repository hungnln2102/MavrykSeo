package main

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/temoto/robotstxt"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/sdk/trace"
	"golang.org/x/net/html"
)

const (
	maxRequestBodyBytes            int64 = 8 * 1024
	maxCrawlBodyBytes              int64 = 5 * 1024 * 1024
	maxSitemapBodyBytes            int64 = 10 * 1024 * 1024
	defaultCircuitFailureThreshold       = 5
	defaultCircuitCooldown               = time.Minute
)

var privateIPBlocks []*net.IPNet

type circuitState struct {
	failures int
	openedAt time.Time
}

type outboundCircuitBreaker struct {
	mu        sync.Mutex
	states    map[string]circuitState
	threshold int
	cooldown  time.Duration
	now       func() time.Time
}

func newOutboundCircuitBreaker(threshold int, cooldown time.Duration) *outboundCircuitBreaker {
	return &outboundCircuitBreaker{
		states:    make(map[string]circuitState),
		threshold: threshold,
		cooldown:  cooldown,
		now:       time.Now,
	}
}

func (breaker *outboundCircuitBreaker) allow(hostname string) bool {
	breaker.mu.Lock()
	defer breaker.mu.Unlock()

	state, exists := breaker.states[hostname]
	if !exists || state.openedAt.IsZero() {
		return true
	}
	if breaker.now().Sub(state.openedAt) >= breaker.cooldown {
		delete(breaker.states, hostname)
		return true
	}
	return false
}

func (breaker *outboundCircuitBreaker) recordFailure(hostname string) {
	breaker.mu.Lock()
	defer breaker.mu.Unlock()

	state := breaker.states[hostname]
	state.failures++
	if state.failures >= breaker.threshold && state.openedAt.IsZero() {
		state.openedAt = breaker.now()
	}
	breaker.states[hostname] = state
}

func (breaker *outboundCircuitBreaker) recordSuccess(hostname string) {
	breaker.mu.Lock()
	defer breaker.mu.Unlock()
	delete(breaker.states, hostname)
}

func circuitFailureThreshold() int {
	value, err := strconv.Atoi(os.Getenv("CRAWLER_CIRCUIT_FAILURE_THRESHOLD"))
	if err != nil || value < 1 {
		return defaultCircuitFailureThreshold
	}
	return value
}

func circuitCooldown() time.Duration {
	value, err := time.ParseDuration(os.Getenv("CRAWLER_CIRCUIT_COOLDOWN"))
	if err != nil || value <= 0 {
		return defaultCircuitCooldown
	}
	return value
}

var outboundBreaker = newOutboundCircuitBreaker(circuitFailureThreshold(), circuitCooldown())

func init() {
	for _, cidr := range []string{
		"10.0.0.0/8",     // RFC 1918
		"172.16.0.0/12",  // RFC 1918
		"192.168.0.0/16", // RFC 1918
		"100.64.0.0/10",  // RFC 6598 (Carrier-grade NAT)
		"198.18.0.0/15",  // RFC 2544
		"169.254.0.0/16", // RFC 3927 (Link-local)
		"127.0.0.0/8",    // Loopback
		"fc00::/7",       // Unique Local IPv6
		"fe80::/10",      // Link-local IPv6
		"::1/128",        // Loopback IPv6
	} {
		_, block, err := net.ParseCIDR(cidr)
		if err == nil {
			privateIPBlocks = append(privateIPBlocks, block)
		}
	}
}

// isForbiddenIP returns true if the IP matches any private/forbidden range.
func isForbiddenIP(ip net.IP) bool {
	if ip.IsUnspecified() || ip.IsLoopback() || ip.IsMulticast() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return true
	}
	for _, block := range privateIPBlocks {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

func readLimitedBody(body io.Reader, maxBytes int64) ([]byte, error) {
	bodyBytes, err := io.ReadAll(io.LimitReader(body, maxBytes+1))
	if err != nil {
		return nil, err
	}

	if int64(len(bodyBytes)) > maxBytes {
		return nil, fmt.Errorf("response body exceeds configured limit")
	}

	return bodyBytes, nil
}
func configuredOutboundAllowlist() []string {
	raw := os.Getenv("CRAWLER_OUTBOUND_ALLOWLIST")
	if raw == "" {
		return nil
	}

	entries := strings.Split(raw, ",")
	allowlist := make([]string, 0, len(entries))
	for _, entry := range entries {
		entry = strings.TrimSpace(strings.ToLower(entry))
		if entry != "" {
			allowlist = append(allowlist, entry)
		}
	}
	return allowlist
}

func isAllowedOutboundHost(hostname string) bool {
	allowlist := configuredOutboundAllowlist()
	if len(allowlist) == 0 {
		return os.Getenv("NODE_ENV") != "production"
	}

	hostname = strings.ToLower(hostname)
	for _, entry := range allowlist {
		if entry == hostname {
			return true
		}
		if strings.HasPrefix(entry, "*.") && strings.HasSuffix(hostname, strings.TrimPrefix(entry, "*")) {
			return true
		}
	}
	return false
}

func safeOutboundHost(rawURL string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Hostname() == "" {
		return "unknown"
	}
	return strings.ToLower(parsed.Hostname())
}

func logOutboundEvent(event string, hostname string, reason string) {
	log.Printf("outbound_event event=%s host=%s reason=%s", event, hostname, reason)
}

func outboundFailureReason(err error) string {
	if errors.Is(err, context.DeadlineExceeded) {
		return "timeout"
	}
	var networkError net.Error
	if errors.As(err, &networkError) && networkError.Timeout() {
		return "timeout"
	}
	return "transport"
}

func validateOutboundURL(rawURL string) (*url.URL, error) {
	parsed, err := url.ParseRequestURI(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid outbound URL")
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("outbound URL scheme must be HTTP or HTTPS")
	}

	if parsed.Hostname() == "" {
		return nil, fmt.Errorf("outbound URL host is required")
	}

	hostname := strings.ToLower(parsed.Hostname())
	if hostname == "localhost" || strings.HasSuffix(hostname, ".localhost") {
		return nil, fmt.Errorf("SSRF protection: localhost targets are not allowed")
	}

	if !isAllowedOutboundHost(hostname) {
		return nil, fmt.Errorf("outbound URL host is not permitted by policy")
	}

	if parsed.User != nil {
		return nil, fmt.Errorf("outbound URL credentials are not allowed")
	}

	if ip := net.ParseIP(parsed.Hostname()); ip != nil && isForbiddenIP(ip) {
		return nil, fmt.Errorf("SSRF protection: forbidden outbound IP")
	}

	return parsed, nil
}

// safeDialContext resolves hostnames and blocks access to private IPs.
func safeDialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}

	ips, err := net.DefaultResolver.LookupIP(ctx, "ip", host)
	if err != nil {
		return nil, err
	}

	for _, ip := range ips {
		if isForbiddenIP(ip) {
			return nil, fmt.Errorf("SSRF protection: access to forbidden IP %s is blocked", ip)
		}
	}

	if len(ips) == 0 {
		return nil, fmt.Errorf("unable to resolve IP address for host: %s", host)
	}

	var dialer net.Dialer
	return dialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
}

// safeCheckRedirect blocks redirects to private IP addresses.
func safeCheckRedirect(req *http.Request, via []*http.Request) error {
	if len(via) >= 10 {
		return fmt.Errorf("too many redirects")
	}

	if _, err := validateOutboundURL(req.URL.String()); err != nil {
		return fmt.Errorf("redirect blocked: %w", err)
	}

	host := req.URL.Hostname()
	ips, err := net.LookupIP(host)
	if err != nil {
		return fmt.Errorf("redirect SSRF check: lookup failed: %v", err)
	}

	for _, ip := range ips {
		if isForbiddenIP(ip) {
			return fmt.Errorf("redirect SSRF protection: target %s resolves to forbidden IP %s", host, ip)
		}
	}

	return nil
}

// buildSafeClient constructs an http.Client with SSRF boundaries.
func buildSafeClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			DialContext:           safeDialContext,
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          10,
			IdleConnTimeout:       30 * time.Second,
			TLSHandshakeTimeout:   5 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		},
		CheckRedirect: safeCheckRedirect,
	}
}

type CrawlRequest struct {
	URL       string `json:"url"`
	UserAgent string `json:"userAgent"`
}

type CrawlResponse struct {
	Success             bool     `json:"success"`
	Error               string   `json:"error,omitempty"`
	URL                 string   `json:"url,omitempty"`
	StatusCode          int      `json:"statusCode,omitempty"`
	Title               string   `json:"title,omitempty"`
	MetaDescription     string   `json:"metaDescription,omitempty"`
	CanonicalURL        string   `json:"canonicalUrl,omitempty"`
	H1                  []string `json:"h1,omitempty"`
	H2                  []string `json:"h2,omitempty"`
	H3                  []string `json:"h3,omitempty"`
	H4                  []string `json:"h4,omitempty"`
	H5                  []string `json:"h5,omitempty"`
	H6                  []string `json:"h6,omitempty"`
	WordCount           int      `json:"wordCount,omitempty"`
	Links               []string `json:"links,omitempty"`
	RawHTML             string   `json:"rawHtml,omitempty"`
	LoadTimeMs          int64    `json:"loadTimeMs,omitempty"`
	RedirectChain       []string `json:"redirectChain,omitempty"`
	RedirectStatusCodes []int    `json:"redirectStatusCodes,omitempty"`
	RobotsMeta          string   `json:"robotsMeta,omitempty"`
}

type SitemapRequest struct {
	URL string `json:"url"`
}

type SitemapResponse struct {
	Success bool     `json:"success"`
	Error   string   `json:"error,omitempty"`
	URLs    []string `json:"urls,omitempty"`
}

// SitemapXML structs for parsing sitemap and sitemapindex
type SitemapIndex struct {
	XMLName  xml.Name `xml:"sitemapindex"`
	Sitemaps []struct {
		Loc string `xml:"loc"`
	} `xml:"sitemap"`
}

type URLSet struct {
	XMLName xml.Name `xml:"urlset"`
	URLs    []struct {
		Loc string `xml:"loc"`
	} `xml:"url"`
}

func main() {
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
			fmt.Println("Sentry initialized successfully in Crawler")
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
			fmt.Println("OpenTelemetry Tracing initialized successfully in Crawler")
			defer func() {
				if err := tp.Shutdown(ctx); err != nil {
					log.Printf("Error terminating OTel tracer provider: %v", err)
				}
			}()
		}
	}

	fmt.Println("SEO Crawler Service starting on port 8081...")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	http.HandleFunc("/crawl", handleCrawl)
	http.HandleFunc("/sitemap", handleSitemap)

	server := &http.Server{
		Addr:              ":8081",
		Handler:           http.DefaultServeMux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       30 * time.Second,
	}

	log.Fatal(server.ListenAndServe())
}

func handleCrawl(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, `{"success":false,"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	var req CrawlRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"success":false,"error":"Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, `{"success":false,"error":"URL is required"}`, http.StatusBadRequest)
		return
	}

	parsedTarget, err := validateOutboundURL(req.URL)
	if err != nil {
		logOutboundEvent("denied", safeOutboundHost(req.URL), "policy")
		json.NewEncoder(w).Encode(CrawlResponse{Success: false, Error: "outbound request denied"})
		return
	}

	hostname := strings.ToLower(parsedTarget.Hostname())
	if !outboundBreaker.allow(hostname) {
		logOutboundEvent("denied", hostname, "circuit_open")
		json.NewEncoder(w).Encode(CrawlResponse{Success: false, Error: "outbound request temporarily unavailable"})
		return
	}

	// 1. Check robots.txt
	userAgent := req.UserAgent
	if userAgent == "" {
		userAgent = "MavrykBot/1.0"
	}

	client := buildSafeClient(15 * time.Second)

	robotsURL := fmt.Sprintf("%s://%s/robots.txt", parsedTarget.Scheme, parsedTarget.Host)
	robotsResp, err := client.Get(robotsURL)
	if err == nil && robotsResp.StatusCode == http.StatusOK {
		defer robotsResp.Body.Close()
		robotsData, err := robotstxt.FromResponse(robotsResp)
		if err == nil {
			group := robotsData.FindGroup(userAgent)
			if !group.Test(parsedTarget.Path) {
				json.NewEncoder(w).Encode(CrawlResponse{
					Success: false,
					Error:   "crawling blocked by robots.txt rules",
				})
				return
			}
		}
	}

	// 2. Perform actual crawl
	start := time.Now()
	crawlReq, err := http.NewRequestWithContext(r.Context(), "GET", req.URL, nil)
	if err != nil {
		json.NewEncoder(w).Encode(CrawlResponse{Success: false, Error: err.Error()})
		return
	}
	crawlReq.Header.Set("User-Agent", userAgent)

	resp, err := client.Do(crawlReq)
	if err != nil {
		reason := outboundFailureReason(err)
		outboundBreaker.recordFailure(hostname)
		logOutboundEvent("failed", hostname, reason)
		json.NewEncoder(w).Encode(CrawlResponse{Success: false, Error: "outbound request failed"})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusInternalServerError {
		outboundBreaker.recordFailure(hostname)
		logOutboundEvent("failed", hostname, "upstream_5xx")
	} else {
		outboundBreaker.recordSuccess(hostname)
	}

	loadTimeMs := time.Since(start).Milliseconds()

	// Limit response size to 5MB to prevent zip bomb / memory attacks
	bodyBytes, err := readLimitedBody(resp.Body, maxCrawlBodyBytes)
	if err != nil {
		json.NewEncoder(w).Encode(CrawlResponse{Success: false, Error: "failed reading response body"})
		return
	}

	rawHtml := string(bodyBytes)

	// 3. Parse HTML
	seoData := parseHTML(rawHtml)
	seoData.Success = true
	seoData.URL = req.URL
	seoData.StatusCode = resp.StatusCode
	seoData.RawHTML = rawHtml
	seoData.LoadTimeMs = loadTimeMs

	if resp.Request != nil {
		var redirectChain []string
		var redirectStatusCodes []int
		curr := resp.Request.Response
		for curr != nil {
			redirectChain = append([]string{curr.Request.URL.String()}, redirectChain...)
			redirectStatusCodes = append([]int{curr.StatusCode}, redirectStatusCodes...)
			if curr.Request != nil {
				curr = curr.Request.Response
			} else {
				break
			}
		}
		if len(redirectChain) > 0 {
			redirectChain = append(redirectChain, resp.Request.URL.String())
			seoData.RedirectChain = redirectChain
			seoData.RedirectStatusCodes = redirectStatusCodes
		}
	}

	json.NewEncoder(w).Encode(seoData)
}

func handleSitemap(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, `{"success":false,"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBodyBytes)
	var req SitemapRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"success":false,"error":"Invalid request payload"}`, http.StatusBadRequest)
		return
	}

	if req.URL == "" {
		http.Error(w, `{"success":false,"error":"URL is required"}`, http.StatusBadRequest)
		return
	}

	parsedTarget, err := validateOutboundURL(req.URL)
	if err != nil {
		logOutboundEvent("denied", safeOutboundHost(req.URL), "policy")
		json.NewEncoder(w).Encode(SitemapResponse{Success: false, Error: "outbound request denied"})
		return
	}

	hostname := strings.ToLower(parsedTarget.Hostname())
	if !outboundBreaker.allow(hostname) {
		logOutboundEvent("denied", hostname, "circuit_open")
		json.NewEncoder(w).Encode(SitemapResponse{Success: false, Error: "outbound request temporarily unavailable"})
		return
	}

	client := buildSafeClient(30 * time.Second)
	resp, err := client.Get(req.URL)
	if err != nil {
		outboundBreaker.recordFailure(hostname)
		logOutboundEvent("failed", hostname, outboundFailureReason(err))
		json.NewEncoder(w).Encode(SitemapResponse{Success: false, Error: "outbound request failed"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode >= http.StatusInternalServerError {
			outboundBreaker.recordFailure(hostname)
			logOutboundEvent("failed", hostname, "upstream_5xx")
		} else {
			outboundBreaker.recordSuccess(hostname)
		}
		json.NewEncoder(w).Encode(SitemapResponse{Success: false, Error: "invalid sitemap response"})
		return
	}
	outboundBreaker.recordSuccess(hostname)

	// Limit sitemap to 10MB
	bodyBytes, err := readLimitedBody(resp.Body, maxSitemapBodyBytes)
	if err != nil {
		json.NewEncoder(w).Encode(SitemapResponse{Success: false, Error: "outbound request failed"})
		return
	}

	var urls []string

	// Try sitemap index first
	var index SitemapIndex
	if err := xml.Unmarshal(bodyBytes, &index); err == nil && len(index.Sitemaps) > 0 {
		for _, s := range index.Sitemaps {
			urls = append(urls, s.Loc)
		}
		json.NewEncoder(w).Encode(SitemapResponse{Success: true, URLs: urls})
		return
	}

	// Fallback to standard urlset
	var urlSet URLSet
	if err := xml.Unmarshal(bodyBytes, &urlSet); err == nil {
		for _, u := range urlSet.URLs {
			urls = append(urls, u.Loc)
		}
		json.NewEncoder(w).Encode(SitemapResponse{Success: true, URLs: urls})
		return
	}

	json.NewEncoder(w).Encode(SitemapResponse{Success: false, Error: "unable to parse XML as sitemap index or urlset"})
}

func parseHTML(htmlStr string) CrawlResponse {
	doc, err := html.Parse(strings.NewReader(htmlStr))
	if err != nil {
		return CrawlResponse{}
	}

	var res CrawlResponse
	res.H1 = []string{}
	res.H2 = []string{}
	res.H3 = []string{}
	res.H4 = []string{}
	res.H5 = []string{}
	res.H6 = []string{}
	res.Links = []string{}

	var textBuilder strings.Builder

	var f func(*html.Node)
	f = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "title":
				if n.FirstChild != nil && n.FirstChild.Type == html.TextNode {
					res.Title = strings.TrimSpace(n.FirstChild.Data)
				}
			case "meta":
				var name, content string
				for _, attr := range n.Attr {
					if attr.Key == "name" {
						name = strings.ToLower(attr.Val)
					} else if attr.Key == "content" {
						content = attr.Val
					}
				}
				if name == "description" {
					res.MetaDescription = content
				} else if name == "robots" {
					res.RobotsMeta = content
				}
			case "link":
				var rel, href string
				for _, attr := range n.Attr {
					if attr.Key == "rel" {
						rel = strings.ToLower(attr.Val)
					} else if attr.Key == "href" {
						href = attr.Val
					}
				}
				if rel == "canonical" {
					res.CanonicalURL = href
				}
			case "h1", "h2", "h3", "h4", "h5", "h6":
				txt := getTextContent(n)
				if txt != "" {
					switch n.Data {
					case "h1":
						res.H1 = append(res.H1, txt)
					case "h2":
						res.H2 = append(res.H2, txt)
					case "h3":
						res.H3 = append(res.H3, txt)
					case "h4":
						res.H4 = append(res.H4, txt)
					case "h5":
						res.H5 = append(res.H5, txt)
					case "h6":
						res.H6 = append(res.H6, txt)
					}
				}
			case "a":
				for _, attr := range n.Attr {
					if attr.Key == "href" {
						link := strings.TrimSpace(attr.Val)
						if link != "" {
							res.Links = append(res.Links, link)
						}
					}
				}
			}
		}

		// Traverse and extract readable text for word count
		if n.Type == html.TextNode {
			// Skip script and style content
			parent := n.Parent
			if parent == nil || (parent.Data != "script" && parent.Data != "style" && parent.Data != "noscript" && parent.Data != "iframe" && parent.Data != "svg") {
				textBuilder.WriteString(n.Data)
				textBuilder.WriteString(" ")
			}
		}

		// Traverse child nodes
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}

	// Begin tree traversal from root
	f(doc)

	// Calculate word count
	words := strings.Fields(textBuilder.String())
	res.WordCount = len(words)

	return res
}

func getTextContent(n *html.Node) string {
	var sb strings.Builder
	var f func(*html.Node)
	f = func(node *html.Node) {
		if node.Type == html.TextNode {
			sb.WriteString(node.Data)
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			f(c)
		}
	}
	f(n)
	return strings.TrimSpace(sb.String())
}
