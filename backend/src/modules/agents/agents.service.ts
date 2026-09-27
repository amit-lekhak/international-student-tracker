import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent } from '../../entities/agent.entity';
import { AgentResponseDto } from './dto/agent-response.dto';

@Injectable()
export class AgentsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepository: Repository<Agent>,
  ) {}

  async findAll(): Promise<AgentResponseDto[]> {
    const agents = await this.agentRepository.find({
      order: { name: 'ASC' },
    });

    return agents.map((a) => ({
      id: a.id,
      name: a.name,
      country: a.country,
      tier: a.tier,
    }));
  }
}
