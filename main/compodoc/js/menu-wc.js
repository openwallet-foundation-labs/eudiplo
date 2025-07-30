'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">eudiplo documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                        <li class="link">
                            <a href="changelog.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>CHANGELOG
                            </a>
                        </li>
                        <li class="link">
                            <a href="license.html"  data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>LICENSE
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AppModule-b5e7281d360650992d03e0d22169550d6fced43b6dfc2bd1cbc83bf99d71a2229f76a16c60e95c3c94ad988e5b5704dcf4f536d54fa74b6a79d00e15c30749bf"' : 'data-bs-target="#xs-controllers-links-module-AppModule-b5e7281d360650992d03e0d22169550d6fced43b6dfc2bd1cbc83bf99d71a2229f76a16c60e95c3c94ad988e5b5704dcf4f536d54fa74b6a79d00e15c30749bf"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-b5e7281d360650992d03e0d22169550d6fced43b6dfc2bd1cbc83bf99d71a2229f76a16c60e95c3c94ad988e5b5704dcf4f536d54fa74b6a79d00e15c30749bf"' :
                                            'id="xs-controllers-links-module-AppModule-b5e7281d360650992d03e0d22169550d6fced43b6dfc2bd1cbc83bf99d71a2229f76a16c60e95c3c94ad988e5b5704dcf4f536d54fa74b6a79d00e15c30749bf"' }>
                                            <li class="link">
                                                <a href="controllers/AppController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/WellKnownController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WellKnownController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AppModule-b5e7281d360650992d03e0d22169550d6fced43b6dfc2bd1cbc83bf99d71a2229f76a16c60e95c3c94ad988e5b5704dcf4f536d54fa74b6a79d00e15c30749bf"' : 'data-bs-target="#xs-injectables-links-module-AppModule-b5e7281d360650992d03e0d22169550d6fced43b6dfc2bd1cbc83bf99d71a2229f76a16c60e95c3c94ad988e5b5704dcf4f536d54fa74b6a79d00e15c30749bf"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-b5e7281d360650992d03e0d22169550d6fced43b6dfc2bd1cbc83bf99d71a2229f76a16c60e95c3c94ad988e5b5704dcf4f536d54fa74b6a79d00e15c30749bf"' :
                                        'id="xs-injectables-links-module-AppModule-b5e7281d360650992d03e0d22169550d6fced43b6dfc2bd1cbc83bf99d71a2229f76a16c60e95c3c94ad988e5b5704dcf4f536d54fa74b6a79d00e15c30749bf"' }>
                                        <li class="link">
                                            <a href="injectables/WellKnownService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WellKnownService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/AuthModule.html" data-type="entity-link" >AuthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AuthModule-2e163f483b41c2a828e46c0a4272136c5e704eb5f59a7bae2dbc5c4b7073a0e7f637682e012e6a0ab1b402fa015cd6891c274edaf85beca169c3317ec3f7c063"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-2e163f483b41c2a828e46c0a4272136c5e704eb5f59a7bae2dbc5c4b7073a0e7f637682e012e6a0ab1b402fa015cd6891c274edaf85beca169c3317ec3f7c063"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-2e163f483b41c2a828e46c0a4272136c5e704eb5f59a7bae2dbc5c4b7073a0e7f637682e012e6a0ab1b402fa015cd6891c274edaf85beca169c3317ec3f7c063"' :
                                            'id="xs-controllers-links-module-AuthModule-2e163f483b41c2a828e46c0a4272136c5e704eb5f59a7bae2dbc5c4b7073a0e7f637682e012e6a0ab1b402fa015cd6891c274edaf85beca169c3317ec3f7c063"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-2e163f483b41c2a828e46c0a4272136c5e704eb5f59a7bae2dbc5c4b7073a0e7f637682e012e6a0ab1b402fa015cd6891c274edaf85beca169c3317ec3f7c063"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-2e163f483b41c2a828e46c0a4272136c5e704eb5f59a7bae2dbc5c4b7073a0e7f637682e012e6a0ab1b402fa015cd6891c274edaf85beca169c3317ec3f7c063"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-2e163f483b41c2a828e46c0a4272136c5e704eb5f59a7bae2dbc5c4b7073a0e7f637682e012e6a0ab1b402fa015cd6891c274edaf85beca169c3317ec3f7c063"' :
                                        'id="xs-injectables-links-module-AuthModule-2e163f483b41c2a828e46c0a4272136c5e704eb5f59a7bae2dbc5c4b7073a0e7f637682e012e6a0ab1b402fa015cd6891c274edaf85beca169c3317ec3f7c063"' }>
                                        <li class="link">
                                            <a href="injectables/ClientService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ClientService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtAuthGuard.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtAuthGuard</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/JwtStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JwtStrategy</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CryptoModule.html" data-type="entity-link" >CryptoModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoModule-7827736de032134b1e4b9f660514ef00f9db2cd9e6dc53cfdbc533770c14b8873422bf289dc660315b3ba4716b1001b370a1fa982badad5a2d5771b6307bf346"' : 'data-bs-target="#xs-injectables-links-module-CryptoModule-7827736de032134b1e4b9f660514ef00f9db2cd9e6dc53cfdbc533770c14b8873422bf289dc660315b3ba4716b1001b370a1fa982badad5a2d5771b6307bf346"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoModule-7827736de032134b1e4b9f660514ef00f9db2cd9e6dc53cfdbc533770c14b8873422bf289dc660315b3ba4716b1001b370a1fa982badad5a2d5771b6307bf346"' :
                                        'id="xs-injectables-links-module-CryptoModule-7827736de032134b1e4b9f660514ef00f9db2cd9e6dc53cfdbc533770c14b8873422bf289dc660315b3ba4716b1001b370a1fa982badad5a2d5771b6307bf346"' }>
                                        <li class="link">
                                            <a href="injectables/CryptoService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CryptoService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/EncryptionService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EncryptionService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CryptoModule.html" data-type="entity-link" >CryptoModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoModule-5e7f4fe8136ac7851607dece15a97422553de673a3c8161e3b50076f8bdf465ea8f1f34eeebd71b1eacfacf4c7ae79715f521b76e19f7677ac2a77b0245e6795-1"' : 'data-bs-target="#xs-injectables-links-module-CryptoModule-5e7f4fe8136ac7851607dece15a97422553de673a3c8161e3b50076f8bdf465ea8f1f34eeebd71b1eacfacf4c7ae79715f521b76e19f7677ac2a77b0245e6795-1"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoModule-5e7f4fe8136ac7851607dece15a97422553de673a3c8161e3b50076f8bdf465ea8f1f34eeebd71b1eacfacf4c7ae79715f521b76e19f7677ac2a77b0245e6795-1"' :
                                        'id="xs-injectables-links-module-CryptoModule-5e7f4fe8136ac7851607dece15a97422553de673a3c8161e3b50076f8bdf465ea8f1f34eeebd71b1eacfacf4c7ae79715f521b76e19f7677ac2a77b0245e6795-1"' }>
                                        <li class="link">
                                            <a href="injectables/CryptoService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CryptoService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/DatabaseModule.html" data-type="entity-link" >DatabaseModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/HealthModule.html" data-type="entity-link" >HealthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-HealthModule-d1a9d4a406b23db10df33aa6617c5a25fc8e1d539ff781d3ae92e6eaf146fff94f17b33d80f2595b9749c0ee3de16de7e3ecd0dd49c1af32d55ce4b375af6eb3"' : 'data-bs-target="#xs-controllers-links-module-HealthModule-d1a9d4a406b23db10df33aa6617c5a25fc8e1d539ff781d3ae92e6eaf146fff94f17b33d80f2595b9749c0ee3de16de7e3ecd0dd49c1af32d55ce4b375af6eb3"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-HealthModule-d1a9d4a406b23db10df33aa6617c5a25fc8e1d539ff781d3ae92e6eaf146fff94f17b33d80f2595b9749c0ee3de16de7e3ecd0dd49c1af32d55ce4b375af6eb3"' :
                                            'id="xs-controllers-links-module-HealthModule-d1a9d4a406b23db10df33aa6617c5a25fc8e1d539ff781d3ae92e6eaf146fff94f17b33d80f2595b9749c0ee3de16de7e3ecd0dd49c1af32d55ce4b375af6eb3"' }>
                                            <li class="link">
                                                <a href="controllers/HealthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >HealthController</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/IssuerModule.html" data-type="entity-link" >IssuerModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-IssuerModule-ea2b8a2fbba67d1afb877b09c73426bfb323126da48ef9e2c3f68c0869919843e2ba1a47cc090e7ca5299548926dc6380296723a9aedd34fd02ffbf4b610708d"' : 'data-bs-target="#xs-controllers-links-module-IssuerModule-ea2b8a2fbba67d1afb877b09c73426bfb323126da48ef9e2c3f68c0869919843e2ba1a47cc090e7ca5299548926dc6380296723a9aedd34fd02ffbf4b610708d"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-IssuerModule-ea2b8a2fbba67d1afb877b09c73426bfb323126da48ef9e2c3f68c0869919843e2ba1a47cc090e7ca5299548926dc6380296723a9aedd34fd02ffbf4b610708d"' :
                                            'id="xs-controllers-links-module-IssuerModule-ea2b8a2fbba67d1afb877b09c73426bfb323126da48ef9e2c3f68c0869919843e2ba1a47cc090e7ca5299548926dc6380296723a9aedd34fd02ffbf4b610708d"' }>
                                            <li class="link">
                                                <a href="controllers/AuthorizeController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthorizeController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/CredentialsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CredentialsController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/CredentialsMetadataController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CredentialsMetadataController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/IssuanceController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IssuanceController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/IssuerManagementController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IssuerManagementController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/Oid4vciController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vciController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-IssuerModule-ea2b8a2fbba67d1afb877b09c73426bfb323126da48ef9e2c3f68c0869919843e2ba1a47cc090e7ca5299548926dc6380296723a9aedd34fd02ffbf4b610708d"' : 'data-bs-target="#xs-injectables-links-module-IssuerModule-ea2b8a2fbba67d1afb877b09c73426bfb323126da48ef9e2c3f68c0869919843e2ba1a47cc090e7ca5299548926dc6380296723a9aedd34fd02ffbf4b610708d"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IssuerModule-ea2b8a2fbba67d1afb877b09c73426bfb323126da48ef9e2c3f68c0869919843e2ba1a47cc090e7ca5299548926dc6380296723a9aedd34fd02ffbf4b610708d"' :
                                        'id="xs-injectables-links-module-IssuerModule-ea2b8a2fbba67d1afb877b09c73426bfb323126da48ef9e2c3f68c0869919843e2ba1a47cc090e7ca5299548926dc6380296723a9aedd34fd02ffbf4b610708d"' }>
                                        <li class="link">
                                            <a href="injectables/AuthorizeService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthorizeService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/CredentialConfigService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CredentialConfigService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/CredentialsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CredentialsService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/IssuanceService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IssuanceService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/Oid4vciService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vciService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SessionLoggerInterceptor.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionLoggerInterceptor</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SessionLoggerService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionLoggerService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WebhookService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WebhookService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/KeyModule.html" data-type="entity-link" >KeyModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/Oid4vpModule.html" data-type="entity-link" >Oid4vpModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-Oid4vpModule-7e5cbe767edee0eb31befbdc74e8044a5770863367bede9c46c8c6e462a6667ebc70d74cdb37df7a45c0504a6edc4aead9485729d667fece30bbcb9f882a6ca4"' : 'data-bs-target="#xs-controllers-links-module-Oid4vpModule-7e5cbe767edee0eb31befbdc74e8044a5770863367bede9c46c8c6e462a6667ebc70d74cdb37df7a45c0504a6edc4aead9485729d667fece30bbcb9f882a6ca4"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-Oid4vpModule-7e5cbe767edee0eb31befbdc74e8044a5770863367bede9c46c8c6e462a6667ebc70d74cdb37df7a45c0504a6edc4aead9485729d667fece30bbcb9f882a6ca4"' :
                                            'id="xs-controllers-links-module-Oid4vpModule-7e5cbe767edee0eb31befbdc74e8044a5770863367bede9c46c8c6e462a6667ebc70d74cdb37df7a45c0504a6edc4aead9485729d667fece30bbcb9f882a6ca4"' }>
                                            <li class="link">
                                                <a href="controllers/Oid4vpController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vpController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-Oid4vpModule-7e5cbe767edee0eb31befbdc74e8044a5770863367bede9c46c8c6e462a6667ebc70d74cdb37df7a45c0504a6edc4aead9485729d667fece30bbcb9f882a6ca4"' : 'data-bs-target="#xs-injectables-links-module-Oid4vpModule-7e5cbe767edee0eb31befbdc74e8044a5770863367bede9c46c8c6e462a6667ebc70d74cdb37df7a45c0504a6edc4aead9485729d667fece30bbcb9f882a6ca4"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-Oid4vpModule-7e5cbe767edee0eb31befbdc74e8044a5770863367bede9c46c8c6e462a6667ebc70d74cdb37df7a45c0504a6edc4aead9485729d667fece30bbcb9f882a6ca4"' :
                                        'id="xs-injectables-links-module-Oid4vpModule-7e5cbe767edee0eb31befbdc74e8044a5770863367bede9c46c8c6e462a6667ebc70d74cdb37df7a45c0504a6edc4aead9485729d667fece30bbcb9f882a6ca4"' }>
                                        <li class="link">
                                            <a href="injectables/Oid4vpService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vpService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SessionLoggerInterceptor.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionLoggerInterceptor</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SessionLoggerService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionLoggerService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WebhookService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WebhookService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/PresentationsModule.html" data-type="entity-link" >PresentationsModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-PresentationsModule-84800fa9fccec7ef235be886b7face663a313ab4b1b81c669998a95eaea8176f43307cc78637e5da50fb5498b328681c8e8f16097b9d5a3d0dadddc67d337b7a"' : 'data-bs-target="#xs-controllers-links-module-PresentationsModule-84800fa9fccec7ef235be886b7face663a313ab4b1b81c669998a95eaea8176f43307cc78637e5da50fb5498b328681c8e8f16097b9d5a3d0dadddc67d337b7a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-PresentationsModule-84800fa9fccec7ef235be886b7face663a313ab4b1b81c669998a95eaea8176f43307cc78637e5da50fb5498b328681c8e8f16097b9d5a3d0dadddc67d337b7a"' :
                                            'id="xs-controllers-links-module-PresentationsModule-84800fa9fccec7ef235be886b7face663a313ab4b1b81c669998a95eaea8176f43307cc78637e5da50fb5498b328681c8e8f16097b9d5a3d0dadddc67d337b7a"' }>
                                            <li class="link">
                                                <a href="controllers/PresentationManagementController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PresentationManagementController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PresentationsModule-84800fa9fccec7ef235be886b7face663a313ab4b1b81c669998a95eaea8176f43307cc78637e5da50fb5498b328681c8e8f16097b9d5a3d0dadddc67d337b7a"' : 'data-bs-target="#xs-injectables-links-module-PresentationsModule-84800fa9fccec7ef235be886b7face663a313ab4b1b81c669998a95eaea8176f43307cc78637e5da50fb5498b328681c8e8f16097b9d5a3d0dadddc67d337b7a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PresentationsModule-84800fa9fccec7ef235be886b7face663a313ab4b1b81c669998a95eaea8176f43307cc78637e5da50fb5498b328681c8e8f16097b9d5a3d0dadddc67d337b7a"' :
                                        'id="xs-injectables-links-module-PresentationsModule-84800fa9fccec7ef235be886b7face663a313ab4b1b81c669998a95eaea8176f43307cc78637e5da50fb5498b328681c8e8f16097b9d5a3d0dadddc67d337b7a"' }>
                                        <li class="link">
                                            <a href="injectables/PresentationsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PresentationsService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/RegistrarModule.html" data-type="entity-link" >RegistrarModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-RegistrarModule-ef17a1a97f22a60285af636936788791074a1e2fd0753db3acc9c3c9e0e5ff2eb952d74416f1842ffdd3119399040c04640a55dd018b64c44dbbe068cac81394"' : 'data-bs-target="#xs-injectables-links-module-RegistrarModule-ef17a1a97f22a60285af636936788791074a1e2fd0753db3acc9c3c9e0e5ff2eb952d74416f1842ffdd3119399040c04640a55dd018b64c44dbbe068cac81394"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-RegistrarModule-ef17a1a97f22a60285af636936788791074a1e2fd0753db3acc9c3c9e0e5ff2eb952d74416f1842ffdd3119399040c04640a55dd018b64c44dbbe068cac81394"' :
                                        'id="xs-injectables-links-module-RegistrarModule-ef17a1a97f22a60285af636936788791074a1e2fd0753db3acc9c3c9e0e5ff2eb952d74416f1842ffdd3119399040c04640a55dd018b64c44dbbe068cac81394"' }>
                                        <li class="link">
                                            <a href="injectables/RegistrarService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RegistrarService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/ResolverModule.html" data-type="entity-link" >ResolverModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ResolverModule-4ceeaf2c7457d560acd819f3825f2abad5e0e8150a4908e221c28459ae51b0d252fa3070a5bcae74b604ea5a0d1bd4eaa8d0e07c9c90987d862cf550c7f7c6bf"' : 'data-bs-target="#xs-injectables-links-module-ResolverModule-4ceeaf2c7457d560acd819f3825f2abad5e0e8150a4908e221c28459ae51b0d252fa3070a5bcae74b604ea5a0d1bd4eaa8d0e07c9c90987d862cf550c7f7c6bf"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ResolverModule-4ceeaf2c7457d560acd819f3825f2abad5e0e8150a4908e221c28459ae51b0d252fa3070a5bcae74b604ea5a0d1bd4eaa8d0e07c9c90987d862cf550c7f7c6bf"' :
                                        'id="xs-injectables-links-module-ResolverModule-4ceeaf2c7457d560acd819f3825f2abad5e0e8150a4908e221c28459ae51b0d252fa3070a5bcae74b604ea5a0d1bd4eaa8d0e07c9c90987d862cf550c7f7c6bf"' }>
                                        <li class="link">
                                            <a href="injectables/ResolverService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ResolverService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/SessionModule.html" data-type="entity-link" >SessionModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-SessionModule-96ad387fb07513c676de6335d4f0a987ec4796294729a9b47cc5389bf8cd4ac417af5016e7edf2b833a15a746e576d6906e4fc720dc3300915b5354226306cc5"' : 'data-bs-target="#xs-controllers-links-module-SessionModule-96ad387fb07513c676de6335d4f0a987ec4796294729a9b47cc5389bf8cd4ac417af5016e7edf2b833a15a746e576d6906e4fc720dc3300915b5354226306cc5"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SessionModule-96ad387fb07513c676de6335d4f0a987ec4796294729a9b47cc5389bf8cd4ac417af5016e7edf2b833a15a746e576d6906e4fc720dc3300915b5354226306cc5"' :
                                            'id="xs-controllers-links-module-SessionModule-96ad387fb07513c676de6335d4f0a987ec4796294729a9b47cc5389bf8cd4ac417af5016e7edf2b833a15a746e576d6906e4fc720dc3300915b5354226306cc5"' }>
                                            <li class="link">
                                                <a href="controllers/SessionController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SessionModule-96ad387fb07513c676de6335d4f0a987ec4796294729a9b47cc5389bf8cd4ac417af5016e7edf2b833a15a746e576d6906e4fc720dc3300915b5354226306cc5"' : 'data-bs-target="#xs-injectables-links-module-SessionModule-96ad387fb07513c676de6335d4f0a987ec4796294729a9b47cc5389bf8cd4ac417af5016e7edf2b833a15a746e576d6906e4fc720dc3300915b5354226306cc5"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SessionModule-96ad387fb07513c676de6335d4f0a987ec4796294729a9b47cc5389bf8cd4ac417af5016e7edf2b833a15a746e576d6906e4fc720dc3300915b5354226306cc5"' :
                                        'id="xs-injectables-links-module-SessionModule-96ad387fb07513c676de6335d4f0a987ec4796294729a9b47cc5389bf8cd4ac417af5016e7edf2b833a15a746e576d6906e4fc720dc3300915b5354226306cc5"' }>
                                        <li class="link">
                                            <a href="injectables/SessionService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/StatusListModule.html" data-type="entity-link" >StatusListModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-StatusListModule-581ba2a822e1249087007ffbc593d0ba2375a6646b476cc31d4c3243b499fd8d39b7b22aa668d6af6b6b26091d2dd9859d74cf14833b796c45a7fde3fd06bbf9"' : 'data-bs-target="#xs-controllers-links-module-StatusListModule-581ba2a822e1249087007ffbc593d0ba2375a6646b476cc31d4c3243b499fd8d39b7b22aa668d6af6b6b26091d2dd9859d74cf14833b796c45a7fde3fd06bbf9"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-StatusListModule-581ba2a822e1249087007ffbc593d0ba2375a6646b476cc31d4c3243b499fd8d39b7b22aa668d6af6b6b26091d2dd9859d74cf14833b796c45a7fde3fd06bbf9"' :
                                            'id="xs-controllers-links-module-StatusListModule-581ba2a822e1249087007ffbc593d0ba2375a6646b476cc31d4c3243b499fd8d39b7b22aa668d6af6b6b26091d2dd9859d74cf14833b796c45a7fde3fd06bbf9"' }>
                                            <li class="link">
                                                <a href="controllers/StatusListController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-StatusListModule-581ba2a822e1249087007ffbc593d0ba2375a6646b476cc31d4c3243b499fd8d39b7b22aa668d6af6b6b26091d2dd9859d74cf14833b796c45a7fde3fd06bbf9"' : 'data-bs-target="#xs-injectables-links-module-StatusListModule-581ba2a822e1249087007ffbc593d0ba2375a6646b476cc31d4c3243b499fd8d39b7b22aa668d6af6b6b26091d2dd9859d74cf14833b796c45a7fde3fd06bbf9"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-StatusListModule-581ba2a822e1249087007ffbc593d0ba2375a6646b476cc31d4c3243b499fd8d39b7b22aa668d6af6b6b26091d2dd9859d74cf14833b796c45a7fde3fd06bbf9"' :
                                        'id="xs-injectables-links-module-StatusListModule-581ba2a822e1249087007ffbc593d0ba2375a6646b476cc31d4c3243b499fd8d39b7b22aa668d6af6b6b26091d2dd9859d74cf14833b796c45a7fde3fd06bbf9"' }>
                                        <li class="link">
                                            <a href="injectables/StatusListService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/VerifierModule.html" data-type="entity-link" >VerifierModule</a>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#entities-links"' :
                                'data-bs-target="#xs-entities-links"' }>
                                <span class="icon ion-ios-apps"></span>
                                <span>Entities</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="entities-links"' : 'id="xs-entities-links"' }>
                                <li class="link">
                                    <a href="entities/CredentialConfig.html" data-type="entity-link" >CredentialConfig</a>
                                </li>
                                <li class="link">
                                    <a href="entities/IssuanceConfig.html" data-type="entity-link" >IssuanceConfig</a>
                                </li>
                                <li class="link">
                                    <a href="entities/KeyEntity.html" data-type="entity-link" >KeyEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/PresentationConfig.html" data-type="entity-link" >PresentationConfig</a>
                                </li>
                                <li class="link">
                                    <a href="entities/Session.html" data-type="entity-link" >Session</a>
                                </li>
                                <li class="link">
                                    <a href="entities/StatusMapping.html" data-type="entity-link" >StatusMapping</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/ApiKeyConfig.html" data-type="entity-link" >ApiKeyConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthenticationConfigDto.html" data-type="entity-link" >AuthenticationConfigDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthenticationConfigHelper.html" data-type="entity-link" >AuthenticationConfigHelper</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthenticationUrlConfig.html" data-type="entity-link" >AuthenticationUrlConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthorizationResponse.html" data-type="entity-link" >AuthorizationResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthorizeQueries.html" data-type="entity-link" >AuthorizeQueries</a>
                            </li>
                            <li class="link">
                                <a href="classes/ClientCredentialsDto.html" data-type="entity-link" >ClientCredentialsDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialIssuerMetadataDto.html" data-type="entity-link" >CredentialIssuerMetadataDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/EC_Public.html" data-type="entity-link" >EC_Public</a>
                            </li>
                            <li class="link">
                                <a href="classes/IssuanceDto.html" data-type="entity-link" >IssuanceDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/JwksResponseDto.html" data-type="entity-link" >JwksResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/KeyService.html" data-type="entity-link" >KeyService</a>
                            </li>
                            <li class="link">
                                <a href="classes/NotificationRequestDto.html" data-type="entity-link" >NotificationRequestDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/Oauth2AuthorizationServerResponse.html" data-type="entity-link" >Oauth2AuthorizationServerResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/OfferRequestDto.html" data-type="entity-link" >OfferRequestDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/OfferResponse.html" data-type="entity-link" >OfferResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/ParResponseDto.html" data-type="entity-link" >ParResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/PresentationDuringIssuance.html" data-type="entity-link" >PresentationDuringIssuance</a>
                            </li>
                            <li class="link">
                                <a href="classes/PresentationDuringIssuanceConfig.html" data-type="entity-link" >PresentationDuringIssuanceConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/PresentationRequest.html" data-type="entity-link" >PresentationRequest</a>
                            </li>
                            <li class="link">
                                <a href="classes/RegistrarConfig.html" data-type="entity-link" >RegistrarConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/RegistrationCertificateRequest.html" data-type="entity-link" >RegistrationCertificateRequest</a>
                            </li>
                            <li class="link">
                                <a href="classes/SchemaResponse.html" data-type="entity-link" >SchemaResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/StatusUpdateDto.html" data-type="entity-link" >StatusUpdateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/TokenResponse.html" data-type="entity-link" >TokenResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/VCT.html" data-type="entity-link" >VCT</a>
                            </li>
                            <li class="link">
                                <a href="classes/WebHookAuthConfig.html" data-type="entity-link" >WebHookAuthConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/WebhookConfig.html" data-type="entity-link" >WebhookConfig</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/FileSystemKeyService.html" data-type="entity-link" >FileSystemKeyService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LoggerConfigService.html" data-type="entity-link" >LoggerConfigService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/VaultKeyService.html" data-type="entity-link" >VaultKeyService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AccessCertificateResponse.html" data-type="entity-link" >AccessCertificateResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuthResponse.html" data-type="entity-link" >AuthResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Client.html" data-type="entity-link" >Client</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CryptoImplementation.html" data-type="entity-link" >CryptoImplementation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GenerateTokenOptions.html" data-type="entity-link" >GenerateTokenOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IssuerMetadata.html" data-type="entity-link" >IssuerMetadata</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoggerConfiguration.html" data-type="entity-link" >LoggerConfiguration</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParsedAccessTokenAuthorizationCodeRequestGrant.html" data-type="entity-link" >ParsedAccessTokenAuthorizationCodeRequestGrant</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParsedAccessTokenPreAuthorizedCodeRequestGrant.html" data-type="entity-link" >ParsedAccessTokenPreAuthorizedCodeRequestGrant</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PresentationRequestOptions.html" data-type="entity-link" >PresentationRequestOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionLogContext.html" data-type="entity-link" >SessionLogContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StatusListFile.html" data-type="entity-link" >StatusListFile</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TokenPayload.html" data-type="entity-link" >TokenPayload</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});