package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	fmt.Println("SEO Collector Service Starting...")
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})
	log.Fatal(http.ListenAndServe(":8082", nil))
}
