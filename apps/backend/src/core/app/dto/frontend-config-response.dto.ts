import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class GrafanaConfigDto {
    @ApiPropertyOptional({
        description: "Base URL of the Grafana instance",
        example: "http://localhost:3001",
    })
    url?: string;

    @ApiProperty({
        description: "UID of the Tempo data source in Grafana",
        example: "tempo",
    })
    tempoUid!: string;

    @ApiProperty({
        description: "UID of the Loki data source in Grafana",
        example: "loki",
    })
    lokiUid!: string;
}

export class FrontendConfigResponseDto {
    @ApiProperty({ description: "Grafana observability configuration" })
    grafana!: GrafanaConfigDto;
}
