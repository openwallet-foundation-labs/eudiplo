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
                            </li>
                            <li class="link">
                                <a href="modules/AuthModule.html" data-type="entity-link" >AuthModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AuthModule-33fbb954ed99f766fce62a99a4f8e57e73c5e64f278ab089d7b61a97481b6ede978a23542e466e3e53661efa6cdbb73274f6d01aa18b0dcbdcc8ed93fae44fc7"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-33fbb954ed99f766fce62a99a4f8e57e73c5e64f278ab089d7b61a97481b6ede978a23542e466e3e53661efa6cdbb73274f6d01aa18b0dcbdcc8ed93fae44fc7"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-33fbb954ed99f766fce62a99a4f8e57e73c5e64f278ab089d7b61a97481b6ede978a23542e466e3e53661efa6cdbb73274f6d01aa18b0dcbdcc8ed93fae44fc7"' :
                                            'id="xs-controllers-links-module-AuthModule-33fbb954ed99f766fce62a99a4f8e57e73c5e64f278ab089d7b61a97481b6ede978a23542e466e3e53661efa6cdbb73274f6d01aa18b0dcbdcc8ed93fae44fc7"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-33fbb954ed99f766fce62a99a4f8e57e73c5e64f278ab089d7b61a97481b6ede978a23542e466e3e53661efa6cdbb73274f6d01aa18b0dcbdcc8ed93fae44fc7"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-33fbb954ed99f766fce62a99a4f8e57e73c5e64f278ab089d7b61a97481b6ede978a23542e466e3e53661efa6cdbb73274f6d01aa18b0dcbdcc8ed93fae44fc7"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-33fbb954ed99f766fce62a99a4f8e57e73c5e64f278ab089d7b61a97481b6ede978a23542e466e3e53661efa6cdbb73274f6d01aa18b0dcbdcc8ed93fae44fc7"' :
                                        'id="xs-injectables-links-module-AuthModule-33fbb954ed99f766fce62a99a4f8e57e73c5e64f278ab089d7b61a97481b6ede978a23542e466e3e53661efa6cdbb73274f6d01aa18b0dcbdcc8ed93fae44fc7"' }>
                                        <li class="link">
                                            <a href="injectables/AuthService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthService</a>
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
                                <a href="modules/ClientModule.html" data-type="entity-link" >ClientModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-ClientModule-9f5a01bc0b77f02c9fdf96713105622ac03f41f623a6c7b96247d3ff91ec3b2f001cdb615702ec8bb076cf4cab940e5b4418253a54598ffb5d0fe78950298f87"' : 'data-bs-target="#xs-controllers-links-module-ClientModule-9f5a01bc0b77f02c9fdf96713105622ac03f41f623a6c7b96247d3ff91ec3b2f001cdb615702ec8bb076cf4cab940e5b4418253a54598ffb5d0fe78950298f87"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-ClientModule-9f5a01bc0b77f02c9fdf96713105622ac03f41f623a6c7b96247d3ff91ec3b2f001cdb615702ec8bb076cf4cab940e5b4418253a54598ffb5d0fe78950298f87"' :
                                            'id="xs-controllers-links-module-ClientModule-9f5a01bc0b77f02c9fdf96713105622ac03f41f623a6c7b96247d3ff91ec3b2f001cdb615702ec8bb076cf4cab940e5b4418253a54598ffb5d0fe78950298f87"' }>
                                            <li class="link">
                                                <a href="controllers/ClientController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ClientController</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/ConfigImportModule.html" data-type="entity-link" >ConfigImportModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ConfigImportModule-062933d4eb6d6385f367a96e5813e48b10d74c88cda57856927f7494c6c23f3bce19e29815aee0b1b3b5c68670b001dba70cd6bc22ff97f26a069ce7e24c8885"' : 'data-bs-target="#xs-injectables-links-module-ConfigImportModule-062933d4eb6d6385f367a96e5813e48b10d74c88cda57856927f7494c6c23f3bce19e29815aee0b1b3b5c68670b001dba70cd6bc22ff97f26a069ce7e24c8885"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ConfigImportModule-062933d4eb6d6385f367a96e5813e48b10d74c88cda57856927f7494c6c23f3bce19e29815aee0b1b3b5c68670b001dba70cd6bc22ff97f26a069ce7e24c8885"' :
                                        'id="xs-injectables-links-module-ConfigImportModule-062933d4eb6d6385f367a96e5813e48b10d74c88cda57856927f7494c6c23f3bce19e29815aee0b1b3b5c68670b001dba70cd6bc22ff97f26a069ce7e24c8885"' }>
                                        <li class="link">
                                            <a href="injectables/ConfigImportOrchestratorService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ConfigImportOrchestratorService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ConfigImportService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ConfigImportService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/ConfigurationModule.html" data-type="entity-link" >ConfigurationModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-ConfigurationModule-2f7a840173c5aa55d63b827b2deac28199d1f6eb2b075d67101eb455b5963dc7da3a2b4d28bdc5886f500a021c8c053ee96ea66436f436c1cfcdac5744e61246"' : 'data-bs-target="#xs-controllers-links-module-ConfigurationModule-2f7a840173c5aa55d63b827b2deac28199d1f6eb2b075d67101eb455b5963dc7da3a2b4d28bdc5886f500a021c8c053ee96ea66436f436c1cfcdac5744e61246"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-ConfigurationModule-2f7a840173c5aa55d63b827b2deac28199d1f6eb2b075d67101eb455b5963dc7da3a2b4d28bdc5886f500a021c8c053ee96ea66436f436c1cfcdac5744e61246"' :
                                            'id="xs-controllers-links-module-ConfigurationModule-2f7a840173c5aa55d63b827b2deac28199d1f6eb2b075d67101eb455b5963dc7da3a2b4d28bdc5886f500a021c8c053ee96ea66436f436c1cfcdac5744e61246"' }>
                                            <li class="link">
                                                <a href="controllers/CredentialConfigController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CredentialConfigController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/IssuanceConfigController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >IssuanceConfigController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ConfigurationModule-2f7a840173c5aa55d63b827b2deac28199d1f6eb2b075d67101eb455b5963dc7da3a2b4d28bdc5886f500a021c8c053ee96ea66436f436c1cfcdac5744e61246"' : 'data-bs-target="#xs-injectables-links-module-ConfigurationModule-2f7a840173c5aa55d63b827b2deac28199d1f6eb2b075d67101eb455b5963dc7da3a2b4d28bdc5886f500a021c8c053ee96ea66436f436c1cfcdac5744e61246"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ConfigurationModule-2f7a840173c5aa55d63b827b2deac28199d1f6eb2b075d67101eb455b5963dc7da3a2b4d28bdc5886f500a021c8c053ee96ea66436f436c1cfcdac5744e61246"' :
                                        'id="xs-injectables-links-module-ConfigurationModule-2f7a840173c5aa55d63b827b2deac28199d1f6eb2b075d67101eb455b5963dc7da3a2b4d28bdc5886f500a021c8c053ee96ea66436f436c1cfcdac5744e61246"' }>
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
                                            <a href="injectables/MdocIssuerService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MdocIssuerService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SdjwtvcIssuerService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SdjwtvcIssuerService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WebhookService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WebhookService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/CoreModule.html" data-type="entity-link" >CoreModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-CoreModule-67c9b7785e4f3868854f4f5893cd0571fcbf55490f008c9655801c02562fc0f0a00881f7db96c76cf6b645eb13436352f17cb91bb39d58b1ed661e37f9b90891"' : 'data-bs-target="#xs-controllers-links-module-CoreModule-67c9b7785e4f3868854f4f5893cd0571fcbf55490f008c9655801c02562fc0f0a00881f7db96c76cf6b645eb13436352f17cb91bb39d58b1ed661e37f9b90891"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-CoreModule-67c9b7785e4f3868854f4f5893cd0571fcbf55490f008c9655801c02562fc0f0a00881f7db96c76cf6b645eb13436352f17cb91bb39d58b1ed661e37f9b90891"' :
                                            'id="xs-controllers-links-module-CoreModule-67c9b7785e4f3868854f4f5893cd0571fcbf55490f008c9655801c02562fc0f0a00881f7db96c76cf6b645eb13436352f17cb91bb39d58b1ed661e37f9b90891"' }>
                                            <li class="link">
                                                <a href="controllers/AppController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppController</a>
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
                                            'data-bs-target="#controllers-links-module-CryptoModule-778d11a20f9a9e324c169cc596909998938095b8643f66f7928d09bcb072ac5cb836b1442dccfeddc286a67494e67f62ecf4002cd51a5c7dadfc03b777f07126"' : 'data-bs-target="#xs-controllers-links-module-CryptoModule-778d11a20f9a9e324c169cc596909998938095b8643f66f7928d09bcb072ac5cb836b1442dccfeddc286a67494e67f62ecf4002cd51a5c7dadfc03b777f07126"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-CryptoModule-778d11a20f9a9e324c169cc596909998938095b8643f66f7928d09bcb072ac5cb836b1442dccfeddc286a67494e67f62ecf4002cd51a5c7dadfc03b777f07126"' :
                                            'id="xs-controllers-links-module-CryptoModule-778d11a20f9a9e324c169cc596909998938095b8643f66f7928d09bcb072ac5cb836b1442dccfeddc286a67494e67f62ecf4002cd51a5c7dadfc03b777f07126"' }>
                                            <li class="link">
                                                <a href="controllers/CertController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CertController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/KeyController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >KeyController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoModule-778d11a20f9a9e324c169cc596909998938095b8643f66f7928d09bcb072ac5cb836b1442dccfeddc286a67494e67f62ecf4002cd51a5c7dadfc03b777f07126"' : 'data-bs-target="#xs-injectables-links-module-CryptoModule-778d11a20f9a9e324c169cc596909998938095b8643f66f7928d09bcb072ac5cb836b1442dccfeddc286a67494e67f62ecf4002cd51a5c7dadfc03b777f07126"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoModule-778d11a20f9a9e324c169cc596909998938095b8643f66f7928d09bcb072ac5cb836b1442dccfeddc286a67494e67f62ecf4002cd51a5c7dadfc03b777f07126"' :
                                        'id="xs-injectables-links-module-CryptoModule-778d11a20f9a9e324c169cc596909998938095b8643f66f7928d09bcb072ac5cb836b1442dccfeddc286a67494e67f62ecf4002cd51a5c7dadfc03b777f07126"' }>
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
                                <a href="modules/IssuanceModule.html" data-type="entity-link" >IssuanceModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-IssuanceModule-6ed4754f4617ce146da8dfdfc6823944b4902664d257441ef6b323d6f0cafca31150dfa5a30ffa8c399fd64c8a4cceaac68d9e89bec1589089154f07b8de2360"' : 'data-bs-target="#xs-controllers-links-module-IssuanceModule-6ed4754f4617ce146da8dfdfc6823944b4902664d257441ef6b323d6f0cafca31150dfa5a30ffa8c399fd64c8a4cceaac68d9e89bec1589089154f07b8de2360"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-IssuanceModule-6ed4754f4617ce146da8dfdfc6823944b4902664d257441ef6b323d6f0cafca31150dfa5a30ffa8c399fd64c8a4cceaac68d9e89bec1589089154f07b8de2360"' :
                                            'id="xs-controllers-links-module-IssuanceModule-6ed4754f4617ce146da8dfdfc6823944b4902664d257441ef6b323d6f0cafca31150dfa5a30ffa8c399fd64c8a4cceaac68d9e89bec1589089154f07b8de2360"' }>
                                            <li class="link">
                                                <a href="controllers/AuthorizeController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthorizeController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/CredentialOfferController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CredentialOfferController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/Oid4vciController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vciController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/Oid4vciMetadataController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vciMetadataController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/WellKnownController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WellKnownController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-IssuanceModule-6ed4754f4617ce146da8dfdfc6823944b4902664d257441ef6b323d6f0cafca31150dfa5a30ffa8c399fd64c8a4cceaac68d9e89bec1589089154f07b8de2360"' : 'data-bs-target="#xs-injectables-links-module-IssuanceModule-6ed4754f4617ce146da8dfdfc6823944b4902664d257441ef6b323d6f0cafca31150dfa5a30ffa8c399fd64c8a4cceaac68d9e89bec1589089154f07b8de2360"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IssuanceModule-6ed4754f4617ce146da8dfdfc6823944b4902664d257441ef6b323d6f0cafca31150dfa5a30ffa8c399fd64c8a4cceaac68d9e89bec1589089154f07b8de2360"' :
                                        'id="xs-injectables-links-module-IssuanceModule-6ed4754f4617ce146da8dfdfc6823944b4902664d257441ef6b323d6f0cafca31150dfa5a30ffa8c399fd64c8a4cceaac68d9e89bec1589089154f07b8de2360"' }>
                                        <li class="link">
                                            <a href="injectables/AuthorizeService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthorizeService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/Oid4vciService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vciService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WebhookService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WebhookService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WellKnownService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WellKnownService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/IssuerModule.html" data-type="entity-link" >IssuerModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/KeyModule.html" data-type="entity-link" >KeyModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/LifecycleModule.html" data-type="entity-link" >LifecycleModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/LoggerModule.html" data-type="entity-link" >LoggerModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-LoggerModule-6b238ba6033a3107a1753f051bfc939fa339b1fe5bec2e021e429e548791ec78e4cbd0e4b3313dbf50358c68dd4a80680b34a7e627f78e5e0eba89c688ac30ba"' : 'data-bs-target="#xs-injectables-links-module-LoggerModule-6b238ba6033a3107a1753f051bfc939fa339b1fe5bec2e021e429e548791ec78e4cbd0e4b3313dbf50358c68dd4a80680b34a7e627f78e5e0eba89c688ac30ba"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-LoggerModule-6b238ba6033a3107a1753f051bfc939fa339b1fe5bec2e021e429e548791ec78e4cbd0e4b3313dbf50358c68dd4a80680b34a7e627f78e5e0eba89c688ac30ba"' :
                                        'id="xs-injectables-links-module-LoggerModule-6b238ba6033a3107a1753f051bfc939fa339b1fe5bec2e021e429e548791ec78e4cbd0e4b3313dbf50358c68dd4a80680b34a7e627f78e5e0eba89c688ac30ba"' }>
                                        <li class="link">
                                            <a href="injectables/LoggerConfigService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LoggerConfigService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SessionLoggerService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionLoggerService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/MetricsModule.html" data-type="entity-link" >MetricsModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/Oid4vpModule.html" data-type="entity-link" >Oid4vpModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-Oid4vpModule-9ab0f37777d20de7721ce581c15d7b2b89c178751af65572de83180b21822862a91c1707b533c517ad44e673c9ca02832342245a7005a12f1838ae7cb4c5bb2e"' : 'data-bs-target="#xs-controllers-links-module-Oid4vpModule-9ab0f37777d20de7721ce581c15d7b2b89c178751af65572de83180b21822862a91c1707b533c517ad44e673c9ca02832342245a7005a12f1838ae7cb4c5bb2e"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-Oid4vpModule-9ab0f37777d20de7721ce581c15d7b2b89c178751af65572de83180b21822862a91c1707b533c517ad44e673c9ca02832342245a7005a12f1838ae7cb4c5bb2e"' :
                                            'id="xs-controllers-links-module-Oid4vpModule-9ab0f37777d20de7721ce581c15d7b2b89c178751af65572de83180b21822862a91c1707b533c517ad44e673c9ca02832342245a7005a12f1838ae7cb4c5bb2e"' }>
                                            <li class="link">
                                                <a href="controllers/Oid4vpController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vpController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-Oid4vpModule-9ab0f37777d20de7721ce581c15d7b2b89c178751af65572de83180b21822862a91c1707b533c517ad44e673c9ca02832342245a7005a12f1838ae7cb4c5bb2e"' : 'data-bs-target="#xs-injectables-links-module-Oid4vpModule-9ab0f37777d20de7721ce581c15d7b2b89c178751af65572de83180b21822862a91c1707b533c517ad44e673c9ca02832342245a7005a12f1838ae7cb4c5bb2e"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-Oid4vpModule-9ab0f37777d20de7721ce581c15d7b2b89c178751af65572de83180b21822862a91c1707b533c517ad44e673c9ca02832342245a7005a12f1838ae7cb4c5bb2e"' :
                                        'id="xs-injectables-links-module-Oid4vpModule-9ab0f37777d20de7721ce581c15d7b2b89c178751af65572de83180b21822862a91c1707b533c517ad44e673c9ca02832342245a7005a12f1838ae7cb4c5bb2e"' }>
                                        <li class="link">
                                            <a href="injectables/Oid4vpService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Oid4vpService</a>
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
                                            'data-bs-target="#controllers-links-module-PresentationsModule-ca9d762f7fe2b9b1824d992f79133afd8d8ab4572bdc4466152f035e297704695e25b35aeb2346cd50c94882e2c41f8e403118870dad8b23778b636567601f7a"' : 'data-bs-target="#xs-controllers-links-module-PresentationsModule-ca9d762f7fe2b9b1824d992f79133afd8d8ab4572bdc4466152f035e297704695e25b35aeb2346cd50c94882e2c41f8e403118870dad8b23778b636567601f7a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-PresentationsModule-ca9d762f7fe2b9b1824d992f79133afd8d8ab4572bdc4466152f035e297704695e25b35aeb2346cd50c94882e2c41f8e403118870dad8b23778b636567601f7a"' :
                                            'id="xs-controllers-links-module-PresentationsModule-ca9d762f7fe2b9b1824d992f79133afd8d8ab4572bdc4466152f035e297704695e25b35aeb2346cd50c94882e2c41f8e403118870dad8b23778b636567601f7a"' }>
                                            <li class="link">
                                                <a href="controllers/PresentationManagementController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PresentationManagementController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PresentationsModule-ca9d762f7fe2b9b1824d992f79133afd8d8ab4572bdc4466152f035e297704695e25b35aeb2346cd50c94882e2c41f8e403118870dad8b23778b636567601f7a"' : 'data-bs-target="#xs-injectables-links-module-PresentationsModule-ca9d762f7fe2b9b1824d992f79133afd8d8ab4572bdc4466152f035e297704695e25b35aeb2346cd50c94882e2c41f8e403118870dad8b23778b636567601f7a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PresentationsModule-ca9d762f7fe2b9b1824d992f79133afd8d8ab4572bdc4466152f035e297704695e25b35aeb2346cd50c94882e2c41f8e403118870dad8b23778b636567601f7a"' :
                                        'id="xs-injectables-links-module-PresentationsModule-ca9d762f7fe2b9b1824d992f79133afd8d8ab4572bdc4466152f035e297704695e25b35aeb2346cd50c94882e2c41f8e403118870dad8b23778b636567601f7a"' }>
                                        <li class="link">
                                            <a href="injectables/MdlverifierService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MdlverifierService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/PresentationsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PresentationsService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SdjwtvcverifierService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SdjwtvcverifierService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/RegistrarModule.html" data-type="entity-link" >RegistrarModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-RegistrarModule-c8e32871f61293606f6816f87f2db6aeb48ef528e4ae0023d9f9c2d52d528a2fd9e84b6a1b8a51d6ab5617781fccca14bd1689b740fe0bc89c3d3fe26077225a"' : 'data-bs-target="#xs-controllers-links-module-RegistrarModule-c8e32871f61293606f6816f87f2db6aeb48ef528e4ae0023d9f9c2d52d528a2fd9e84b6a1b8a51d6ab5617781fccca14bd1689b740fe0bc89c3d3fe26077225a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-RegistrarModule-c8e32871f61293606f6816f87f2db6aeb48ef528e4ae0023d9f9c2d52d528a2fd9e84b6a1b8a51d6ab5617781fccca14bd1689b740fe0bc89c3d3fe26077225a"' :
                                            'id="xs-controllers-links-module-RegistrarModule-c8e32871f61293606f6816f87f2db6aeb48ef528e4ae0023d9f9c2d52d528a2fd9e84b6a1b8a51d6ab5617781fccca14bd1689b740fe0bc89c3d3fe26077225a"' }>
                                            <li class="link">
                                                <a href="controllers/RegistrarController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RegistrarController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-RegistrarModule-c8e32871f61293606f6816f87f2db6aeb48ef528e4ae0023d9f9c2d52d528a2fd9e84b6a1b8a51d6ab5617781fccca14bd1689b740fe0bc89c3d3fe26077225a"' : 'data-bs-target="#xs-injectables-links-module-RegistrarModule-c8e32871f61293606f6816f87f2db6aeb48ef528e4ae0023d9f9c2d52d528a2fd9e84b6a1b8a51d6ab5617781fccca14bd1689b740fe0bc89c3d3fe26077225a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-RegistrarModule-c8e32871f61293606f6816f87f2db6aeb48ef528e4ae0023d9f9c2d52d528a2fd9e84b6a1b8a51d6ab5617781fccca14bd1689b740fe0bc89c3d3fe26077225a"' :
                                        'id="xs-injectables-links-module-RegistrarModule-c8e32871f61293606f6816f87f2db6aeb48ef528e4ae0023d9f9c2d52d528a2fd9e84b6a1b8a51d6ab5617781fccca14bd1689b740fe0bc89c3d3fe26077225a"' }>
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
                                            'data-bs-target="#controllers-links-module-SessionModule-4f8ae19e6fb493e40f66334591e06af02e2b94527bee5f11b7d8f045a06111fc3b3b11af6852ab4ea9f48c8bcc93c67230e5750098d1ae1e792fc8357d44fb67"' : 'data-bs-target="#xs-controllers-links-module-SessionModule-4f8ae19e6fb493e40f66334591e06af02e2b94527bee5f11b7d8f045a06111fc3b3b11af6852ab4ea9f48c8bcc93c67230e5750098d1ae1e792fc8357d44fb67"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SessionModule-4f8ae19e6fb493e40f66334591e06af02e2b94527bee5f11b7d8f045a06111fc3b3b11af6852ab4ea9f48c8bcc93c67230e5750098d1ae1e792fc8357d44fb67"' :
                                            'id="xs-controllers-links-module-SessionModule-4f8ae19e6fb493e40f66334591e06af02e2b94527bee5f11b7d8f045a06111fc3b3b11af6852ab4ea9f48c8bcc93c67230e5750098d1ae1e792fc8357d44fb67"' }>
                                            <li class="link">
                                                <a href="controllers/SessionConfigController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionConfigController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/SessionController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SessionModule-4f8ae19e6fb493e40f66334591e06af02e2b94527bee5f11b7d8f045a06111fc3b3b11af6852ab4ea9f48c8bcc93c67230e5750098d1ae1e792fc8357d44fb67"' : 'data-bs-target="#xs-injectables-links-module-SessionModule-4f8ae19e6fb493e40f66334591e06af02e2b94527bee5f11b7d8f045a06111fc3b3b11af6852ab4ea9f48c8bcc93c67230e5750098d1ae1e792fc8357d44fb67"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SessionModule-4f8ae19e6fb493e40f66334591e06af02e2b94527bee5f11b7d8f045a06111fc3b3b11af6852ab4ea9f48c8bcc93c67230e5750098d1ae1e792fc8357d44fb67"' :
                                        'id="xs-injectables-links-module-SessionModule-4f8ae19e6fb493e40f66334591e06af02e2b94527bee5f11b7d8f045a06111fc3b3b11af6852ab4ea9f48c8bcc93c67230e5750098d1ae1e792fc8357d44fb67"' }>
                                        <li class="link">
                                            <a href="injectables/SessionConfigService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionConfigService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SessionService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/SharedModule.html" data-type="entity-link" >SharedModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/StatusListModule.html" data-type="entity-link" >StatusListModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-StatusListModule-f8ab29513faba11ee3d3f9fd08db9eb6a567f392fc4dd5f2930c8923be2aaeb29feeb5d36ec0681d950e6c51d4af02baa3c8e448d6cdd1ca7979435492ec2f69"' : 'data-bs-target="#xs-controllers-links-module-StatusListModule-f8ab29513faba11ee3d3f9fd08db9eb6a567f392fc4dd5f2930c8923be2aaeb29feeb5d36ec0681d950e6c51d4af02baa3c8e448d6cdd1ca7979435492ec2f69"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-StatusListModule-f8ab29513faba11ee3d3f9fd08db9eb6a567f392fc4dd5f2930c8923be2aaeb29feeb5d36ec0681d950e6c51d4af02baa3c8e448d6cdd1ca7979435492ec2f69"' :
                                            'id="xs-controllers-links-module-StatusListModule-f8ab29513faba11ee3d3f9fd08db9eb6a567f392fc4dd5f2930c8923be2aaeb29feeb5d36ec0681d950e6c51d4af02baa3c8e448d6cdd1ca7979435492ec2f69"' }>
                                            <li class="link">
                                                <a href="controllers/StatusListConfigController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListConfigController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/StatusListController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/StatusListManagementController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListManagementController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-StatusListModule-f8ab29513faba11ee3d3f9fd08db9eb6a567f392fc4dd5f2930c8923be2aaeb29feeb5d36ec0681d950e6c51d4af02baa3c8e448d6cdd1ca7979435492ec2f69"' : 'data-bs-target="#xs-injectables-links-module-StatusListModule-f8ab29513faba11ee3d3f9fd08db9eb6a567f392fc4dd5f2930c8923be2aaeb29feeb5d36ec0681d950e6c51d4af02baa3c8e448d6cdd1ca7979435492ec2f69"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-StatusListModule-f8ab29513faba11ee3d3f9fd08db9eb6a567f392fc4dd5f2930c8923be2aaeb29feeb5d36ec0681d950e6c51d4af02baa3c8e448d6cdd1ca7979435492ec2f69"' :
                                        'id="xs-injectables-links-module-StatusListModule-f8ab29513faba11ee3d3f9fd08db9eb6a567f392fc4dd5f2930c8923be2aaeb29feeb5d36ec0681d950e6c51d4af02baa3c8e448d6cdd1ca7979435492ec2f69"' }>
                                        <li class="link">
                                            <a href="injectables/StatusListConfigService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListConfigService</a>
                                        </li>
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
                                <a href="modules/TenantModule.html" data-type="entity-link" >TenantModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-TenantModule-a4fba99392af6b9b98af213f771634e0b8fb781e437dcec837e754ed6c591947f0e589b6d97e4bbb423c028dcca57ab06930ed3a70a476e3a459388a731c9d09"' : 'data-bs-target="#xs-controllers-links-module-TenantModule-a4fba99392af6b9b98af213f771634e0b8fb781e437dcec837e754ed6c591947f0e589b6d97e4bbb423c028dcca57ab06930ed3a70a476e3a459388a731c9d09"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-TenantModule-a4fba99392af6b9b98af213f771634e0b8fb781e437dcec837e754ed6c591947f0e589b6d97e4bbb423c028dcca57ab06930ed3a70a476e3a459388a731c9d09"' :
                                            'id="xs-controllers-links-module-TenantModule-a4fba99392af6b9b98af213f771634e0b8fb781e437dcec837e754ed6c591947f0e589b6d97e4bbb423c028dcca57ab06930ed3a70a476e3a459388a731c9d09"' }>
                                            <li class="link">
                                                <a href="controllers/TenantController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TenantController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-TenantModule-a4fba99392af6b9b98af213f771634e0b8fb781e437dcec837e754ed6c591947f0e589b6d97e4bbb423c028dcca57ab06930ed3a70a476e3a459388a731c9d09"' : 'data-bs-target="#xs-injectables-links-module-TenantModule-a4fba99392af6b9b98af213f771634e0b8fb781e437dcec837e754ed6c591947f0e589b6d97e4bbb423c028dcca57ab06930ed3a70a476e3a459388a731c9d09"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-TenantModule-a4fba99392af6b9b98af213f771634e0b8fb781e437dcec837e754ed6c591947f0e589b6d97e4bbb423c028dcca57ab06930ed3a70a476e3a459388a731c9d09"' :
                                        'id="xs-injectables-links-module-TenantModule-a4fba99392af6b9b98af213f771634e0b8fb781e437dcec837e754ed6c591947f0e589b6d97e4bbb423c028dcca57ab06930ed3a70a476e3a459388a731c9d09"' }>
                                        <li class="link">
                                            <a href="injectables/TenantService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TenantService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/TrustListModule.html" data-type="entity-link" >TrustListModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-TrustListModule-2911079c87d03efc88857108bd3875dc78d2a67f80cfa9801282589b2bab9131d6fcf718c7b513baf9ec42e5f38fa695795746be18ff3bc6143f913aa880d883"' : 'data-bs-target="#xs-controllers-links-module-TrustListModule-2911079c87d03efc88857108bd3875dc78d2a67f80cfa9801282589b2bab9131d6fcf718c7b513baf9ec42e5f38fa695795746be18ff3bc6143f913aa880d883"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-TrustListModule-2911079c87d03efc88857108bd3875dc78d2a67f80cfa9801282589b2bab9131d6fcf718c7b513baf9ec42e5f38fa695795746be18ff3bc6143f913aa880d883"' :
                                            'id="xs-controllers-links-module-TrustListModule-2911079c87d03efc88857108bd3875dc78d2a67f80cfa9801282589b2bab9131d6fcf718c7b513baf9ec42e5f38fa695795746be18ff3bc6143f913aa880d883"' }>
                                            <li class="link">
                                                <a href="controllers/TrustListController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TrustListController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/TrustListPublicController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TrustListPublicController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-TrustListModule-2911079c87d03efc88857108bd3875dc78d2a67f80cfa9801282589b2bab9131d6fcf718c7b513baf9ec42e5f38fa695795746be18ff3bc6143f913aa880d883"' : 'data-bs-target="#xs-injectables-links-module-TrustListModule-2911079c87d03efc88857108bd3875dc78d2a67f80cfa9801282589b2bab9131d6fcf718c7b513baf9ec42e5f38fa695795746be18ff3bc6143f913aa880d883"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-TrustListModule-2911079c87d03efc88857108bd3875dc78d2a67f80cfa9801282589b2bab9131d6fcf718c7b513baf9ec42e5f38fa695795746be18ff3bc6143f913aa880d883"' :
                                        'id="xs-injectables-links-module-TrustListModule-2911079c87d03efc88857108bd3875dc78d2a67f80cfa9801282589b2bab9131d6fcf718c7b513baf9ec42e5f38fa695795746be18ff3bc6143f913aa880d883"' }>
                                        <li class="link">
                                            <a href="injectables/TrustListService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TrustListService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/TrustModule.html" data-type="entity-link" >TrustModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-TrustModule-c0fbb616423a96bc42d385296c406d1df362de6c0f2e7fc7d33c94415f04c949b04c03d6cc94dc6ed63e34ad005ba310c6cb75c2ed482f8283ffafd78edd3a0f"' : 'data-bs-target="#xs-injectables-links-module-TrustModule-c0fbb616423a96bc42d385296c406d1df362de6c0f2e7fc7d33c94415f04c949b04c03d6cc94dc6ed63e34ad005ba310c6cb75c2ed482f8283ffafd78edd3a0f"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-TrustModule-c0fbb616423a96bc42d385296c406d1df362de6c0f2e7fc7d33c94415f04c949b04c03d6cc94dc6ed63e34ad005ba310c6cb75c2ed482f8283ffafd78edd3a0f"' :
                                        'id="xs-injectables-links-module-TrustModule-c0fbb616423a96bc42d385296c406d1df362de6c0f2e7fc7d33c94415f04c949b04c03d6cc94dc6ed63e34ad005ba310c6cb75c2ed482f8283ffafd78edd3a0f"' }>
                                        <li class="link">
                                            <a href="injectables/LoteParserService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LoteParserService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/TrustListJwtService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TrustListJwtService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/TrustStoreService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TrustStoreService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/X509ValidationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >X509ValidationService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/VerifierModule.html" data-type="entity-link" >VerifierModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-VerifierModule-fd1fd4275d09e92c429d29345ce0fe7cb317e51dd12793aa0ed6716bf0b7e59a7ad7a0518aa1bacfe625cd7d9bcfd969a796482dfb84afdc199a916e9c7ad2f6"' : 'data-bs-target="#xs-controllers-links-module-VerifierModule-fd1fd4275d09e92c429d29345ce0fe7cb317e51dd12793aa0ed6716bf0b7e59a7ad7a0518aa1bacfe625cd7d9bcfd969a796482dfb84afdc199a916e9c7ad2f6"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-VerifierModule-fd1fd4275d09e92c429d29345ce0fe7cb317e51dd12793aa0ed6716bf0b7e59a7ad7a0518aa1bacfe625cd7d9bcfd969a796482dfb84afdc199a916e9c7ad2f6"' :
                                            'id="xs-controllers-links-module-VerifierModule-fd1fd4275d09e92c429d29345ce0fe7cb317e51dd12793aa0ed6716bf0b7e59a7ad7a0518aa1bacfe625cd7d9bcfd969a796482dfb84afdc199a916e9c7ad2f6"' }>
                                            <li class="link">
                                                <a href="controllers/VerifierOfferController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >VerifierOfferController</a>
                                            </li>
                                        </ul>
                                    </li>
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
                                    <a href="entities/CertUsageEntity.html" data-type="entity-link" >CertUsageEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/ClientEntity.html" data-type="entity-link" >ClientEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/CredentialConfig.html" data-type="entity-link" >CredentialConfig</a>
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
                                    <a href="entities/NonceEntity.html" data-type="entity-link" >NonceEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/PresentationConfig.html" data-type="entity-link" >PresentationConfig</a>
                                </li>
                                <li class="link">
                                    <a href="entities/RegistrarConfigEntity.html" data-type="entity-link" >RegistrarConfigEntity</a>
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
                                <li class="link">
                                    <a href="entities/TrustList.html" data-type="entity-link" >TrustList</a>
                                </li>
                                <li class="link">
                                    <a href="entities/TrustListVersion.html" data-type="entity-link" >TrustListVersion</a>
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
                                <a href="classes/AllExceptionsFilter.html" data-type="entity-link" >AllExceptionsFilter</a>
                            </li>
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
                                <a href="classes/BaseVerifierService.html" data-type="entity-link" >BaseVerifierService</a>
                            </li>
                            <li class="link">
                                <a href="classes/CertImportDto.html" data-type="entity-link" >CertImportDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CertResponseDto.html" data-type="entity-link" >CertResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CertUpdateDto.html" data-type="entity-link" >CertUpdateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CertUsageEntity.html" data-type="entity-link" >CertUsageEntity</a>
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
                                <a href="classes/ClientsProvider.html" data-type="entity-link" >ClientsProvider</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateAccessCertificateDto.html" data-type="entity-link" >CreateAccessCertificateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateClientDto.html" data-type="entity-link" >CreateClientDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateRegistrarConfigDto.html" data-type="entity-link" >CreateRegistrarConfigDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateStatusListDto.html" data-type="entity-link" >CreateStatusListDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateTenantDto.html" data-type="entity-link" >CreateTenantDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/CredentialClaimsMatchIdsConstraint.html" data-type="entity-link" >CredentialClaimsMatchIdsConstraint</a>
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
                                <a href="classes/CredentialConfigUpdate.html" data-type="entity-link" >CredentialConfigUpdate</a>
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
                                <a href="classes/ExternalTrustListEntity.html" data-type="entity-link" >ExternalTrustListEntity</a>
                            </li>
                            <li class="link">
                                <a href="classes/FileUploadDto.html" data-type="entity-link" >FileUploadDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ImportTenantDto.html" data-type="entity-link" >ImportTenantDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InlineClaimsSource.html" data-type="entity-link" >InlineClaimsSource</a>
                            </li>
                            <li class="link">
                                <a href="classes/InternalTrustListEntity.html" data-type="entity-link" >InternalTrustListEntity</a>
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
                                <a href="classes/PresentationConfigUpdateDto.html" data-type="entity-link" >PresentationConfigUpdateDto</a>
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
                                <a href="classes/SessionStorageConfig.html" data-type="entity-link" >SessionStorageConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/StatusListAggregationDto.html" data-type="entity-link" >StatusListAggregationDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/StatusListConfig.html" data-type="entity-link" >StatusListConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/StatusListImportDto.html" data-type="entity-link" >StatusListImportDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/StatusListResponseDto.html" data-type="entity-link" >StatusListResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/StatusUpdateDto.html" data-type="entity-link" >StatusUpdateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/TokenResponse.html" data-type="entity-link" >TokenResponse</a>
                            </li>
                            <li class="link">
                                <a href="classes/TransactionData.html" data-type="entity-link" >TransactionData</a>
                            </li>
                            <li class="link">
                                <a href="classes/TrustedAuthorityQuery.html" data-type="entity-link" >TrustedAuthorityQuery</a>
                            </li>
                            <li class="link">
                                <a href="classes/TrustListCreateDto.html" data-type="entity-link" >TrustListCreateDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/TrustListEntityInfo.html" data-type="entity-link" >TrustListEntityInfo</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateClientDto.html" data-type="entity-link" >UpdateClientDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateKeyDto.html" data-type="entity-link" >UpdateKeyDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateRegistrarConfigDto.html" data-type="entity-link" >UpdateRegistrarConfigDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateSessionConfigDto.html" data-type="entity-link" >UpdateSessionConfigDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateStatusListConfigDto.html" data-type="entity-link" >UpdateStatusListConfigDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateStatusListDto.html" data-type="entity-link" >UpdateStatusListDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateTenantDto.html" data-type="entity-link" >UpdateTenantDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ValidationErrorFilter.html" data-type="entity-link" >ValidationErrorFilter</a>
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
                                <a href="classes/WebhookClaimsSource.html" data-type="entity-link" >WebhookClaimsSource</a>
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
                                    <a href="injectables/CertService.html" data-type="entity-link" >CertService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FilesService.html" data-type="entity-link" >FilesService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/InternalClientsProvider.html" data-type="entity-link" >InternalClientsProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/JwtAuthGuard.html" data-type="entity-link" >JwtAuthGuard</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/KeycloakClientsProvider.html" data-type="entity-link" >KeycloakClientsProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SessionLoggerInterceptor.html" data-type="entity-link" >SessionLoggerInterceptor</a>
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
                                <a href="interfaces/CachedToken.html" data-type="entity-link" >CachedToken</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CryptoImplementation.html" data-type="entity-link" >CryptoImplementation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FileImportData.html" data-type="entity-link" >FileImportData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FileStorage.html" data-type="entity-link" >FileStorage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FindCertOptions.html" data-type="entity-link" >FindCertOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GenerateTokenOptions.html" data-type="entity-link" >GenerateTokenOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImportableService.html" data-type="entity-link" >ImportableService</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImportOptions.html" data-type="entity-link" >ImportOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/InternalTokenPayload.html" data-type="entity-link" >InternalTokenPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IssuerMetadata.html" data-type="entity-link" >IssuerMetadata</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/JsonSchemaV00.html" data-type="entity-link" >JsonSchemaV00</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Jwk.html" data-type="entity-link" >Jwk</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ListAndSchemeInformation.html" data-type="entity-link" >ListAndSchemeInformation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoggerConfiguration.html" data-type="entity-link" >LoggerConfiguration</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoTE.html" data-type="entity-link" >LoTE</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/LoTEQualifier.html" data-type="entity-link" >LoTEQualifier</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MdocIssueOptions.html" data-type="entity-link" >MdocIssueOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MultiLangString.html" data-type="entity-link" >MultiLangString</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/NonEmptyMultiLangURI.html" data-type="entity-link" >NonEmptyMultiLangURI</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OidcDiscoveryDto.html" data-type="entity-link" >OidcDiscoveryDto</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OidcDiscoveryDto-1.html" data-type="entity-link" >OidcDiscoveryDto</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/OtherLoTEPointer.html" data-type="entity-link" >OtherLoTEPointer</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParsedAccessTokenAuthorizationCodeRequestGrant.html" data-type="entity-link" >ParsedAccessTokenAuthorizationCodeRequestGrant</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ParsedAccessTokenPreAuthorizedCodeRequestGrant.html" data-type="entity-link" >ParsedAccessTokenPreAuthorizedCodeRequestGrant</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PkiOb.html" data-type="entity-link" >PkiOb</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PostalAddress.html" data-type="entity-link" >PostalAddress</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PresentationRequestOptions.html" data-type="entity-link" >PresentationRequestOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RegisteredImporter.html" data-type="entity-link" >RegisteredImporter</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SchemeOperatorAddress.html" data-type="entity-link" >SchemeOperatorAddress</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SdJwtVcIssueOptions.html" data-type="entity-link" >SdJwtVcIssueOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ServiceDigitalIdentity.html" data-type="entity-link" >ServiceDigitalIdentity</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ServiceHistoryInstance.html" data-type="entity-link" >ServiceHistoryInstance</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ServiceInformation.html" data-type="entity-link" >ServiceInformation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ServiceSupplyPointURI.html" data-type="entity-link" >ServiceSupplyPointURI</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionLogContext.html" data-type="entity-link" >SessionLogContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TEAddress.html" data-type="entity-link" >TEAddress</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Tenants.html" data-type="entity-link" >Tenants</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TenantSetupFn.html" data-type="entity-link" >TenantSetupFn</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TokenPayload.html" data-type="entity-link" >TokenPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TrustedEntity.html" data-type="entity-link" >TrustedEntity</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TrustedEntityInformation.html" data-type="entity-link" >TrustedEntityInformation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TrustedEntityService.html" data-type="entity-link" >TrustedEntityService</a>
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