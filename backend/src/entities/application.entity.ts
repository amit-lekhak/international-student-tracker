import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApplicationStage } from '../types/enums';
import { Agent } from './agent.entity';
import { Program } from './program.entity';

@Entity('applications')
@Index('idx_applications_agent_stage', ['agentId', 'stage'])
@Index('idx_applications_program_stage', ['programId', 'stage'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  studentName: string;

  @Index('idx_applications_agent_id')
  @Column({ type: 'uuid' })
  agentId: string;

  @ManyToOne(() => Agent, (agent) => agent.applications, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @Index('idx_applications_program_id')
  @Column({ type: 'uuid' })
  programId: string;

  @ManyToOne(() => Program, (program) => program.applications, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'programId' })
  program: Program;

  @Index('idx_applications_stage')
  @Column({
    type: 'varchar',
    length: 50,
    enum: ApplicationStage,
    default: ApplicationStage.LEAD,
  })
  stage: ApplicationStage;

  @Index('idx_applications_stage_entered_date')
  @Column({ type: 'timestamptz' })
  stageEnteredDate: Date;

  @Index('idx_applications_created_date')
  @Column({ type: 'timestamptz' })
  createdDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
