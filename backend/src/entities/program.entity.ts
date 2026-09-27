import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { School } from './school.entity';
import { Application } from './application.entity';

@Entity('programs')
@Check('"tuitionUsd" >= 0')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_programs_school_id')
  @Column({ type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School, (school) => school.programs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'integer' })
  tuitionUsd: number;

  @OneToMany(() => Application, (application) => application.program)
  applications: Application[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
