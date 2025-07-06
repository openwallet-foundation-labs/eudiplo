import { randomUUID } from 'node:crypto';
import {
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthorizeService } from './authorize.service';
import type { AuthorizeQueries } from './dto/authorize-request.dto';
import { SessionService } from 'src/session/session.service';

@Controller('authorize')
export class AuthorizeController {
  constructor(
    private readonly authorizeService: AuthorizeService,
    private sessionService: SessionService,
  ) {}

  @Get()
  async authorize(@Query() queries: AuthorizeQueries, @Res() res: Response) {
    let values = queries;
    if (queries.request_uri) {
      await this.sessionService
        .getBy({ request_uri: queries.request_uri })
        .then((session) => {
          values = session.auth_queries!;
        })
        .catch(() => {
          throw new ConflictException(
            'request_uri not found or not provided in the request',
          );
        });
    } else {
      throw new ConflictException(
        'request_uri not found or not provided in the request',
      );
    }
    const code = await this.authorizeService.setAuthCode(values.issuer_state);
    res.redirect(`${values.redirect_uri}?code=${code}`);
  }

  @Post('par')
  async par(@Body() body: AuthorizeQueries) {
    const request_uri = `urn:${randomUUID()}`;
    // save both so we can retrieve the session also via the request_uri in the authorize step.
    await this.sessionService.add(body.issuer_state, {
      request_uri,
      auth_queries: body,
    });
    return {
      expires_in: 500,
      request_uri,
    };
  }

  @Post('token')
  async token(@Body() body: any, @Req() req: Request) {
    return this.authorizeService.validateTokenRequest(body, req);
  }

  @Get('jwks.json')
  @Header('Content-Type', 'application/jwk-set+json')
  async getJwks() {
    return this.authorizeService.getJwks().then((key) => ({
      keys: [key],
    }));
  }

  @Post('challenge')
  authorizationChallengeEndpoint(
    @Res() res: Response,
    @Body() body: AuthorizeQueries,
  ) {
    return this.authorizeService.authorizationChallengeEndpoint(res, body);
  }
}
