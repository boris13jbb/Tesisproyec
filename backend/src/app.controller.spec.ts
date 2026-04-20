import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return ok when database query succeeds', async () => {
      const result = await appController.health();
      expect(result).toEqual({
        status: 'ok',
        service: 'sgd-gadpr-lm-api',
        database: 'up',
      });
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
