import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseMetaDto {
  @ApiProperty({ description: 'Total number of items matching filters', example: 226 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page limit', example: 50 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;
}
