import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('EUDIPLO Service API')
    .setExternalDoc('Documentation', 'https://cre8.github.io/eudiplo/')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  if (process.env.SWAGGER_JSON) {
    writeFileSync('swagger.json', JSON.stringify(documentFactory(), null, 2));
    process.exit();
  } else {
    SwaggerModule.setup('/api', app, documentFactory);
    await app.listen(process.env.PORT ?? 3000);
  }
}
void bootstrap();
