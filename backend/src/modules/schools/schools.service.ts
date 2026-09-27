import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from '../../entities/school.entity';
import { SchoolResponseDto } from './dto/school-response.dto';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private readonly schoolRepository: Repository<School>,
  ) {}

  async findAll(): Promise<SchoolResponseDto[]> {
    const schools = await this.schoolRepository.find({
      order: { name: 'ASC' },
    });

    return schools.map((s) => ({
      id: s.id,
      name: s.name,
      country: s.country,
    }));
  }
}
