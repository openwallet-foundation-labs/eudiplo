import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import type { KeyChainResponseDto } from '@eudiplo/sdk-core';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KeyManagementShowComponent } from './key-management-show.component';

describe('KeyManagementShowComponent', () => {
  let component: KeyManagementShowComponent;
  let fixture: ComponentFixture<KeyManagementShowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeyManagementShowComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(KeyManagementShowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function shownWith(overrides: Partial<KeyChainResponseDto>): string {
    component.keyChain = {
      id: 'key',
      type: 'standalone',
      usageType: 'attestation',
      kmsProvider: 'db',
      rotationPolicy: { enabled: false },
      activePublicKey: { kty: 'EC', crv: 'P-384' },
      ...overrides,
    } as KeyChainResponseDto;
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    return fixture.nativeElement.textContent;
  }

  it('names the signing algorithm and curve', () => {
    expect(shownWith({ alg: 'ES384' })).toContain('ES384 (ECDSA P-384)');
  });

  it('leaves the signing algorithm out for keys on other curves', () => {
    expect(shownWith({ alg: undefined })).not.toContain('Signing Algorithm');
  });
});

describe('KeyManagementShowComponent key export', () => {
  const keyChain = { id: 'key', usageType: 'attestation' } as KeyChainResponseDto;
  let keyChainService: { export: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };
  let roles: string[];

  function create(): KeyManagementShowComponent {
    const component = new KeyManagementShowComponent(
      keyChainService as never,
      {} as never,
      snackBar as never,
      {} as never,
      dialog as never,
      { hasRole: (role: string[]) => role.some((r) => roles.includes(r)) } as never,
      {} as never
    );
    component.keyChain = keyChain;
    return component;
  }

  beforeEach(() => {
    keyChainService = { export: vi.fn() };
    snackBar = { open: vi.fn() };
    dialog = { open: vi.fn() };
    roles = [];
  });

  it('does not offer the export without the tenant:admin or tenants:manage role', async () => {
    roles = ['issuance:manage', 'presentation:manage'];
    const component = create();

    expect(component.canExport).toBe(false);
    await component.exportKeyChain();

    expect(keyChainService.export).not.toHaveBeenCalled();
    expect(snackBar.open.mock.lastCall?.[0]).toContain('tenant:admin');
  });

  it.each(['tenant:admin', 'tenants:manage'])('offers the export with %s', (role) => {
    roles = [role];

    expect(create().canExport).toBe(true);
  });

  it('explains a rejected export', async () => {
    roles = ['tenant:admin'];
    keyChainService.export.mockRejectedValue({ statusCode: 403, message: 'Forbidden resource' });

    await create().exportKeyChain();

    expect(snackBar.open.mock.lastCall?.[0]).toContain('tenant:admin');
  });

  it("shows the backend's reason when the export fails for another reason", async () => {
    roles = ['tenant:admin'];
    keyChainService.export.mockRejectedValue({ statusCode: 404, message: 'Key chain not found' });

    await create().exportKeyChain();

    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to export key chain: Key chain not found'
    );
  });

  it('shows the public key chain as JSON without calling the export', () => {
    create().viewAsJson();

    expect(keyChainService.export).not.toHaveBeenCalled();
    expect(dialog.open.mock.lastCall?.[1].data.jsonData).toBe(keyChain);
  });
});

describe('KeyManagementShowComponent loading', () => {
  it('shows why the key chain could not be loaded instead of loading forever, and retries', async () => {
    const getById = vi
      .fn()
      .mockRejectedValueOnce({ statusCode: 404, message: 'Key chain not found' })
      .mockResolvedValueOnce({ id: 'key', usageType: 'attestation' });
    const component = new KeyManagementShowComponent(
      { getById } as never,
      { paramMap: of(convertToParamMap({ id: 'key' })) } as never,
      { open: vi.fn() } as never,
      {} as never,
      {} as never,
      { hasRole: () => true } as never,
      { getConfig: vi.fn().mockResolvedValue(null) } as never
    );

    component.ngOnInit();
    await vi.waitFor(() => expect(component.loadError).not.toBe(''));

    expect(component.loadError).toBe('Failed to load key chain: Key chain not found');
    expect(component.keyChain).toBeUndefined();

    component.retryLoad();
    await vi.waitFor(() => expect(component.keyChain?.id).toBe('key'));
    expect(component.loadError).toBe('');
    component.ngOnDestroy();
  });
});

