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
                    <a href="index.html" data-type="index-link">@eudiplo/backend documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="index.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
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
                                            'data-bs-target="#controllers-links-module-AppModule-67e3d1203d0f2b81873f5ddaa9f3c266a5b5ab3908a57bd4baae96f2ab51f1cb0643c1e2010c1d78db7a8e301a5cfe08009b6ae595039cf511f9134c1064b5a7"' : 'data-bs-target="#xs-controllers-links-module-AppModule-67e3d1203d0f2b81873f5ddaa9f3c266a5b5ab3908a57bd4baae96f2ab51f1cb0643c1e2010c1d78db7a8e301a5cfe08009b6ae595039cf511f9134c1064b5a7"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-67e3d1203d0f2b81873f5ddaa9f3c266a5b5ab3908a57bd4baae96f2ab51f1cb0643c1e2010c1d78db7a8e301a5cfe08009b6ae595039cf511f9134c1064b5a7"' :
                                            'id="xs-controllers-links-module-AppModule-67e3d1203d0f2b81873f5ddaa9f3c266a5b5ab3908a57bd4baae96f2ab51f1cb0643c1e2010c1d78db7a8e301a5cfe08009b6ae595039cf511f9134c1064b5a7"' }>
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
                                        'data-bs-target="#injectables-links-module-AppModule-67e3d1203d0f2b81873f5ddaa9f3c266a5b5ab3908a57bd4baae96f2ab51f1cb0643c1e2010c1d78db7a8e301a5cfe08009b6ae595039cf511f9134c1064b5a7"' : 'data-bs-target="#xs-injectables-links-module-AppModule-67e3d1203d0f2b81873f5ddaa9f3c266a5b5ab3908a57bd4baae96f2ab51f1cb0643c1e2010c1d78db7a8e301a5cfe08009b6ae595039cf511f9134c1064b5a7"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-67e3d1203d0f2b81873f5ddaa9f3c266a5b5ab3908a57bd4baae96f2ab51f1cb0643c1e2010c1d78db7a8e301a5cfe08009b6ae595039cf511f9134c1064b5a7"' :
                                        'id="xs-injectables-links-module-AppModule-67e3d1203d0f2b81873f5ddaa9f3c266a5b5ab3908a57bd4baae96f2ab51f1cb0643c1e2010c1d78db7a8e301a5cfe08009b6ae595039cf511f9134c1064b5a7"' }>
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
                                            'data-bs-target="#controllers-links-module-AuthModule-776efa5d0feea5bcf5f155db829b89d92c0b7e265048d7fbe08ff6e4d77f76507f31d76fb2258fbb8baa49cd3562ddf112ea042eb8a5e016b8b64942fd292566"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-776efa5d0feea5bcf5f155db829b89d92c0b7e265048d7fbe08ff6e4d77f76507f31d76fb2258fbb8baa49cd3562ddf112ea042eb8a5e016b8b64942fd292566"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-776efa5d0feea5bcf5f155db829b89d92c0b7e265048d7fbe08ff6e4d77f76507f31d76fb2258fbb8baa49cd3562ddf112ea042eb8a5e016b8b64942fd292566"' :
                                            'id="xs-controllers-links-module-AuthModule-776efa5d0feea5bcf5f155db829b89d92c0b7e265048d7fbe08ff6e4d77f76507f31d76fb2258fbb8baa49cd3562ddf112ea042eb8a5e016b8b64942fd292566"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/ClientController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ClientController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/TenantController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TenantController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-776efa5d0feea5bcf5f155db829b89d92c0b7e265048d7fbe08ff6e4d77f76507f31d76fb2258fbb8baa49cd3562ddf112ea042eb8a5e016b8b64942fd292566"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-776efa5d0feea5bcf5f155db829b89d92c0b7e265048d7fbe08ff6e4d77f76507f31d76fb2258fbb8baa49cd3562ddf112ea042eb8a5e016b8b64942fd292566"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-776efa5d0feea5bcf5f155db829b89d92c0b7e265048d7fbe08ff6e4d77f76507f31d76fb2258fbb8baa49cd3562ddf112ea042eb8a5e016b8b64942fd292566"' :
                                        'id="xs-injectables-links-module-AuthModule-776efa5d0feea5bcf5f155db829b89d92c0b7e265048d7fbe08ff6e4d77f76507f31d76fb2258fbb8baa49cd3562ddf112ea042eb8a5e016b8b64942fd292566"' }>
                                        <li class="link">
                                            <a href="injectables/AuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthService</a>
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
                                        <li class="link">
                                            <a href="injectables/TenantService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TenantService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CryptoImplementatationModule.html" data-type="entity-link" >CryptoImplementatationModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoImplementatationModule-7aa723cf8a4215e5f436d01da1833c67e4a4c8db340798045c144823b8d690a6f80da27d9224e540cbbb6211883311e062a278fb7b90f72bf84bb7eaf191e57b"' : 'data-bs-target="#xs-injectables-links-module-CryptoImplementatationModule-7aa723cf8a4215e5f436d01da1833c67e4a4c8db340798045c144823b8d690a6f80da27d9224e540cbbb6211883311e062a278fb7b90f72bf84bb7eaf191e57b"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoImplementatationModule-7aa723cf8a4215e5f436d01da1833c67e4a4c8db340798045c144823b8d690a6f80da27d9224e540cbbb6211883311e062a278fb7b90f72bf84bb7eaf191e57b"' :
                                        'id="xs-injectables-links-module-CryptoImplementatationModule-7aa723cf8a4215e5f436d01da1833c67e4a4c8db340798045c144823b8d690a6f80da27d9224e540cbbb6211883311e062a278fb7b90f72bf84bb7eaf191e57b"' }>
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
                                            'data-bs-target="#controllers-links-module-CryptoModule-ace1ada325d8fa2cd20f3cd1bd6b1a1873b2f060d7813dd57e85f7834d566594ae1ea54ad69bab542a08c619a1f5ea3ddfa09d39f5700606d3ab17c99a43e053"' : 'data-bs-target="#xs-controllers-links-module-CryptoModule-ace1ada325d8fa2cd20f3cd1bd6b1a1873b2f060d7813dd57e85f7834d566594ae1ea54ad69bab542a08c619a1f5ea3ddfa09d39f5700606d3ab17c99a43e053"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-CryptoModule-ace1ada325d8fa2cd20f3cd1bd6b1a1873b2f060d7813dd57e85f7834d566594ae1ea54ad69bab542a08c619a1f5ea3ddfa09d39f5700606d3ab17c99a43e053"' :
                                            'id="xs-controllers-links-module-CryptoModule-ace1ada325d8fa2cd20f3cd1bd6b1a1873b2f060d7813dd57e85f7834d566594ae1ea54ad69bab542a08c619a1f5ea3ddfa09d39f5700606d3ab17c99a43e053"' }>
                                            <li class="link">
                                                <a href="controllers/KeyController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >KeyController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoModule-ace1ada325d8fa2cd20f3cd1bd6b1a1873b2f060d7813dd57e85f7834d566594ae1ea54ad69bab542a08c619a1f5ea3ddfa09d39f5700606d3ab17c99a43e053"' : 'data-bs-target="#xs-injectables-links-module-CryptoModule-ace1ada325d8fa2cd20f3cd1bd6b1a1873b2f060d7813dd57e85f7834d566594ae1ea54ad69bab542a08c619a1f5ea3ddfa09d39f5700606d3ab17c99a43e053"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoModule-ace1ada325d8fa2cd20f3cd1bd6b1a1873b2f060d7813dd57e85f7834d566594ae1ea54ad69bab542a08c619a1f5ea3ddfa09d39f5700606d3ab17c99a43e053"' :
                                        'id="xs-injectables-links-module-CryptoModule-ace1ada325d8fa2cd20f3cd1bd6b1a1873b2f060d7813dd57e85f7834d566594ae1ea54ad69bab542a08c619a1f5ea3ddfa09d39f5700606d3ab17c99a43e053"' }>
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
                                            'data-bs-target="#controllers-links-module-HealthModule-26797648f5640dd2e676a6c3633e82b0a8b9124e3c4df37c6c0307fa1828fa6eb1f6299f275ffd3ec2f0beaa4455a8c67f58035a90a0cb6c4d3c84250a8dca54"' : 'data-bs-target="#xs-controllers-links-module-HealthModule-26797648f5640dd2e676a6c3633e82b0a8b9124e3c4df37c6c0307fa1828fa6eb1f6299f275ffd3ec2f0beaa4455a8c67f58035a90a0cb6c4d3c84250a8dca54"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-HealthModule-26797648f5640dd2e676a6c3633e82b0a8b9124e3c4df37c6c0307fa1828fa6eb1f6299f275ffd3ec2f0beaa4455a8c67f58035a90a0cb6c4d3c84250a8dca54"' :
                                            'id="xs-controllers-links-module-HealthModule-26797648f5640dd2e676a6c3633e82b0a8b9124e3c4df37c6c0307fa1828fa6eb1f6299f275ffd3ec2f0beaa4455a8c67f58035a90a0cb6c4d3c84250a8dca54"' }>
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
                                            'data-bs-target="#controllers-links-module-IssuerModule-4e605c42a2eaeed7d4f4cc6a2e5c589166206d837afc0c9f7d2ad5263c01ac5e711dbada7135ed7a91eb346cad966f63f9095a6ec79530eedfaf014703957602"' : 'data-bs-target="#xs-controllers-links-module-IssuerModule-4e605c42a2eaeed7d4f4cc6a2e5c589166206d837afc0c9f7d2ad5263c01ac5e711dbada7135ed7a91eb346cad966f63f9095a6ec79530eedfaf014703957602"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-IssuerModule-4e605c42a2eaeed7d4f4cc6a2e5c589166206d837afc0c9f7d2ad5263c01ac5e711dbada7135ed7a91eb346cad966f63f9095a6ec79530eedfaf014703957602"' :
                                            'id="xs-controllers-links-module-IssuerModule-4e605c42a2eaeed7d4f4cc6a2e5c589166206d837afc0c9f7d2ad5263c01ac5e711dbada7135ed7a91eb346cad966f63f9095a6ec79530eedfaf014703957602"' }>
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
                                                <a href="controllers/DisplayController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DisplayController</a>
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
                                        'data-bs-target="#injectables-links-module-IssuerModule-4e605c42a2eaeed7d4f4cc6a2e5c589166206d837afc0c9f7d2ad5263c01ac5e711dbada7135ed7a91eb346cad966f63f9095a6ec79530eedfaf014703957602"' : 'data-bs-target="#xs-injectables-links-module-IssuerModule-4e605c42a2eaeed7d4f4cc6a2e5c589166206d837afc0c9f7d2ad5263c01ac5e711dbada7135ed7a91eb346cad966f63f9095a6ec79530eedfaf014703957602"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IssuerModule-4e605c42a2eaeed7d4f4cc6a2e5c589166206d837afc0c9f7d2ad5263c01ac5e711dbada7135ed7a91eb346cad966f63f9095a6ec79530eedfaf014703957602"' :
                                        'id="xs-injectables-links-module-IssuerModule-4e605c42a2eaeed7d4f4cc6a2e5c589166206d837afc0c9f7d2ad5263c01ac5e711dbada7135ed7a91eb346cad966f63f9095a6ec79530eedfaf014703957602"' }>
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
                                            <a href="injectables/DisplayService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DisplayService</a>
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
                                            'data-bs-target="#controllers-links-module-Oid4vpModule-88990010d6ad177b03b49ccaee84ab9a9e2eb451fa9af1fdf7c4e321946ce22f8586e397f05d143021a535458cbe682ea78274b5de781bac2ea3e45ba26aff45"' : 'data-bs-target="#xs-controllers-links-module-Oid4vpModule-88990010d6ad177b03b49ccaee84ab9a9e2eb451fa9af1fdf7c4e321946ce22f8586e397f05d143021a535458cbe682ea78274b5de781bac2ea3e45ba26aff45"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-Oid4vpModule-88990010d6ad177b03b49ccaee84ab9a9e2eb451fa9af1fdf7c4e321946ce22f8586e397f05d143021a535458cbe682ea78274b5de781bac2ea3e45ba26aff45"' :
                                            'id="xs-controllers-links-module-Oid4vpModule-88990010d6ad177b03b49ccaee84ab9a9e2eb451fa9af1fdf7c4e321946ce22f8586e397f05d143021a535458cbe682ea78274b5de781bac2ea3e45ba26aff45"' }>
                                            <li class="link">
                                                <a href="controllers/Oid4vpController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vpController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-Oid4vpModule-88990010d6ad177b03b49ccaee84ab9a9e2eb451fa9af1fdf7c4e321946ce22f8586e397f05d143021a535458cbe682ea78274b5de781bac2ea3e45ba26aff45"' : 'data-bs-target="#xs-injectables-links-module-Oid4vpModule-88990010d6ad177b03b49ccaee84ab9a9e2eb451fa9af1fdf7c4e321946ce22f8586e397f05d143021a535458cbe682ea78274b5de781bac2ea3e45ba26aff45"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-Oid4vpModule-88990010d6ad177b03b49ccaee84ab9a9e2eb451fa9af1fdf7c4e321946ce22f8586e397f05d143021a535458cbe682ea78274b5de781bac2ea3e45ba26aff45"' :
                                        'id="xs-injectables-links-module-Oid4vpModule-88990010d6ad177b03b49ccaee84ab9a9e2eb451fa9af1fdf7c4e321946ce22f8586e397f05d143021a535458cbe682ea78274b5de781bac2ea3e45ba26aff45"' }>
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
                                            'data-bs-target="#controllers-links-module-PresentationsModule-5b6e705c94ddbde7c01f8fd2fc5bd9a6bbe3d491516ebab743b583600e714778bb0a3e0c0c05a932b72355cc934c02a9e44cbc74f80a3b65fcebc86ecbb8fd7c"' : 'data-bs-target="#xs-controllers-links-module-PresentationsModule-5b6e705c94ddbde7c01f8fd2fc5bd9a6bbe3d491516ebab743b583600e714778bb0a3e0c0c05a932b72355cc934c02a9e44cbc74f80a3b65fcebc86ecbb8fd7c"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-PresentationsModule-5b6e705c94ddbde7c01f8fd2fc5bd9a6bbe3d491516ebab743b583600e714778bb0a3e0c0c05a932b72355cc934c02a9e44cbc74f80a3b65fcebc86ecbb8fd7c"' :
                                            'id="xs-controllers-links-module-PresentationsModule-5b6e705c94ddbde7c01f8fd2fc5bd9a6bbe3d491516ebab743b583600e714778bb0a3e0c0c05a932b72355cc934c02a9e44cbc74f80a3b65fcebc86ecbb8fd7c"' }>
                                            <li class="link">
                                                <a href="controllers/PresentationManagementController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PresentationManagementController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PresentationsModule-5b6e705c94ddbde7c01f8fd2fc5bd9a6bbe3d491516ebab743b583600e714778bb0a3e0c0c05a932b72355cc934c02a9e44cbc74f80a3b65fcebc86ecbb8fd7c"' : 'data-bs-target="#xs-injectables-links-module-PresentationsModule-5b6e705c94ddbde7c01f8fd2fc5bd9a6bbe3d491516ebab743b583600e714778bb0a3e0c0c05a932b72355cc934c02a9e44cbc74f80a3b65fcebc86ecbb8fd7c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PresentationsModule-5b6e705c94ddbde7c01f8fd2fc5bd9a6bbe3d491516ebab743b583600e714778bb0a3e0c0c05a932b72355cc934c02a9e44cbc74f80a3b65fcebc86ecbb8fd7c"' :
                                        'id="xs-injectables-links-module-PresentationsModule-5b6e705c94ddbde7c01f8fd2fc5bd9a6bbe3d491516ebab743b583600e714778bb0a3e0c0c05a932b72355cc934c02a9e44cbc74f80a3b65fcebc86ecbb8fd7c"' }>
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
                                        'data-bs-target="#injectables-links-module-RegistrarModule-2dcd413497af120ab981ffaa5cbeeb4b0b7d5abb95ca1dba2fbffddcd31e522fb4989cfba35009aeb844e8508f23d29f8076b62644ac34e29a80fa0820ee621c"' : 'data-bs-target="#xs-injectables-links-module-RegistrarModule-2dcd413497af120ab981ffaa5cbeeb4b0b7d5abb95ca1dba2fbffddcd31e522fb4989cfba35009aeb844e8508f23d29f8076b62644ac34e29a80fa0820ee621c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-RegistrarModule-2dcd413497af120ab981ffaa5cbeeb4b0b7d5abb95ca1dba2fbffddcd31e522fb4989cfba35009aeb844e8508f23d29f8076b62644ac34e29a80fa0820ee621c"' :
                                        'id="xs-injectables-links-module-RegistrarModule-2dcd413497af120ab981ffaa5cbeeb4b0b7d5abb95ca1dba2fbffddcd31e522fb4989cfba35009aeb844e8508f23d29f8076b62644ac34e29a80fa0820ee621c"' }>
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
                                        'data-bs-target="#injectables-links-module-ResolverModule-f0b0dfa9c28f9d3fabbd4e331ce801bda49de6f88fefc991384f027b65d9e9421a7d405f75bb5f35eed5d8ba72b72e9941c89d4087eebbf7023ce79688f8fe0c"' : 'data-bs-target="#xs-injectables-links-module-ResolverModule-f0b0dfa9c28f9d3fabbd4e331ce801bda49de6f88fefc991384f027b65d9e9421a7d405f75bb5f35eed5d8ba72b72e9941c89d4087eebbf7023ce79688f8fe0c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ResolverModule-f0b0dfa9c28f9d3fabbd4e331ce801bda49de6f88fefc991384f027b65d9e9421a7d405f75bb5f35eed5d8ba72b72e9941c89d4087eebbf7023ce79688f8fe0c"' :
                                        'id="xs-injectables-links-module-ResolverModule-f0b0dfa9c28f9d3fabbd4e331ce801bda49de6f88fefc991384f027b65d9e9421a7d405f75bb5f35eed5d8ba72b72e9941c89d4087eebbf7023ce79688f8fe0c"' }>
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
                                            'data-bs-target="#controllers-links-module-SessionModule-1d9863211a2365bbc08481441d99eb72fb7cd9a6374c94c2cc99195baa9a79973c0e378d244a3e34219288c9568ecc1b0811b8e6a34f8eb9339cf440dc844d75"' : 'data-bs-target="#xs-controllers-links-module-SessionModule-1d9863211a2365bbc08481441d99eb72fb7cd9a6374c94c2cc99195baa9a79973c0e378d244a3e34219288c9568ecc1b0811b8e6a34f8eb9339cf440dc844d75"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SessionModule-1d9863211a2365bbc08481441d99eb72fb7cd9a6374c94c2cc99195baa9a79973c0e378d244a3e34219288c9568ecc1b0811b8e6a34f8eb9339cf440dc844d75"' :
                                            'id="xs-controllers-links-module-SessionModule-1d9863211a2365bbc08481441d99eb72fb7cd9a6374c94c2cc99195baa9a79973c0e378d244a3e34219288c9568ecc1b0811b8e6a34f8eb9339cf440dc844d75"' }>
                                            <li class="link">
                                                <a href="controllers/SessionController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SessionModule-1d9863211a2365bbc08481441d99eb72fb7cd9a6374c94c2cc99195baa9a79973c0e378d244a3e34219288c9568ecc1b0811b8e6a34f8eb9339cf440dc844d75"' : 'data-bs-target="#xs-injectables-links-module-SessionModule-1d9863211a2365bbc08481441d99eb72fb7cd9a6374c94c2cc99195baa9a79973c0e378d244a3e34219288c9568ecc1b0811b8e6a34f8eb9339cf440dc844d75"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SessionModule-1d9863211a2365bbc08481441d99eb72fb7cd9a6374c94c2cc99195baa9a79973c0e378d244a3e34219288c9568ecc1b0811b8e6a34f8eb9339cf440dc844d75"' :
                                        'id="xs-injectables-links-module-SessionModule-1d9863211a2365bbc08481441d99eb72fb7cd9a6374c94c2cc99195baa9a79973c0e378d244a3e34219288c9568ecc1b0811b8e6a34f8eb9339cf440dc844d75"' }>
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
                                            'data-bs-target="#controllers-links-module-StatusListModule-490df0d2c10133388a8ebe6577f7df86f17f18712e8d25f3c5dad3b402fcf578af8fd1255f61950fde51eb09885c64a5d21e08d1c0762c3b66b6895ea40b724c"' : 'data-bs-target="#xs-controllers-links-module-StatusListModule-490df0d2c10133388a8ebe6577f7df86f17f18712e8d25f3c5dad3b402fcf578af8fd1255f61950fde51eb09885c64a5d21e08d1c0762c3b66b6895ea40b724c"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-StatusListModule-490df0d2c10133388a8ebe6577f7df86f17f18712e8d25f3c5dad3b402fcf578af8fd1255f61950fde51eb09885c64a5d21e08d1c0762c3b66b6895ea40b724c"' :
                                            'id="xs-controllers-links-module-StatusListModule-490df0d2c10133388a8ebe6577f7df86f17f18712e8d25f3c5dad3b402fcf578af8fd1255f61950fde51eb09885c64a5d21e08d1c0762c3b66b6895ea40b724c"' }>
                                            <li class="link">
                                                <a href="controllers/StatusListController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-StatusListModule-490df0d2c10133388a8ebe6577f7df86f17f18712e8d25f3c5dad3b402fcf578af8fd1255f61950fde51eb09885c64a5d21e08d1c0762c3b66b6895ea40b724c"' : 'data-bs-target="#xs-injectables-links-module-StatusListModule-490df0d2c10133388a8ebe6577f7df86f17f18712e8d25f3c5dad3b402fcf578af8fd1255f61950fde51eb09885c64a5d21e08d1c0762c3b66b6895ea40b724c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-StatusListModule-490df0d2c10133388a8ebe6577f7df86f17f18712e8d25f3c5dad3b402fcf578af8fd1255f61950fde51eb09885c64a5d21e08d1c0762c3b66b6895ea40b724c"' :
                                        'id="xs-injectables-links-module-StatusListModule-490df0d2c10133388a8ebe6577f7df86f17f18712e8d25f3c5dad3b402fcf578af8fd1255f61950fde51eb09885c64a5d21e08d1c0762c3b66b6895ea40b724c"' }>
                                        <li class="link">
                                            <a href="injectables/StatusListService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/StorageModule.html" data-type="entity-link" >StorageModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/VerifierModule.html" data-type="entity-link" >VerifierModule</a>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#controllers-links"' :
                                'data-bs-target="#xs-controllers-links"' }>
                                <span class="icon ion-md-swap"></span>
                                <span>Controllers</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="controllers-links"' : 'id="xs-controllers-links"' }>
                                <li class="link">
                                    <a href="controllers/StorageController.html" data-type="entity-link" >StorageController</a>
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
                                    <a href="entities/ClientEntity.html" data-type="entity-link" >ClientEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/CredentialConfig.html" data-type="entity-link" >CredentialConfig</a>
                                </li>
                                <li class="link">
                                    <a href="entities/DisplayEntity.html" data-type="entity-link" >DisplayEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/FileEntity.html" data-type="entity-link" >FileEntity</a>
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
                                    <a href="entities/RegistrarEntity.html" data-type="entity-link" >RegistrarEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/Session.html" data-type="entity-link" >Session</a>
                                </li>
                                <li class="link">
                                    <a href="entities/StatusListEntity.html" data-type="entity-link" >StatusListEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/StatusMapping.html" data-type="entity-link" >StatusMapping</a>
                                </li>
                                <li class="link">
                                    <a href="entities/TenantEntity.html" data-type="entity-link" >TenantEntity</a>
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
                                <a href="classes/AllowListPolicy.html" data-type="entity-link" >AllowListPolicy</a>
                            </li>
                            <li class="link">
                                <a href="classes/ApiKeyConfig.html" data-type="entity-link" >ApiKeyConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/AttestationBasedPolicy.html" data-type="entity-link" >AttestationBasedPolicy</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthenticationMethodAuth.html" data-type="entity-link" >AuthenticationMethodAuth</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthenticationMethodNone.html" data-type="entity-link" >AuthenticationMethodNone</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthenticationMethodPresentation.html" data-type="entity-link" >AuthenticationMethodPresentation</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthenticationUrlConfig.html" data-type="entity-link" >AuthenticationUrlConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthorizationResponse.html" data-type="entity-link" >AuthorizationResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthorizationResponse-1.html" data-type="entity-link" >AuthorizationResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/AuthorizeQueries.html" data-type="entity-link" >AuthorizeQueries</a>
                            </li>
                            <li class="link">
                                <a href="classes/Claim.html" data-type="entity-link" >Claim</a>
                            </li>
                            <li class="link">
                                <a href="classes/ClaimsQuery.html" data-type="entity-link" >ClaimsQuery</a>
                            </li>
                            <li class="link">
                                <a href="classes/ClientCredentialsDto.html" data-type="entity-link" >ClientCredentialsDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ClientSecretResponseDto.html" data-type="entity-link" >ClientSecretResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateClientDto.html" data-type="entity-link" >CreateClientDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateTenantDto.html" data-type="entity-link" >CreateTenantDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialConfig.html" data-type="entity-link" >CredentialConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialConfigCreate.html" data-type="entity-link" >CredentialConfigCreate</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialConfigMapping.html" data-type="entity-link" >CredentialConfigMapping</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialIssuerMetadataDto.html" data-type="entity-link" >CredentialIssuerMetadataDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialQuery.html" data-type="entity-link" >CredentialQuery</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialSetQuery.html" data-type="entity-link" >CredentialSetQuery</a>
                            </li>
                            <li class="link">
                                <a href="classes/DBKeyService.html" data-type="entity-link" >DBKeyService</a>
                            </li>
                            <li class="link">
                                <a href="classes/DCQL.html" data-type="entity-link" >DCQL</a>
                            </li>
                            <li class="link">
                                <a href="classes/Display.html" data-type="entity-link" >Display</a>
                            </li>
                            <li class="link">
                                <a href="classes/DisplayCreateDto.html" data-type="entity-link" >DisplayCreateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/DisplayImage.html" data-type="entity-link" >DisplayImage</a>
                            </li>
                            <li class="link">
                                <a href="classes/DisplayInfo.html" data-type="entity-link" >DisplayInfo</a>
                            </li>
                            <li class="link">
                                <a href="classes/DisplayLogo.html" data-type="entity-link" >DisplayLogo</a>
                            </li>
                            <li class="link">
                                <a href="classes/EC_Public.html" data-type="entity-link" >EC_Public</a>
                            </li>
                            <li class="link">
                                <a href="classes/EmbeddedDisclosurePolicy.html" data-type="entity-link" >EmbeddedDisclosurePolicy</a>
                            </li>
                            <li class="link">
                                <a href="classes/FileUploadDto.html" data-type="entity-link" >FileUploadDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/IssuanceConfig.html" data-type="entity-link" >IssuanceConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/IssuanceDto.html" data-type="entity-link" >IssuanceDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/IssuerMetadataCredentialConfig.html" data-type="entity-link" >IssuerMetadataCredentialConfig</a>
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
                                <a href="classes/KeyResponseDto.html" data-type="entity-link" >KeyResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/KeyService.html" data-type="entity-link" >KeyService</a>
                            </li>
                            <li class="link">
                                <a href="classes/LocalFileStorage.html" data-type="entity-link" >LocalFileStorage</a>
                            </li>
                            <li class="link">
                                <a href="classes/NoneTrustPolicy.html" data-type="entity-link" >NoneTrustPolicy</a>
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
                                <a href="classes/PolicyCredential.html" data-type="entity-link" >PolicyCredential</a>
                            </li>
                            <li class="link">
                                <a href="classes/PresentationAttachment.html" data-type="entity-link" >PresentationAttachment</a>
                            </li>
                            <li class="link">
                                <a href="classes/PresentationConfigCreateDto.html" data-type="entity-link" >PresentationConfigCreateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/PresentationDuringIssuanceConfig.html" data-type="entity-link" >PresentationDuringIssuanceConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/PresentationRequest.html" data-type="entity-link" >PresentationRequest</a>
                            </li>
                            <li class="link">
                                <a href="classes/RegistrationCertificateRequest.html" data-type="entity-link" >RegistrationCertificateRequest</a>
                            </li>
                            <li class="link">
                                <a href="classes/RoleDto.html" data-type="entity-link" >RoleDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/RootOfTrustPolicy.html" data-type="entity-link" >RootOfTrustPolicy</a>
                            </li>
                            <li class="link">
                                <a href="classes/S3FileStorage.html" data-type="entity-link" >S3FileStorage</a>
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
                                <a href="classes/TrustedAuthorityQuery.html" data-type="entity-link" >TrustedAuthorityQuery</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateClientDto.html" data-type="entity-link" >UpdateClientDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateKeyDto.html" data-type="entity-link" >UpdateKeyDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/VaultKeyService.html" data-type="entity-link" >VaultKeyService</a>
                            </li>
                            <li class="link">
                                <a href="classes/VCT.html" data-type="entity-link" >VCT</a>
                            </li>
                            <li class="link">
                                <a href="classes/WebHookAuthConfig.html" data-type="entity-link" >WebHookAuthConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/WebHookAuthConfigHeader.html" data-type="entity-link" >WebHookAuthConfigHeader</a>
                            </li>
                            <li class="link">
                                <a href="classes/WebHookAuthConfigNone.html" data-type="entity-link" >WebHookAuthConfigNone</a>
                            </li>
                            <li class="link">
                                <a href="classes/WebhookConfig.html" data-type="entity-link" >WebhookConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/WebhookResponse.html" data-type="entity-link" >WebhookResponse</a>
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
                                    <a href="injectables/FilesService.html" data-type="entity-link" >FilesService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/InternalClientsProvider.html" data-type="entity-link" >InternalClientsProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/KeycloakClientsProvider.html" data-type="entity-link" >KeycloakClientsProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LoggerConfigService.html" data-type="entity-link" >LoggerConfigService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SessionPipe.html" data-type="entity-link" >SessionPipe</a>
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
                                <a href="guards/RolesGuard.html" data-type="entity-link" >RolesGuard</a>
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
                                <a href="interfaces/AuthenticationMethodInterface.html" data-type="entity-link" >AuthenticationMethodInterface</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AuthResponse.html" data-type="entity-link" >AuthResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ClientsProvider.html" data-type="entity-link" >ClientsProvider</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CryptoImplementation.html" data-type="entity-link" >CryptoImplementation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FileStorage.html" data-type="entity-link" >FileStorage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GenerateTokenOptions.html" data-type="entity-link" >GenerateTokenOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/InternalTokenPayload.html" data-type="entity-link" >InternalTokenPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IssuerMetadata.html" data-type="entity-link" >IssuerMetadata</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoggerConfiguration.html" data-type="entity-link" >LoggerConfiguration</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OidcDiscoveryDto.html" data-type="entity-link" >OidcDiscoveryDto</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OidcDiscoveryDto-1.html" data-type="entity-link" >OidcDiscoveryDto</a>
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
                                <a href="interfaces/Tenants.html" data-type="entity-link" >Tenants</a>
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
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
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