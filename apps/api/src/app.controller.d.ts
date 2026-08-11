export declare class AppController {
    health(): Promise<{
        status: string;
        timestamp: string;
        services: {
            database: string;
            clickhouse: string;
        };
    }>;
}