describe('KeyManagementShowComponent type description', () => {
  function describeKey(keyChain: Partial<KeyChainResponseDto>): string {
    const component = new KeyManagementShowComponent(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never
    );
    component.keyChain = { rotationPolicy: { enabled: false }, ...keyChain } as KeyChainResponseDto;
    return component.getTypeDescription();
  }

  it('calls a standalone key self-signed when its certificate names itself as issuer', () => {
    expect(
      describeKey({
        type: 'standalone',
        activeCertificate: { subject: 'CN=Tenant', issuer: 'CN=Tenant' },
      } as Partial<KeyChainResponseDto>)
    ).toBe('This is a self-signed standalone key.');
  });

  it('names a standalone key without an active certificate neither way', () => {
    expect(describeKey({ type: 'standalone' })).toBe('This is a standalone key.');
  });

  it('does not call a standalone key with a registrar or imported certificate self-signed', () => {
    const description = describeKey({
      type: 'standalone',
      activeCertificate: { subject: 'CN=Tenant', issuer: 'CN=Registrar CA' },
    } as Partial<KeyChainResponseDto>);

    expect(description).not.toContain('self-signed');
    expect(description).toContain('Issuer');
  });
});

describe('KeyManagementShowComponent registrar enrollment', () => {
  const selfSigned = { subject: 'CN=Tenant', issuer: 'CN=Tenant', pem: '' };
  const registrarIssued = { subject: 'CN=Tenant', issuer: 'CN=Registrar CA', pem: '' };
  let keyChainService: { getById: ReturnType<typeof vi.fn> };
  let registrarService: {
    getConfig: ReturnType<typeof vi.fn>;
    createAccessCertificate: ReturnType<typeof vi.fn>;
  };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let snackBarAction: Subject<void>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let roles: string[];

  function keyChain(overrides: Record<string, unknown> = {}): KeyChainResponseDto {
    return {
      id: 'access-key',
      type: 'standalone',
      usageType: 'access',
      rotationPolicy: { enabled: false },
      activeCertificate: selfSigned,
      ...overrides,
    } as unknown as KeyChainResponseDto;
  }

  async function create(key = keyChain()): Promise<KeyManagementShowComponent> {
    keyChainService.getById.mockResolvedValue(key);
    const component = new KeyManagementShowComponent(
      keyChainService as never,
      { paramMap: of(convertToParamMap({ id: key.id })) } as never,
      snackBar as never,
      router as never,
      {} as never,
      { hasRole: (role: string) => roles.includes(role) } as never,
      registrarService as never
    );
    component.ngOnInit();
    await vi.waitFor(() => expect(component.keyChain).toBeDefined());
    if (roles.includes('registrar:manage')) {
      await vi.waitFor(() => expect(component.registrarConfig).not.toBe('checking'));
    }
    return component;
  }

  beforeEach(() => {
    keyChainService = { getById: vi.fn() };
    registrarService = {
      getConfig: vi.fn().mockResolvedValue({ registrarUrl: 'https://registrar.example' }),
      createAccessCertificate: vi.fn().mockResolvedValue({}),
    };
    snackBarAction = new Subject<void>();
    snackBar = { open: vi.fn(() => ({ onAction: () => snackBarAction })) };
    router = { navigate: vi.fn() };
    roles = ['registrar:manage'];
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it('offers the enrollment for a standalone access key when a registrar is configured', async () => {
    expect((await create()).canEnrollWithRegistrar).toBe(true);
  });

  it('does not offer it without the registrar:manage role or read the configuration', async () => {
    roles = ['keys:manage'];
    const component = await create();

    expect(registrarService.getConfig).not.toHaveBeenCalled();
    expect(component.canEnrollWithRegistrar).toBe(false);
  });

  it('links to the registrar configuration instead when there is none', async () => {
    registrarService.getConfig.mockResolvedValue(null);
    const component = await create();

    expect(component.canEnrollWithRegistrar).toBe(false);
    expect(component.needsRegistrarConfig).toBe(true);
  });

  it('keeps the page shown while it reloads the enrolled key', async () => {
    const component = await create();
    let resolveReload!: (key: KeyChainResponseDto) => void;
    keyChainService.getById.mockReturnValue(new Promise((resolve) => (resolveReload = resolve)));

    const enrolling = component.enrollWithRegistrar();
    await vi.waitFor(() => expect(keyChainService.getById).toHaveBeenCalledTimes(2));
    expect(component.keyChain).toBeDefined();
    resolveReload(keyChain({ activeCertificate: registrarIssued }));
    await enrolling;

    expect(component.keyChain?.activeCertificate?.issuer).toBe('CN=Registrar CA');
  });

  it('offers it when the registrar configuration could not be read', async () => {
    registrarService.getConfig.mockRejectedValue({ status: 500 });
    const component = await create();

    expect(component.registrarConfig).toBe('unknown');
    expect(component.canEnrollWithRegistrar).toBe(true);
  });

  it.each([
    ['an internal chain', { type: 'internalChain' }],
    ['an attestation key', { usageType: 'attestation' }],
  ])('does not offer it for %s', async (_, overrides) => {
    expect((await create(keyChain(overrides))).canEnrollWithRegistrar).toBe(false);
  });

  it('enrolls a self-signed key without asking and reloads it', async () => {
    const component = await create();
    keyChainService.getById.mockResolvedValue(keyChain({ activeCertificate: registrarIssued }));

    await component.enrollWithRegistrar();

    expect(window.confirm).not.toHaveBeenCalled();
    expect(registrarService.createAccessCertificate).toHaveBeenCalledWith('access-key');
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Access certificate enrolled via registrar');
    expect(component.keyChain?.activeCertificate?.issuer).toBe('CN=Registrar CA');
    expect(component.isEnrolling).toBe(false);
  });

  it('asks before replacing a certificate issued by someone else', async () => {
    const component = await create(keyChain({ activeCertificate: registrarIssued }));
    vi.mocked(window.confirm).mockReturnValue(false);

    await component.enrollWithRegistrar();

    expect(vi.mocked(window.confirm).mock.lastCall?.[0]).toContain('CN=Registrar CA');
    expect(registrarService.createAccessCertificate).not.toHaveBeenCalled();
  });

  it('replaces a certificate issued by someone else once confirmed', async () => {
    const component = await create(keyChain({ activeCertificate: registrarIssued }));

    await component.enrollWithRegistrar();

    expect(window.confirm).toHaveBeenCalled();
    expect(registrarService.createAccessCertificate).toHaveBeenCalledWith('access-key');
  });

  it('keeps showing another key the user opened during the enrollment', async () => {
    const paramMap = new BehaviorSubject(convertToParamMap({ id: 'access-key' }));
    keyChainService.getById.mockImplementation((...args: unknown[]) =>
      Promise.resolve(keyChain({ id: args[0] }))
    );
    let finishEnrollment!: () => void;
    registrarService.createAccessCertificate.mockReturnValue(
      new Promise<void>((resolve) => (finishEnrollment = resolve))
    );
    const component = new KeyManagementShowComponent(
      keyChainService as never,
      { paramMap } as never,
      snackBar as never,
      router as never,
      {} as never,
      { hasRole: (role: string) => roles.includes(role) } as never,
      registrarService as never
    );
    component.ngOnInit();
    await vi.waitFor(() => expect(component.keyChain?.id).toBe('access-key'));
    await vi.waitFor(() => expect(component.registrarConfig).toBe('configured'));

    const enrolling = component.enrollWithRegistrar();
    paramMap.next(convertToParamMap({ id: 'other-key' }));
    await vi.waitFor(() => expect(component.keyChain?.id).toBe('other-key'));
    expect(component.isEnrolling).toBe(false);
    finishEnrollment();
    await enrolling;

    expect(component.keyChain?.id).toBe('other-key');
    expect(component.isEnrolling).toBe(false);
    component.ngOnDestroy();
  });

  it('warns before enrolling a rotating key', async () => {
    const component = await create(
      keyChain({ rotationPolicy: { enabled: true, intervalDays: 30 } })
    );
    vi.mocked(window.confirm).mockReturnValue(false);

    await component.enrollWithRegistrar();

    expect(vi.mocked(window.confirm).mock.lastCall?.[0]).toContain('rotates automatically');
    expect(registrarService.createAccessCertificate).not.toHaveBeenCalled();
  });

  it('sends one request when the action is selected twice', async () => {
    const component = await create();
    let finishEnrollment!: () => void;
    registrarService.createAccessCertificate.mockReturnValue(
      new Promise<void>((resolve) => (finishEnrollment = resolve))
    );

    const first = component.enrollWithRegistrar();
    expect(component.isEnrolling).toBe(true);
    await component.enrollWithRegistrar();
    finishEnrollment();
    await first;

    expect(registrarService.createAccessCertificate).toHaveBeenCalledTimes(1);
    expect(component.isEnrolling).toBe(false);
  });

  it('keeps the key shown when its reload after the enrollment fails', async () => {
    const component = await create();
    keyChainService.getById.mockRejectedValue({
      statusCode: 500,
      message: 'Internal server error',
    });

    await component.enrollWithRegistrar();

    expect(component.keyChain?.id).toBe('access-key');
    expect(snackBar.open.mock.lastCall?.[0]).toBe(
      'Failed to reload key chain: Internal server error'
    );
  });

  it('offers neither the action nor the link while the configuration is read', async () => {
    registrarService.getConfig.mockReturnValue(new Promise(() => undefined));
    keyChainService.getById.mockResolvedValue(keyChain());
    const component = new KeyManagementShowComponent(
      keyChainService as never,
      { paramMap: of(convertToParamMap({ id: 'access-key' })) } as never,
      snackBar as never,
      router as never,
      {} as never,
      { hasRole: (role: string) => roles.includes(role) } as never,
      registrarService as never
    );
    component.ngOnInit();
    await vi.waitFor(() => expect(component.keyChain).toBeDefined());

    expect(component.canEnrollWithRegistrar).toBe(false);
    expect(component.needsRegistrarConfig).toBe(false);
  });

  it("shows the backend's reason for a refusal and links to the registrar page", async () => {
    const component = await create();
    keyChainService.getById.mockClear();
    registrarService.createAccessCertificate.mockRejectedValue({
      status: 400,
      error: { message: 'Failed to authenticate with registrar' },
    });

    await component.enrollWithRegistrar();

    expect(snackBar.open.mock.lastCall?.[0]).toBe('Failed to authenticate with registrar');
    expect(snackBar.open.mock.lastCall?.[1]).toBe('Go to Registrar');
    snackBarAction.next();
    expect(router.navigate).toHaveBeenCalledWith(['/registrar']);
    // A refused request stored nothing.
    expect(keyChainService.getById).not.toHaveBeenCalled();
  });

  it('reloads the key after a failure that may have stored the certificate', async () => {
    const component = await create();
    keyChainService.getById.mockClear();
    registrarService.createAccessCertificate.mockRejectedValue({ status: 0 });

    await component.enrollWithRegistrar();

    expect(snackBar.open.mock.lastCall?.[0]).toContain('the backend could not be reached');
    expect(keyChainService.getById).toHaveBeenCalledWith('access-key');
  });

  it('does not link to the registrar page when the role is missing', async () => {
    const component = await create();
    registrarService.createAccessCertificate.mockRejectedValue({ status: 403 });

    await component.enrollWithRegistrar();

    expect(snackBar.open.mock.lastCall?.[1]).toBe('Close');
  });
});
