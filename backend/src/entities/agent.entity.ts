import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgentTier } from '../types/enums';
import { User } from './user.entity';
import { Application } from './application.entity';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  country: string;

  @Column({
    type: 'varchar',
    length: 50,
    enum: AgentTier,
    default: AgentTier.BRONZE,
  })
  tier: AgentTier;

  @OneToMany(() => User, (user) => user.agent)
  users: User[];

  @OneToMany(() => Application, (application) => application.agent)
  applications: Application[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
