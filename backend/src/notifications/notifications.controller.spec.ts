import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtRequestUser } from '../auth/request-user';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController (scope propio)', () => {
  let app: INestApplication<App>;
  const listForUser = jest.fn();
  const markRead = jest.fn();
  const markAllRead = jest.fn();
  let authUser: JwtRequestUser;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationService,
          useValue: { listForUser, markRead, markAllRead },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx
            .switchToHttp()
            .getRequest<{ user?: JwtRequestUser }>();
          req.user = authUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    listForUser.mockReset();
    markRead.mockReset();
    markAllRead.mockReset();
    listForUser.mockResolvedValue({ unread: 1, items: [] });
    markRead.mockResolvedValue(undefined);
    markAllRead.mockResolvedValue(undefined);
  });

  function setUser(id: string) {
    authUser = {
      id,
      email: `${id}@local.test`,
      nombres: 'U',
      apellidos: 'S',
      roles: [{ codigo: 'USUARIO', nombre: 'Usuario' }],
      dependenciaId: null,
    };
  }

  it('USER A lista solo con su userId JWT (no query userId)', async () => {
    setUser('user-a');
    await request(app.getHttpServer())
      .get('/notifications?userId=user-b')
      .expect(200);
    expect(listForUser).toHaveBeenCalledWith('user-a', 30);
  });

  it('USER A no puede marcar la notificación de B (scope JWT)', async () => {
    setUser('user-a');
    const foreignId = '550e8400-e29b-41d4-a716-446655440000';
    await request(app.getHttpServer())
      .patch(`/notifications/${foreignId}/read`)
      .expect(204);
    expect(markRead).toHaveBeenCalledWith('user-a', foreignId);
    expect(markRead).not.toHaveBeenCalledWith('user-b', foreignId);
  });

  it('mark-all usa solo el usuario autenticado', async () => {
    setUser('user-a');
    await request(app.getHttpServer())
      .patch('/notifications/read-all')
      .expect(204);
    expect(markAllRead).toHaveBeenCalledWith('user-a');
  });

  it('no hay endpoint de envío manual', async () => {
    setUser('user-a');
    await request(app.getHttpServer()).post('/notifications/send').expect(404);
  });
});
