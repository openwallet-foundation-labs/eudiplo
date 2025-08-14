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
                                            'data-bs-target="#controllers-links-module-AppModule-dad45b37a920f5263bd1a99b70aa9d6e9c5d4b512956a67a932a415f928ac69d385473f8d16e12f924a02f3f12f96a6fafe56ef7e7dce4e2fc1e4bf2d91110cc"' : 'data-bs-target="#xs-controllers-links-module-AppModule-dad45b37a920f5263bd1a99b70aa9d6e9c5d4b512956a67a932a415f928ac69d385473f8d16e12f924a02f3f12f96a6fafe56ef7e7dce4e2fc1e4bf2d91110cc"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-dad45b37a920f5263bd1a99b70aa9d6e9c5d4b512956a67a932a415f928ac69d385473f8d16e12f924a02f3f12f96a6fafe56ef7e7dce4e2fc1e4bf2d91110cc"' :
                                            'id="xs-controllers-links-module-AppModule-dad45b37a920f5263bd1a99b70aa9d6e9c5d4b512956a67a932a415f928ac69d385473f8d16e12f924a02f3f12f96a6fafe56ef7e7dce4e2fc1e4bf2d91110cc"' }>
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
                                        'data-bs-target="#injectables-links-module-AppModule-dad45b37a920f5263bd1a99b70aa9d6e9c5d4b512956a67a932a415f928ac69d385473f8d16e12f924a02f3f12f96a6fafe56ef7e7dce4e2fc1e4bf2d91110cc"' : 'data-bs-target="#xs-injectables-links-module-AppModule-dad45b37a920f5263bd1a99b70aa9d6e9c5d4b512956a67a932a415f928ac69d385473f8d16e12f924a02f3f12f96a6fafe56ef7e7dce4e2fc1e4bf2d91110cc"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-dad45b37a920f5263bd1a99b70aa9d6e9c5d4b512956a67a932a415f928ac69d385473f8d16e12f924a02f3f12f96a6fafe56ef7e7dce4e2fc1e4bf2d91110cc"' :
                                        'id="xs-injectables-links-module-AppModule-dad45b37a920f5263bd1a99b70aa9d6e9c5d4b512956a67a932a415f928ac69d385473f8d16e12f924a02f3f12f96a6fafe56ef7e7dce4e2fc1e4bf2d91110cc"' }>
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
                                            'data-bs-target="#controllers-links-module-AuthModule-2ff72eb2a5dd5d552b3a39627932e76a52bab7d9f75df17791e267f39d0b925db99b20f4608f6aa1a87156060c978b3e062157c67f957dd7bc78a38924ecf2c6"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-2ff72eb2a5dd5d552b3a39627932e76a52bab7d9f75df17791e267f39d0b925db99b20f4608f6aa1a87156060c978b3e062157c67f957dd7bc78a38924ecf2c6"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-2ff72eb2a5dd5d552b3a39627932e76a52bab7d9f75df17791e267f39d0b925db99b20f4608f6aa1a87156060c978b3e062157c67f957dd7bc78a38924ecf2c6"' :
                                            'id="xs-controllers-links-module-AuthModule-2ff72eb2a5dd5d552b3a39627932e76a52bab7d9f75df17791e267f39d0b925db99b20f4608f6aa1a87156060c978b3e062157c67f957dd7bc78a38924ecf2c6"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-2ff72eb2a5dd5d552b3a39627932e76a52bab7d9f75df17791e267f39d0b925db99b20f4608f6aa1a87156060c978b3e062157c67f957dd7bc78a38924ecf2c6"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-2ff72eb2a5dd5d552b3a39627932e76a52bab7d9f75df17791e267f39d0b925db99b20f4608f6aa1a87156060c978b3e062157c67f957dd7bc78a38924ecf2c6"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-2ff72eb2a5dd5d552b3a39627932e76a52bab7d9f75df17791e267f39d0b925db99b20f4608f6aa1a87156060c978b3e062157c67f957dd7bc78a38924ecf2c6"' :
                                        'id="xs-injectables-links-module-AuthModule-2ff72eb2a5dd5d552b3a39627932e76a52bab7d9f75df17791e267f39d0b925db99b20f4608f6aa1a87156060c978b3e062157c67f957dd7bc78a38924ecf2c6"' }>
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
                                        'data-bs-target="#injectables-links-module-CryptoImplementatationModule-bc527725006417ee79b49f48028a7dfc3130795959ccb62b399bf99717555fce9754b9532038d6e9651c607e10f6ae4be7bf6dc7348c4a8f5e643c02819bfeb7"' : 'data-bs-target="#xs-injectables-links-module-CryptoImplementatationModule-bc527725006417ee79b49f48028a7dfc3130795959ccb62b399bf99717555fce9754b9532038d6e9651c607e10f6ae4be7bf6dc7348c4a8f5e643c02819bfeb7"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoImplementatationModule-bc527725006417ee79b49f48028a7dfc3130795959ccb62b399bf99717555fce9754b9532038d6e9651c607e10f6ae4be7bf6dc7348c4a8f5e643c02819bfeb7"' :
                                        'id="xs-injectables-links-module-CryptoImplementatationModule-bc527725006417ee79b49f48028a7dfc3130795959ccb62b399bf99717555fce9754b9532038d6e9651c607e10f6ae4be7bf6dc7348c4a8f5e643c02819bfeb7"' }>
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
                                            'data-bs-target="#controllers-links-module-CryptoModule-2f932dbd27e6ba5d74aa96dec63b43f956aaa6dbb45dd2f0ebdfa5b32cf1f992ce59830e8550c04e0809994b89ddb5ed8736e466a70bac33e2a0db5d6b110c17"' : 'data-bs-target="#xs-controllers-links-module-CryptoModule-2f932dbd27e6ba5d74aa96dec63b43f956aaa6dbb45dd2f0ebdfa5b32cf1f992ce59830e8550c04e0809994b89ddb5ed8736e466a70bac33e2a0db5d6b110c17"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-CryptoModule-2f932dbd27e6ba5d74aa96dec63b43f956aaa6dbb45dd2f0ebdfa5b32cf1f992ce59830e8550c04e0809994b89ddb5ed8736e466a70bac33e2a0db5d6b110c17"' :
                                            'id="xs-controllers-links-module-CryptoModule-2f932dbd27e6ba5d74aa96dec63b43f956aaa6dbb45dd2f0ebdfa5b32cf1f992ce59830e8550c04e0809994b89ddb5ed8736e466a70bac33e2a0db5d6b110c17"' }>
                                            <li class="link">
                                                <a href="controllers/KeyController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >KeyController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoModule-2f932dbd27e6ba5d74aa96dec63b43f956aaa6dbb45dd2f0ebdfa5b32cf1f992ce59830e8550c04e0809994b89ddb5ed8736e466a70bac33e2a0db5d6b110c17"' : 'data-bs-target="#xs-injectables-links-module-CryptoModule-2f932dbd27e6ba5d74aa96dec63b43f956aaa6dbb45dd2f0ebdfa5b32cf1f992ce59830e8550c04e0809994b89ddb5ed8736e466a70bac33e2a0db5d6b110c17"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoModule-2f932dbd27e6ba5d74aa96dec63b43f956aaa6dbb45dd2f0ebdfa5b32cf1f992ce59830e8550c04e0809994b89ddb5ed8736e466a70bac33e2a0db5d6b110c17"' :
                                        'id="xs-injectables-links-module-CryptoModule-2f932dbd27e6ba5d74aa96dec63b43f956aaa6dbb45dd2f0ebdfa5b32cf1f992ce59830e8550c04e0809994b89ddb5ed8736e466a70bac33e2a0db5d6b110c17"' }>
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
                                            'data-bs-target="#controllers-links-module-HealthModule-9c61f83cc72088637f928b95bb0572161de0b29699c8fa7b4ca847239cbdbdfbab56691ff7f3f388f2b795e58abe9f423d1cbb4376df17ba3a45c24eb2fca02c"' : 'data-bs-target="#xs-controllers-links-module-HealthModule-9c61f83cc72088637f928b95bb0572161de0b29699c8fa7b4ca847239cbdbdfbab56691ff7f3f388f2b795e58abe9f423d1cbb4376df17ba3a45c24eb2fca02c"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-HealthModule-9c61f83cc72088637f928b95bb0572161de0b29699c8fa7b4ca847239cbdbdfbab56691ff7f3f388f2b795e58abe9f423d1cbb4376df17ba3a45c24eb2fca02c"' :
                                            'id="xs-controllers-links-module-HealthModule-9c61f83cc72088637f928b95bb0572161de0b29699c8fa7b4ca847239cbdbdfbab56691ff7f3f388f2b795e58abe9f423d1cbb4376df17ba3a45c24eb2fca02c"' }>
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
                                            'data-bs-target="#controllers-links-module-IssuerModule-236f0c349e932c42f85db446c4936c30d6e05aa2e220a3029b0ce4742a625069aadfde2b3e21265863cebfd8e5cea77bc5715b30bcdae38add9742ee87dbd5dd"' : 'data-bs-target="#xs-controllers-links-module-IssuerModule-236f0c349e932c42f85db446c4936c30d6e05aa2e220a3029b0ce4742a625069aadfde2b3e21265863cebfd8e5cea77bc5715b30bcdae38add9742ee87dbd5dd"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-IssuerModule-236f0c349e932c42f85db446c4936c30d6e05aa2e220a3029b0ce4742a625069aadfde2b3e21265863cebfd8e5cea77bc5715b30bcdae38add9742ee87dbd5dd"' :
                                            'id="xs-controllers-links-module-IssuerModule-236f0c349e932c42f85db446c4936c30d6e05aa2e220a3029b0ce4742a625069aadfde2b3e21265863cebfd8e5cea77bc5715b30bcdae38add9742ee87dbd5dd"' }>
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
                                        'data-bs-target="#injectables-links-module-IssuerModule-236f0c349e932c42f85db446c4936c30d6e05aa2e220a3029b0ce4742a625069aadfde2b3e21265863cebfd8e5cea77bc5715b30bcdae38add9742ee87dbd5dd"' : 'data-bs-target="#xs-injectables-links-module-IssuerModule-236f0c349e932c42f85db446c4936c30d6e05aa2e220a3029b0ce4742a625069aadfde2b3e21265863cebfd8e5cea77bc5715b30bcdae38add9742ee87dbd5dd"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IssuerModule-236f0c349e932c42f85db446c4936c30d6e05aa2e220a3029b0ce4742a625069aadfde2b3e21265863cebfd8e5cea77bc5715b30bcdae38add9742ee87dbd5dd"' :
                                        'id="xs-injectables-links-module-IssuerModule-236f0c349e932c42f85db446c4936c30d6e05aa2e220a3029b0ce4742a625069aadfde2b3e21265863cebfd8e5cea77bc5715b30bcdae38add9742ee87dbd5dd"' }>
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
                                <a href="modules/OAuthModule.html" data-type="entity-link" >OAuthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-OAuthModule-5e41f36bf3d6041c896b4b7ac031908a9ef1d8c20d97776124e5631601c95add92af6834a5333a5f6baa012ad49afb161d10eabdf3bec7d341bbf31d61349775"' : 'data-bs-target="#xs-controllers-links-module-OAuthModule-5e41f36bf3d6041c896b4b7ac031908a9ef1d8c20d97776124e5631601c95add92af6834a5333a5f6baa012ad49afb161d10eabdf3bec7d341bbf31d61349775"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-OAuthModule-5e41f36bf3d6041c896b4b7ac031908a9ef1d8c20d97776124e5631601c95add92af6834a5333a5f6baa012ad49afb161d10eabdf3bec7d341bbf31d61349775"' :
                                            'id="xs-controllers-links-module-OAuthModule-5e41f36bf3d6041c896b4b7ac031908a9ef1d8c20d97776124e5631601c95add92af6834a5333a5f6baa012ad49afb161d10eabdf3bec7d341bbf31d61349775"' }>
                                            <li class="link">
                                                <a href="controllers/OAuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >OAuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-OAuthModule-5e41f36bf3d6041c896b4b7ac031908a9ef1d8c20d97776124e5631601c95add92af6834a5333a5f6baa012ad49afb161d10eabdf3bec7d341bbf31d61349775"' : 'data-bs-target="#xs-injectables-links-module-OAuthModule-5e41f36bf3d6041c896b4b7ac031908a9ef1d8c20d97776124e5631601c95add92af6834a5333a5f6baa012ad49afb161d10eabdf3bec7d341bbf31d61349775"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-OAuthModule-5e41f36bf3d6041c896b4b7ac031908a9ef1d8c20d97776124e5631601c95add92af6834a5333a5f6baa012ad49afb161d10eabdf3bec7d341bbf31d61349775"' :
                                        'id="xs-injectables-links-module-OAuthModule-5e41f36bf3d6041c896b4b7ac031908a9ef1d8c20d97776124e5631601c95add92af6834a5333a5f6baa012ad49afb161d10eabdf3bec7d341bbf31d61349775"' }>
                                        <li class="link">
                                            <a href="injectables/OAuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >OAuthService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/Oid4vpModule.html" data-type="entity-link" >Oid4vpModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-Oid4vpModule-c88eb1e9033bb7ccaf69cfb2ce34e94c92368751b389271ad8bedba70f34cc5117aba0e05c1e7424622307f37ccb56b978ad7745a4180e8f573a66ac28e035d3"' : 'data-bs-target="#xs-controllers-links-module-Oid4vpModule-c88eb1e9033bb7ccaf69cfb2ce34e94c92368751b389271ad8bedba70f34cc5117aba0e05c1e7424622307f37ccb56b978ad7745a4180e8f573a66ac28e035d3"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-Oid4vpModule-c88eb1e9033bb7ccaf69cfb2ce34e94c92368751b389271ad8bedba70f34cc5117aba0e05c1e7424622307f37ccb56b978ad7745a4180e8f573a66ac28e035d3"' :
                                            'id="xs-controllers-links-module-Oid4vpModule-c88eb1e9033bb7ccaf69cfb2ce34e94c92368751b389271ad8bedba70f34cc5117aba0e05c1e7424622307f37ccb56b978ad7745a4180e8f573a66ac28e035d3"' }>
                                            <li class="link">
                                                <a href="controllers/Oid4vpController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vpController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-Oid4vpModule-c88eb1e9033bb7ccaf69cfb2ce34e94c92368751b389271ad8bedba70f34cc5117aba0e05c1e7424622307f37ccb56b978ad7745a4180e8f573a66ac28e035d3"' : 'data-bs-target="#xs-injectables-links-module-Oid4vpModule-c88eb1e9033bb7ccaf69cfb2ce34e94c92368751b389271ad8bedba70f34cc5117aba0e05c1e7424622307f37ccb56b978ad7745a4180e8f573a66ac28e035d3"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-Oid4vpModule-c88eb1e9033bb7ccaf69cfb2ce34e94c92368751b389271ad8bedba70f34cc5117aba0e05c1e7424622307f37ccb56b978ad7745a4180e8f573a66ac28e035d3"' :
                                        'id="xs-injectables-links-module-Oid4vpModule-c88eb1e9033bb7ccaf69cfb2ce34e94c92368751b389271ad8bedba70f34cc5117aba0e05c1e7424622307f37ccb56b978ad7745a4180e8f573a66ac28e035d3"' }>
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
                                            'data-bs-target="#controllers-links-module-PresentationsModule-8eb9a23b0ec29dba3038e2bccd4c018ef8394cb65eba7f88d330da6c4c892c5930e349cd5520538f86de6bf2088313ec4759e1ec96023c4a5a6b9b6b460b7912"' : 'data-bs-target="#xs-controllers-links-module-PresentationsModule-8eb9a23b0ec29dba3038e2bccd4c018ef8394cb65eba7f88d330da6c4c892c5930e349cd5520538f86de6bf2088313ec4759e1ec96023c4a5a6b9b6b460b7912"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-PresentationsModule-8eb9a23b0ec29dba3038e2bccd4c018ef8394cb65eba7f88d330da6c4c892c5930e349cd5520538f86de6bf2088313ec4759e1ec96023c4a5a6b9b6b460b7912"' :
                                            'id="xs-controllers-links-module-PresentationsModule-8eb9a23b0ec29dba3038e2bccd4c018ef8394cb65eba7f88d330da6c4c892c5930e349cd5520538f86de6bf2088313ec4759e1ec96023c4a5a6b9b6b460b7912"' }>
                                            <li class="link">
                                                <a href="controllers/PresentationManagementController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PresentationManagementController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PresentationsModule-8eb9a23b0ec29dba3038e2bccd4c018ef8394cb65eba7f88d330da6c4c892c5930e349cd5520538f86de6bf2088313ec4759e1ec96023c4a5a6b9b6b460b7912"' : 'data-bs-target="#xs-injectables-links-module-PresentationsModule-8eb9a23b0ec29dba3038e2bccd4c018ef8394cb65eba7f88d330da6c4c892c5930e349cd5520538f86de6bf2088313ec4759e1ec96023c4a5a6b9b6b460b7912"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PresentationsModule-8eb9a23b0ec29dba3038e2bccd4c018ef8394cb65eba7f88d330da6c4c892c5930e349cd5520538f86de6bf2088313ec4759e1ec96023c4a5a6b9b6b460b7912"' :
                                        'id="xs-injectables-links-module-PresentationsModule-8eb9a23b0ec29dba3038e2bccd4c018ef8394cb65eba7f88d330da6c4c892c5930e349cd5520538f86de6bf2088313ec4759e1ec96023c4a5a6b9b6b460b7912"' }>
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
                                        'data-bs-target="#injectables-links-module-RegistrarModule-7ce2ad1575ad8730907f0c7f8e2a639237ae64b50f9ff35373f44b84c7d95e2d62bc695b7d9ecb013faa50d10f6c1da72d352597a88bcd70c3e13815f51d70a2"' : 'data-bs-target="#xs-injectables-links-module-RegistrarModule-7ce2ad1575ad8730907f0c7f8e2a639237ae64b50f9ff35373f44b84c7d95e2d62bc695b7d9ecb013faa50d10f6c1da72d352597a88bcd70c3e13815f51d70a2"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-RegistrarModule-7ce2ad1575ad8730907f0c7f8e2a639237ae64b50f9ff35373f44b84c7d95e2d62bc695b7d9ecb013faa50d10f6c1da72d352597a88bcd70c3e13815f51d70a2"' :
                                        'id="xs-injectables-links-module-RegistrarModule-7ce2ad1575ad8730907f0c7f8e2a639237ae64b50f9ff35373f44b84c7d95e2d62bc695b7d9ecb013faa50d10f6c1da72d352597a88bcd70c3e13815f51d70a2"' }>
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
                                        'data-bs-target="#injectables-links-module-ResolverModule-a13ba91fbb1cff62a61d9dac59d167731e2701a3e677b67e9f59d0cd7794d43099207bcb512b1a96986423c870c613e757a0dffb3a61edcd30937ac8f160b3d1"' : 'data-bs-target="#xs-injectables-links-module-ResolverModule-a13ba91fbb1cff62a61d9dac59d167731e2701a3e677b67e9f59d0cd7794d43099207bcb512b1a96986423c870c613e757a0dffb3a61edcd30937ac8f160b3d1"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ResolverModule-a13ba91fbb1cff62a61d9dac59d167731e2701a3e677b67e9f59d0cd7794d43099207bcb512b1a96986423c870c613e757a0dffb3a61edcd30937ac8f160b3d1"' :
                                        'id="xs-injectables-links-module-ResolverModule-a13ba91fbb1cff62a61d9dac59d167731e2701a3e677b67e9f59d0cd7794d43099207bcb512b1a96986423c870c613e757a0dffb3a61edcd30937ac8f160b3d1"' }>
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
                                            'data-bs-target="#controllers-links-module-SessionModule-bfa046ffb1d62d01d78cbcf4eda7a8f64a5983cfd9d7132c82942d854351c3066dc002659a5347b1b3d23ab2d83839bf1ad950f95cf706917260da435126a91c"' : 'data-bs-target="#xs-controllers-links-module-SessionModule-bfa046ffb1d62d01d78cbcf4eda7a8f64a5983cfd9d7132c82942d854351c3066dc002659a5347b1b3d23ab2d83839bf1ad950f95cf706917260da435126a91c"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SessionModule-bfa046ffb1d62d01d78cbcf4eda7a8f64a5983cfd9d7132c82942d854351c3066dc002659a5347b1b3d23ab2d83839bf1ad950f95cf706917260da435126a91c"' :
                                            'id="xs-controllers-links-module-SessionModule-bfa046ffb1d62d01d78cbcf4eda7a8f64a5983cfd9d7132c82942d854351c3066dc002659a5347b1b3d23ab2d83839bf1ad950f95cf706917260da435126a91c"' }>
                                            <li class="link">
                                                <a href="controllers/SessionController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SessionModule-bfa046ffb1d62d01d78cbcf4eda7a8f64a5983cfd9d7132c82942d854351c3066dc002659a5347b1b3d23ab2d83839bf1ad950f95cf706917260da435126a91c"' : 'data-bs-target="#xs-injectables-links-module-SessionModule-bfa046ffb1d62d01d78cbcf4eda7a8f64a5983cfd9d7132c82942d854351c3066dc002659a5347b1b3d23ab2d83839bf1ad950f95cf706917260da435126a91c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SessionModule-bfa046ffb1d62d01d78cbcf4eda7a8f64a5983cfd9d7132c82942d854351c3066dc002659a5347b1b3d23ab2d83839bf1ad950f95cf706917260da435126a91c"' :
                                        'id="xs-injectables-links-module-SessionModule-bfa046ffb1d62d01d78cbcf4eda7a8f64a5983cfd9d7132c82942d854351c3066dc002659a5347b1b3d23ab2d83839bf1ad950f95cf706917260da435126a91c"' }>
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
                                            'data-bs-target="#controllers-links-module-StatusListModule-0a11b4eaf45e71cf32941203ea7e2535b07624038a0ccad4740902c7290ab1b790c8eef8dc4098c6a683ead6fd271cbddcd1f140a9d611f8750abd315b5a039f"' : 'data-bs-target="#xs-controllers-links-module-StatusListModule-0a11b4eaf45e71cf32941203ea7e2535b07624038a0ccad4740902c7290ab1b790c8eef8dc4098c6a683ead6fd271cbddcd1f140a9d611f8750abd315b5a039f"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-StatusListModule-0a11b4eaf45e71cf32941203ea7e2535b07624038a0ccad4740902c7290ab1b790c8eef8dc4098c6a683ead6fd271cbddcd1f140a9d611f8750abd315b5a039f"' :
                                            'id="xs-controllers-links-module-StatusListModule-0a11b4eaf45e71cf32941203ea7e2535b07624038a0ccad4740902c7290ab1b790c8eef8dc4098c6a683ead6fd271cbddcd1f140a9d611f8750abd315b5a039f"' }>
                                            <li class="link">
                                                <a href="controllers/StatusListController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-StatusListModule-0a11b4eaf45e71cf32941203ea7e2535b07624038a0ccad4740902c7290ab1b790c8eef8dc4098c6a683ead6fd271cbddcd1f140a9d611f8750abd315b5a039f"' : 'data-bs-target="#xs-injectables-links-module-StatusListModule-0a11b4eaf45e71cf32941203ea7e2535b07624038a0ccad4740902c7290ab1b790c8eef8dc4098c6a683ead6fd271cbddcd1f140a9d611f8750abd315b5a039f"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-StatusListModule-0a11b4eaf45e71cf32941203ea7e2535b07624038a0ccad4740902c7290ab1b790c8eef8dc4098c6a683ead6fd271cbddcd1f140a9d611f8750abd315b5a039f"' :
                                        'id="xs-injectables-links-module-StatusListModule-0a11b4eaf45e71cf32941203ea7e2535b07624038a0ccad4740902c7290ab1b790c8eef8dc4098c6a683ead6fd271cbddcd1f140a9d611f8750abd315b5a039f"' }>
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
                                <a href="classes/AuthConfigValidator.html" data-type="entity-link" >AuthConfigValidator</a>
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
                                <a href="classes/KeyResponseDto.html" data-type="entity-link" >KeyResponseDto</a>
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
                                <a href="classes/TokenRequestDto.html" data-type="entity-link" >TokenRequestDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/TokenResponse.html" data-type="entity-link" >TokenResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/TokenResponseDto.html" data-type="entity-link" >TokenResponseDto</a>
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