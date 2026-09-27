import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDataSourceOptions } from './config/database.config';
import { Agent, School, Program, User, Application } from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ApplicationsModule } from './modules/applications/applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => getDataSourceOptions(),
    }),
    TypeOrmModule.forFeature([Agent, School, Program, User, Application]),
    AuthModule,
    SchoolsModule,
    ProgramsModule,
    AgentsModule,
    ApplicationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
