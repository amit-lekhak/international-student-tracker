import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Application } from '../../entities/application.entity';
import { Program } from '../../entities/program.entity';
import { Agent } from '../../entities/agent.entity';
import { Role, ApplicationStage } from '../../types/enums';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { UpdateNotesDto } from './dto/update-notes.dto';
import { FilterApplicationsDto } from './dto/filter-applications.dto';
import {
  ApplicationResponseDto,
  PaginatedApplicationsResponseDto,
} from './dto/application-response.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {}

  private applyRbacScope(
    queryBuilder: SelectQueryBuilder<Application>,
    user: AuthenticatedUser,
  ): SelectQueryBuilder<Application> {
    if (user.role === Role.AGENT) {
      if (!user.agentId) {
        throw new ForbiddenException('Agent user has no associated agency profile');
      }
      queryBuilder.andWhere('app.agentId = :scopedAgentId', {
        scopedAgentId: user.agentId,
      });
    }
    return queryBuilder;
  }

  private mapToResponseDto(app: Application): ApplicationResponseDto {
    return {
      id: app.id,
      studentName: app.studentName,
      agentId: app.agentId,
      programId: app.programId,
      stage: app.stage,
      stageEnteredDate: app.stageEnteredDate,
      createdDate: app.createdDate,
      notes: app.notes,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      agent: app.agent
        ? {
            id: app.agent.id,
            name: app.agent.name,
            country: app.agent.country,
            tier: app.agent.tier,
          }
        : undefined,
      program: app.program
        ? {
            id: app.program.id,
            schoolId: app.program.schoolId,
            name: app.program.name,
            tuitionUsd: app.program.tuitionUsd,
            school: app.program.school
              ? {
                  id: app.program.school.id,
                  name: app.program.school.name,
                  country: app.program.school.country,
                }
              : undefined,
          }
        : undefined,
    };
  }

  async findAll(
    filterDto: FilterApplicationsDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedApplicationsResponseDto> {
    const page = Math.max(1, filterDto.page || 1);
    const limit = Math.min(100, Math.max(1, filterDto.limit || 50));
    const skip = (page - 1) * limit;

    const qb = this.applicationRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.program', 'program')
      .leftJoinAndSelect('program.school', 'school')
      .leftJoinAndSelect('app.agent', 'agent');

    // Apply strict tenant scoping
    this.applyRbacScope(qb, user);

    // Apply filters
    if (filterDto.stage) {
      qb.andWhere('app.stage = :stage', { stage: filterDto.stage });
    }

    if (filterDto.programId) {
      qb.andWhere('app.programId = :programId', { programId: filterDto.programId });
    }

    if (filterDto.schoolId) {
      qb.andWhere('program.schoolId = :schoolId', { schoolId: filterDto.schoolId });
    }

    // Admin-specific agent filter (Agent role has already been scoped)
    if (user.role === Role.ADMIN && filterDto.agentId) {
      qb.andWhere('app.agentId = :agentId', { agentId: filterDto.agentId });
    }

    if (filterDto.search && filterDto.search.trim().length > 0) {
      qb.andWhere('LOWER(app.studentName) LIKE LOWER(:search)', {
        search: `%${filterDto.search.trim()}%`,
      });
    }

    qb.orderBy('app.createdDate', 'DESC').addOrderBy('app.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.mapToResponseDto(item)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<ApplicationResponseDto> {
    const qb = this.applicationRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.program', 'program')
      .leftJoinAndSelect('program.school', 'school')
      .leftJoinAndSelect('app.agent', 'agent')
      .where('app.id = :id', { id });

    this.applyRbacScope(qb, user);

    const application = await qb.getOne();

    if (!application) {
      // Check if it exists for another agent to return 403 vs 404
      if (user.role === Role.AGENT) {
        const existsElsewhere = await this.applicationRepository.findOne({
          where: { id },
          select: ['id', 'agentId'],
        });
        if (existsElsewhere) {
          throw new ForbiddenException('You do not have permission to view this application');
        }
      }
      throw new NotFoundException(`Application with ID "${id}" not found`);
    }

    return this.mapToResponseDto(application);
  }

  async create(
    createDto: CreateApplicationDto,
    user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    let effectiveAgentId: string;

    if (user.role === Role.AGENT) {
      if (!user.agentId) {
        throw new ForbiddenException('Agent user has no associated agency profile');
      }
      effectiveAgentId = user.agentId;
    } else {
      if (!createDto.agentId) {
        throw new BadRequestException('agentId is required when Admin creates an application');
      }
      const agentExists = await this.agentRepository.findOne({
        where: { id: createDto.agentId },
      });
      if (!agentExists) {
        throw new NotFoundException(`Agent with ID "${createDto.agentId}" not found`);
      }
      effectiveAgentId = createDto.agentId;
    }

    const program = await this.programRepository.findOne({
      where: { id: createDto.programId },
    });
    if (!program) {
      throw new NotFoundException(`Program with ID "${createDto.programId}" not found`);
    }

    const now = new Date();
    const stage = createDto.stage || ApplicationStage.LEAD;

    const newApp = this.applicationRepository.create({
      studentName: createDto.studentName.trim(),
      agentId: effectiveAgentId,
      programId: createDto.programId,
      stage,
      stageEnteredDate: now,
      createdDate: now,
      notes: createDto.notes || null,
    });

    const saved = await this.applicationRepository.save(newApp);
    return this.findOne(saved.id, user);
  }

  async update(
    id: string,
    updateDto: UpdateApplicationDto,
    user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    const qb = this.applicationRepository.createQueryBuilder('app').where('app.id = :id', { id });

    this.applyRbacScope(qb, user);

    const app = await qb.getOne();
    if (!app) {
      if (user.role === Role.AGENT) {
        const existsElsewhere = await this.applicationRepository.findOne({
          where: { id },
          select: ['id', 'agentId'],
        });
        if (existsElsewhere) {
          throw new ForbiddenException('You do not have permission to modify this application');
        }
      }
      throw new NotFoundException(`Application with ID "${id}" not found`);
    }

    if (updateDto.studentName !== undefined) {
      app.studentName = updateDto.studentName.trim();
    }

    if (updateDto.stage !== undefined && updateDto.stage !== app.stage) {
      app.stage = updateDto.stage;
      app.stageEnteredDate = new Date();
    }

    await this.applicationRepository.save(app);
    return this.findOne(id, user);
  }

  async updateNotes(
    id: string,
    updateNotesDto: UpdateNotesDto,
    user: AuthenticatedUser,
  ): Promise<ApplicationResponseDto> {
    const qb = this.applicationRepository.createQueryBuilder('app').where('app.id = :id', { id });

    this.applyRbacScope(qb, user);

    const app = await qb.getOne();
    if (!app) {
      if (user.role === Role.AGENT) {
        const existsElsewhere = await this.applicationRepository.findOne({
          where: { id },
          select: ['id', 'agentId'],
        });
        if (existsElsewhere) {
          throw new ForbiddenException(
            'You do not have permission to edit notes on this application',
          );
        }
      }
      throw new NotFoundException(`Application with ID "${id}" not found`);
    }

    app.notes = updateNotesDto.notes !== undefined ? updateNotesDto.notes : app.notes;
    await this.applicationRepository.save(app);

    return this.findOne(id, user);
  }

  async remove(id: string, _user: AuthenticatedUser): Promise<{ message: string }> {
    const app = await this.applicationRepository.findOne({ where: { id } });
    if (!app) {
      throw new NotFoundException(`Application with ID "${id}" not found`);
    }

    await this.applicationRepository.remove(app);
    return { message: `Application with ID "${id}" deleted successfully` };
  }
}
