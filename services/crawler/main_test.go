package main

import (
	"net"
	"strings"
	"testing"
	"time"
)

func TestValidateOutboundURLRejectsSSRFAndUnsafeTargets(t *testing.T) {
	testCases := []string{
		"file:///etc/passwd",
		"ftp://example.com/archive.xml",
		"http://127.0.0.1/admin",
		"http://localhost/admin",
		"http://169.254.169.254/latest/meta-data/",
		"http://10.0.0.1/internal",
		"http://192.168.1.10/internal",
		"http://[::1]/internal",
		"http://user:password@example.com/private",
		"http:///missing-host",
	}

	for _, rawURL := range testCases {
		t.Run(rawURL, func(t *testing.T) {
			if _, err := validateOutboundURL(rawURL); err == nil {
				t.Fatalf("validateOutboundURL(%q) succeeded for an unsafe target", rawURL)
			}
		})
	}
}

func TestValidateOutboundURLAcceptsPublicHTTPSTargets(t *testing.T) {
	testCases := []string{
		"https://example.com/",
		"http://example.com:8080/path?query=value",
	}

	for _, rawURL := range testCases {
		t.Run(rawURL, func(t *testing.T) {
			parsed, err := validateOutboundURL(rawURL)
			if err != nil {
				t.Fatalf("validateOutboundURL(%q) returned an error: %v", rawURL, err)
			}
			if parsed.String() != rawURL {
				t.Fatalf("validateOutboundURL(%q) returned %q", rawURL, parsed.String())
			}
		})
	}
}

func TestForbiddenIPRanges(t *testing.T) {
	testCases := map[string]bool{
		"0.0.0.0":         true,
		"127.0.0.1":       true,
		"10.0.0.1":        true,
		"169.254.169.254": true,
		"192.168.1.1":     true,
		"::1":             true,
		"8.8.8.8":         false,
	}

	for rawIP, wantForbidden := range testCases {
		t.Run(rawIP, func(t *testing.T) {
			ip := net.ParseIP(rawIP)
			if ip == nil {
				t.Fatalf("net.ParseIP(%q) returned nil", rawIP)
			}
			if gotForbidden := isForbiddenIP(ip); gotForbidden != wantForbidden {
				t.Fatalf("isForbiddenIP(%s) = %t, want %t", rawIP, gotForbidden, wantForbidden)
			}
		})
	}
}

func TestReadLimitedBodyRejectsOversizedResponse(t *testing.T) {
	body := strings.NewReader("123456")

	if _, err := readLimitedBody(body, 5); err == nil {
		t.Fatal("readLimitedBody accepted a response larger than the configured limit")
	}
}

func TestReadLimitedBodyAcceptsResponseAtLimit(t *testing.T) {
	bodyBytes, err := readLimitedBody(strings.NewReader("12345"), 5)
	if err != nil {
		t.Fatalf("readLimitedBody returned an error: %v", err)
	}
	if string(bodyBytes) != "12345" {
		t.Fatalf("readLimitedBody returned %q", string(bodyBytes))
	}
}

func TestOutboundAllowlistFailsClosedInProduction(t *testing.T) {
	t.Setenv("NODE_ENV", "production")
	t.Setenv("CRAWLER_OUTBOUND_ALLOWLIST", "")

	if isAllowedOutboundHost("example.com") {
		t.Fatal("production outbound policy allowed a host without an allowlist")
	}

	t.Setenv("CRAWLER_OUTBOUND_ALLOWLIST", "example.com, *.trusted.test")
	if !isAllowedOutboundHost("example.com") {
		t.Fatal("exact allowlist entry was not allowed")
	}
	if !isAllowedOutboundHost("api.trusted.test") {
		t.Fatal("wildcard allowlist entry was not allowed")
	}
	if isAllowedOutboundHost("untrusted.test") {
		t.Fatal("unlisted host was allowed")
	}
}

func TestOutboundCircuitBreakerOpensAndResetsAfterCooldown(t *testing.T) {
	currentTime := time.Date(2026, time.August, 13, 0, 0, 0, 0, time.UTC)
	breaker := newOutboundCircuitBreaker(2, time.Minute)
	breaker.now = func() time.Time { return currentTime }

	breaker.recordFailure("example.com")
	if !breaker.allow("example.com") {
		t.Fatal("circuit opened before reaching the threshold")
	}
	breaker.recordFailure("example.com")
	if breaker.allow("example.com") {
		t.Fatal("circuit remained closed after reaching the threshold")
	}

	currentTime = currentTime.Add(time.Minute)
	if !breaker.allow("example.com") {
		t.Fatal("circuit did not reset after the cooldown")
	}
}

func TestSafeOutboundHostOmitsCredentialsAndPath(t *testing.T) {
	if got := safeOutboundHost("https://user:password@Example.com/private?token=secret"); got != "example.com" {
		t.Fatalf("safeOutboundHost returned %q", got)
	}
}
