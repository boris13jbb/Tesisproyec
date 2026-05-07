"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, cookie_parser_1.default)());
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    const instance = app.getHttpAdapter().getInstance();
    if (typeof instance === 'function') {
    }
    else if (typeof instance === 'object' &&
        instance !== null &&
        'disable' in instance &&
        typeof instance.disable === 'function') {
        instance.disable('x-powered-by');
    }
    const config = app.get(config_1.ConfigService);
    const port = config.get('PORT', 3000);
    const corsOrigin = config.get('CORS_ORIGIN') ?? 'http://localhost:5173';
    const origins = corsOrigin
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({
        origin: origins.length ? origins : ['http://localhost:5173'],
        credentials: true,
    });
    await app.listen(port);
}
void bootstrap();
//# sourceMappingURL=main.js.map