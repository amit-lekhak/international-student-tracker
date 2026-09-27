import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program } from '../../entities/program.entity';
import { ProgramResponseDto } from './dto/program-response.dto';
import { FilterProgramsDto } from './dto/filter-programs.dto';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
  ) {}

  async findAll(filterDto?: FilterProgramsDto): Promise<ProgramResponseDto[]> {
    const query = this.programRepository
      .createQueryBuilder('program')
      .leftJoinAndSelect('program.school', 'school')
      .orderBy('program.name', 'ASC');

    if (filterDto?.schoolId) {
      query.andWhere('program.schoolId = :schoolId', { schoolId: filterDto.schoolId });
    }

    const programs = await query.getMany();

    return programs.map((p) => ({
      id: p.id,
      schoolId: p.schoolId,
      name: p.name,
      tuitionUsd: p.tuitionUsd,
      school: p.school
        ? {
            id: p.school.id,
            name: p.school.name,
            country: p.school.country,
          }
        : undefined,
    }));
  }
}
