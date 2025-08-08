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
                                            'data-bs-target="#controllers-links-module-AppModule-32acf1898c0c0852a174c21d6f10ef12a2c3e71132492a357b6b7147e2d4b05f4ebc358f3ea29ad15830cda23ea752d47696c9fdb0a38f277afb6789087cc35a"' : 'data-bs-target="#xs-controllers-links-module-AppModule-32acf1898c0c0852a174c21d6f10ef12a2c3e71132492a357b6b7147e2d4b05f4ebc358f3ea29ad15830cda23ea752d47696c9fdb0a38f277afb6789087cc35a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-32acf1898c0c0852a174c21d6f10ef12a2c3e71132492a357b6b7147e2d4b05f4ebc358f3ea29ad15830cda23ea752d47696c9fdb0a38f277afb6789087cc35a"' :
                                            'id="xs-controllers-links-module-AppModule-32acf1898c0c0852a174c21d6f10ef12a2c3e71132492a357b6b7147e2d4b05f4ebc358f3ea29ad15830cda23ea752d47696c9fdb0a38f277afb6789087cc35a"' }>
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
                                        'data-bs-target="#injectables-links-module-AppModule-32acf1898c0c0852a174c21d6f10ef12a2c3e71132492a357b6b7147e2d4b05f4ebc358f3ea29ad15830cda23ea752d47696c9fdb0a38f277afb6789087cc35a"' : 'data-bs-target="#xs-injectables-links-module-AppModule-32acf1898c0c0852a174c21d6f10ef12a2c3e71132492a357b6b7147e2d4b05f4ebc358f3ea29ad15830cda23ea752d47696c9fdb0a38f277afb6789087cc35a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-32acf1898c0c0852a174c21d6f10ef12a2c3e71132492a357b6b7147e2d4b05f4ebc358f3ea29ad15830cda23ea752d47696c9fdb0a38f277afb6789087cc35a"' :
                                        'id="xs-injectables-links-module-AppModule-32acf1898c0c0852a174c21d6f10ef12a2c3e71132492a357b6b7147e2d4b05f4ebc358f3ea29ad15830cda23ea752d47696c9fdb0a38f277afb6789087cc35a"' }>
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
                                            'data-bs-target="#controllers-links-module-AuthModule-c88efca69987bba0718e58d8319d4219e645a926250c94a33b040500c1a0a96ac589f7fa8d317f1ce3294ab7dfbb0812abb102fe11fcf3a886837f0a894efe5e"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-c88efca69987bba0718e58d8319d4219e645a926250c94a33b040500c1a0a96ac589f7fa8d317f1ce3294ab7dfbb0812abb102fe11fcf3a886837f0a894efe5e"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-c88efca69987bba0718e58d8319d4219e645a926250c94a33b040500c1a0a96ac589f7fa8d317f1ce3294ab7dfbb0812abb102fe11fcf3a886837f0a894efe5e"' :
                                            'id="xs-controllers-links-module-AuthModule-c88efca69987bba0718e58d8319d4219e645a926250c94a33b040500c1a0a96ac589f7fa8d317f1ce3294ab7dfbb0812abb102fe11fcf3a886837f0a894efe5e"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-c88efca69987bba0718e58d8319d4219e645a926250c94a33b040500c1a0a96ac589f7fa8d317f1ce3294ab7dfbb0812abb102fe11fcf3a886837f0a894efe5e"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-c88efca69987bba0718e58d8319d4219e645a926250c94a33b040500c1a0a96ac589f7fa8d317f1ce3294ab7dfbb0812abb102fe11fcf3a886837f0a894efe5e"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-c88efca69987bba0718e58d8319d4219e645a926250c94a33b040500c1a0a96ac589f7fa8d317f1ce3294ab7dfbb0812abb102fe11fcf3a886837f0a894efe5e"' :
                                        'id="xs-injectables-links-module-AuthModule-c88efca69987bba0718e58d8319d4219e645a926250c94a33b040500c1a0a96ac589f7fa8d317f1ce3294ab7dfbb0812abb102fe11fcf3a886837f0a894efe5e"' }>
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
                                <a href="modules/CryptoImplementatationModule.html" data-type="entity-link" >CryptoImplementatationModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoImplementatationModule-61115413b19a3e9775b728b8d40c0d155fe97f1e8827b171dbd9717d0ee43fa5bf44b643d80a7c6b389f26a0306014206af5f10dccce326e9fdd8d3841e03744"' : 'data-bs-target="#xs-injectables-links-module-CryptoImplementatationModule-61115413b19a3e9775b728b8d40c0d155fe97f1e8827b171dbd9717d0ee43fa5bf44b643d80a7c6b389f26a0306014206af5f10dccce326e9fdd8d3841e03744"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoImplementatationModule-61115413b19a3e9775b728b8d40c0d155fe97f1e8827b171dbd9717d0ee43fa5bf44b643d80a7c6b389f26a0306014206af5f10dccce326e9fdd8d3841e03744"' :
                                        'id="xs-injectables-links-module-CryptoImplementatationModule-61115413b19a3e9775b728b8d40c0d155fe97f1e8827b171dbd9717d0ee43fa5bf44b643d80a7c6b389f26a0306014206af5f10dccce326e9fdd8d3841e03744"' }>
                                        <li class="link">
                                            <a href="injectables/CryptoImplementationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CryptoImplementationService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CryptoModule.html" data-type="entity-link" >CryptoModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-CryptoModule-d7e4cf480b5613d2cd16c86a0ecda95b9e4fdb8d9b7ecf8ec21998ae71b996718ed11aa7b33558e30e149088ce89ff8c5ce22f03920bd7bb87d599c87165cd1a"' : 'data-bs-target="#xs-controllers-links-module-CryptoModule-d7e4cf480b5613d2cd16c86a0ecda95b9e4fdb8d9b7ecf8ec21998ae71b996718ed11aa7b33558e30e149088ce89ff8c5ce22f03920bd7bb87d599c87165cd1a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-CryptoModule-d7e4cf480b5613d2cd16c86a0ecda95b9e4fdb8d9b7ecf8ec21998ae71b996718ed11aa7b33558e30e149088ce89ff8c5ce22f03920bd7bb87d599c87165cd1a"' :
                                            'id="xs-controllers-links-module-CryptoModule-d7e4cf480b5613d2cd16c86a0ecda95b9e4fdb8d9b7ecf8ec21998ae71b996718ed11aa7b33558e30e149088ce89ff8c5ce22f03920bd7bb87d599c87165cd1a"' }>
                                            <li class="link">
                                                <a href="controllers/KeyController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >KeyController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoModule-d7e4cf480b5613d2cd16c86a0ecda95b9e4fdb8d9b7ecf8ec21998ae71b996718ed11aa7b33558e30e149088ce89ff8c5ce22f03920bd7bb87d599c87165cd1a"' : 'data-bs-target="#xs-injectables-links-module-CryptoModule-d7e4cf480b5613d2cd16c86a0ecda95b9e4fdb8d9b7ecf8ec21998ae71b996718ed11aa7b33558e30e149088ce89ff8c5ce22f03920bd7bb87d599c87165cd1a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoModule-d7e4cf480b5613d2cd16c86a0ecda95b9e4fdb8d9b7ecf8ec21998ae71b996718ed11aa7b33558e30e149088ce89ff8c5ce22f03920bd7bb87d599c87165cd1a"' :
                                        'id="xs-injectables-links-module-CryptoModule-d7e4cf480b5613d2cd16c86a0ecda95b9e4fdb8d9b7ecf8ec21998ae71b996718ed11aa7b33558e30e149088ce89ff8c5ce22f03920bd7bb87d599c87165cd1a"' }>
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
                                            'data-bs-target="#controllers-links-module-IssuerModule-dbd1529b5d0f80118d17b6bcc8f3d842972c0349fc1292c6bb5fb7b83cfd411d07bf369e6fb9cc25d064598bbb1c27f64f3846d53e2abef2975947d7325e2771"' : 'data-bs-target="#xs-controllers-links-module-IssuerModule-dbd1529b5d0f80118d17b6bcc8f3d842972c0349fc1292c6bb5fb7b83cfd411d07bf369e6fb9cc25d064598bbb1c27f64f3846d53e2abef2975947d7325e2771"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-IssuerModule-dbd1529b5d0f80118d17b6bcc8f3d842972c0349fc1292c6bb5fb7b83cfd411d07bf369e6fb9cc25d064598bbb1c27f64f3846d53e2abef2975947d7325e2771"' :
                                            'id="xs-controllers-links-module-IssuerModule-dbd1529b5d0f80118d17b6bcc8f3d842972c0349fc1292c6bb5fb7b83cfd411d07bf369e6fb9cc25d064598bbb1c27f64f3846d53e2abef2975947d7325e2771"' }>
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
                                        'data-bs-target="#injectables-links-module-IssuerModule-dbd1529b5d0f80118d17b6bcc8f3d842972c0349fc1292c6bb5fb7b83cfd411d07bf369e6fb9cc25d064598bbb1c27f64f3846d53e2abef2975947d7325e2771"' : 'data-bs-target="#xs-injectables-links-module-IssuerModule-dbd1529b5d0f80118d17b6bcc8f3d842972c0349fc1292c6bb5fb7b83cfd411d07bf369e6fb9cc25d064598bbb1c27f64f3846d53e2abef2975947d7325e2771"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IssuerModule-dbd1529b5d0f80118d17b6bcc8f3d842972c0349fc1292c6bb5fb7b83cfd411d07bf369e6fb9cc25d064598bbb1c27f64f3846d53e2abef2975947d7325e2771"' :
                                        'id="xs-injectables-links-module-IssuerModule-dbd1529b5d0f80118d17b6bcc8f3d842972c0349fc1292c6bb5fb7b83cfd411d07bf369e6fb9cc25d064598bbb1c27f64f3846d53e2abef2975947d7325e2771"' }>
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
                                <a href="modules/MetricModule.html" data-type="entity-link" >MetricModule</a>
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
                                            'data-bs-target="#controllers-links-module-SessionModule-9bf7e6364843280f616b8669dec3b9d84d9f46b48cfbf111529057dc5eda4f89e66c21156e3aff6b757a4ca748a1aef350239b2570f40d7684245d3bbe304529"' : 'data-bs-target="#xs-controllers-links-module-SessionModule-9bf7e6364843280f616b8669dec3b9d84d9f46b48cfbf111529057dc5eda4f89e66c21156e3aff6b757a4ca748a1aef350239b2570f40d7684245d3bbe304529"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SessionModule-9bf7e6364843280f616b8669dec3b9d84d9f46b48cfbf111529057dc5eda4f89e66c21156e3aff6b757a4ca748a1aef350239b2570f40d7684245d3bbe304529"' :
                                            'id="xs-controllers-links-module-SessionModule-9bf7e6364843280f616b8669dec3b9d84d9f46b48cfbf111529057dc5eda4f89e66c21156e3aff6b757a4ca748a1aef350239b2570f40d7684245d3bbe304529"' }>
                                            <li class="link">
                                                <a href="controllers/SessionController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SessionModule-9bf7e6364843280f616b8669dec3b9d84d9f46b48cfbf111529057dc5eda4f89e66c21156e3aff6b757a4ca748a1aef350239b2570f40d7684245d3bbe304529"' : 'data-bs-target="#xs-injectables-links-module-SessionModule-9bf7e6364843280f616b8669dec3b9d84d9f46b48cfbf111529057dc5eda4f89e66c21156e3aff6b757a4ca748a1aef350239b2570f40d7684245d3bbe304529"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SessionModule-9bf7e6364843280f616b8669dec3b9d84d9f46b48cfbf111529057dc5eda4f89e66c21156e3aff6b757a4ca748a1aef350239b2570f40d7684245d3bbe304529"' :
                                        'id="xs-injectables-links-module-SessionModule-9bf7e6364843280f616b8669dec3b9d84d9f46b48cfbf111529057dc5eda4f89e66c21156e3aff6b757a4ca748a1aef350239b2570f40d7684245d3bbe304529"' }>
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
                                    <a href="entities/CertEntity.html" data-type="entity-link" >CertEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/ClientEntry.html" data-type="entity-link" >ClientEntry</a>
                                </li>
                                <li class="link">
                                    <a href="entities/CredentialConfig.html" data-type="entity-link" >CredentialConfig</a>
                                </li>
                                <li class="link">
                                    <a href="entities/CredentialIssuanceBinding.html" data-type="entity-link" >CredentialIssuanceBinding</a>
                                </li>
                                <li class="link">
                                    <a href="entities/IssuanceConfig.html" data-type="entity-link" >IssuanceConfig</a>
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
                                <a href="classes/CreateCredentialIssuanceBindingDto.html" data-type="entity-link" >CreateCredentialIssuanceBindingDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialConfigMapping.html" data-type="entity-link" >CredentialConfigMapping</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialIssuanceBindingResponseDto.html" data-type="entity-link" >CredentialIssuanceBindingResponseDto</a>
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
                                <a href="classes/Key.html" data-type="entity-link" >Key</a>
                            </li>
                            <li class="link">
                                <a href="classes/KeyImportDto.html" data-type="entity-link" >KeyImportDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/KeyObj.html" data-type="entity-link" >KeyObj</a>
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
                                <a href="classes/UpdateCredentialIssuanceBindingDto.html" data-type="entity-link" >UpdateCredentialIssuanceBindingDto</a>
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
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#guards-links"' :
                            'data-bs-target="#xs-guards-links"' }>
                            <span class="icon ion-ios-lock"></span>
                            <span>Guards</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="guards-links"' : 'id="xs-guards-links"' }>
                            <li class="link">
                                <a href="guards/SessionGuard.html" data-type="entity-link" >SessionGuard</a>
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