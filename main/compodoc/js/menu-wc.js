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
                                            'data-bs-target="#controllers-links-module-ConfigurationModule-9164f01578608abe01124b03c306459f26ef0a708acda8fa7cf0c9115296c21218857914cb3bd37f7b4de589091bc92b3abb1f0fe8fba32f8306d7f5dbd8011c"' : 'data-bs-target="#xs-controllers-links-module-ConfigurationModule-9164f01578608abe01124b03c306459f26ef0a708acda8fa7cf0c9115296c21218857914cb3bd37f7b4de589091bc92b3abb1f0fe8fba32f8306d7f5dbd8011c"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-ConfigurationModule-9164f01578608abe01124b03c306459f26ef0a708acda8fa7cf0c9115296c21218857914cb3bd37f7b4de589091bc92b3abb1f0fe8fba32f8306d7f5dbd8011c"' :
                                            'id="xs-controllers-links-module-ConfigurationModule-9164f01578608abe01124b03c306459f26ef0a708acda8fa7cf0c9115296c21218857914cb3bd37f7b4de589091bc92b3abb1f0fe8fba32f8306d7f5dbd8011c"' }>
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
                                        'data-bs-target="#injectables-links-module-ConfigurationModule-9164f01578608abe01124b03c306459f26ef0a708acda8fa7cf0c9115296c21218857914cb3bd37f7b4de589091bc92b3abb1f0fe8fba32f8306d7f5dbd8011c"' : 'data-bs-target="#xs-injectables-links-module-ConfigurationModule-9164f01578608abe01124b03c306459f26ef0a708acda8fa7cf0c9115296c21218857914cb3bd37f7b4de589091bc92b3abb1f0fe8fba32f8306d7f5dbd8011c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ConfigurationModule-9164f01578608abe01124b03c306459f26ef0a708acda8fa7cf0c9115296c21218857914cb3bd37f7b4de589091bc92b3abb1f0fe8fba32f8306d7f5dbd8011c"' :
                                        'id="xs-injectables-links-module-ConfigurationModule-9164f01578608abe01124b03c306459f26ef0a708acda8fa7cf0c9115296c21218857914cb3bd37f7b4de589091bc92b3abb1f0fe8fba32f8306d7f5dbd8011c"' }>
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
                                <a href="modules/EncryptionModule.html" data-type="entity-link" >EncryptionModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-EncryptionModule-31356cd6c121c5592f8982633af86a06bb9149c24762bb77c8fba336530a55e3fdc1e8d5e7dccce6ec8c2609507071e696b0a6c621195391c02c533b8f3475f9"' : 'data-bs-target="#xs-injectables-links-module-EncryptionModule-31356cd6c121c5592f8982633af86a06bb9149c24762bb77c8fba336530a55e3fdc1e8d5e7dccce6ec8c2609507071e696b0a6c621195391c02c533b8f3475f9"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-EncryptionModule-31356cd6c121c5592f8982633af86a06bb9149c24762bb77c8fba336530a55e3fdc1e8d5e7dccce6ec8c2609507071e696b0a6c621195391c02c533b8f3475f9"' :
                                        'id="xs-injectables-links-module-EncryptionModule-31356cd6c121c5592f8982633af86a06bb9149c24762bb77c8fba336530a55e3fdc1e8d5e7dccce6ec8c2609507071e696b0a6c621195391c02c533b8f3475f9"' }>
                                        <li class="link">
                                            <a href="injectables/EncryptionService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >EncryptionService</a>
                                        </li>
                                    </ul>
                                </li>
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
                                            'data-bs-target="#controllers-links-module-IssuanceModule-4842e74ae6cb8a01af9a79460a56fbe525ecc31b4c516ba0e413cf50da90e3278974e8bc7bfa9d06f010fbea96dee6e5988e768d8f2438227f66c4c20a69646b"' : 'data-bs-target="#xs-controllers-links-module-IssuanceModule-4842e74ae6cb8a01af9a79460a56fbe525ecc31b4c516ba0e413cf50da90e3278974e8bc7bfa9d06f010fbea96dee6e5988e768d8f2438227f66c4c20a69646b"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-IssuanceModule-4842e74ae6cb8a01af9a79460a56fbe525ecc31b4c516ba0e413cf50da90e3278974e8bc7bfa9d06f010fbea96dee6e5988e768d8f2438227f66c4c20a69646b"' :
                                            'id="xs-controllers-links-module-IssuanceModule-4842e74ae6cb8a01af9a79460a56fbe525ecc31b4c516ba0e413cf50da90e3278974e8bc7bfa9d06f010fbea96dee6e5988e768d8f2438227f66c4c20a69646b"' }>
                                            <li class="link">
                                                <a href="controllers/AuthorizeController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthorizeController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/ChainedAsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ChainedAsController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/CredentialOfferController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CredentialOfferController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/DeferredController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DeferredController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/InteractiveAuthorizationController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >InteractiveAuthorizationController</a>
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
                                        'data-bs-target="#injectables-links-module-IssuanceModule-4842e74ae6cb8a01af9a79460a56fbe525ecc31b4c516ba0e413cf50da90e3278974e8bc7bfa9d06f010fbea96dee6e5988e768d8f2438227f66c4c20a69646b"' : 'data-bs-target="#xs-injectables-links-module-IssuanceModule-4842e74ae6cb8a01af9a79460a56fbe525ecc31b4c516ba0e413cf50da90e3278974e8bc7bfa9d06f010fbea96dee6e5988e768d8f2438227f66c4c20a69646b"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IssuanceModule-4842e74ae6cb8a01af9a79460a56fbe525ecc31b4c516ba0e413cf50da90e3278974e8bc7bfa9d06f010fbea96dee6e5988e768d8f2438227f66c4c20a69646b"' :
                                        'id="xs-injectables-links-module-IssuanceModule-4842e74ae6cb8a01af9a79460a56fbe525ecc31b4c516ba0e413cf50da90e3278974e8bc7bfa9d06f010fbea96dee6e5988e768d8f2438227f66c4c20a69646b"' }>
                                        <li class="link">
                                            <a href="injectables/AuthorizeService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthorizeService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ChainedAsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ChainedAsService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/InteractiveAuthorizationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >InteractiveAuthorizationService</a>
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
                                            'data-bs-target="#controllers-links-module-PresentationsModule-3b4f1e5933e27a557f7c7881c810bcddabe9d251d0dfe2a0da8c2d9f8eaec00265b3b19cc7541bab02c49471a2fdba96f0a9cc02e7da9e8ddf97b1cf923f7c7d"' : 'data-bs-target="#xs-controllers-links-module-PresentationsModule-3b4f1e5933e27a557f7c7881c810bcddabe9d251d0dfe2a0da8c2d9f8eaec00265b3b19cc7541bab02c49471a2fdba96f0a9cc02e7da9e8ddf97b1cf923f7c7d"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-PresentationsModule-3b4f1e5933e27a557f7c7881c810bcddabe9d251d0dfe2a0da8c2d9f8eaec00265b3b19cc7541bab02c49471a2fdba96f0a9cc02e7da9e8ddf97b1cf923f7c7d"' :
                                            'id="xs-controllers-links-module-PresentationsModule-3b4f1e5933e27a557f7c7881c810bcddabe9d251d0dfe2a0da8c2d9f8eaec00265b3b19cc7541bab02c49471a2fdba96f0a9cc02e7da9e8ddf97b1cf923f7c7d"' }>
                                            <li class="link">
                                                <a href="controllers/PresentationManagementController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PresentationManagementController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PresentationsModule-3b4f1e5933e27a557f7c7881c810bcddabe9d251d0dfe2a0da8c2d9f8eaec00265b3b19cc7541bab02c49471a2fdba96f0a9cc02e7da9e8ddf97b1cf923f7c7d"' : 'data-bs-target="#xs-injectables-links-module-PresentationsModule-3b4f1e5933e27a557f7c7881c810bcddabe9d251d0dfe2a0da8c2d9f8eaec00265b3b19cc7541bab02c49471a2fdba96f0a9cc02e7da9e8ddf97b1cf923f7c7d"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PresentationsModule-3b4f1e5933e27a557f7c7881c810bcddabe9d251d0dfe2a0da8c2d9f8eaec00265b3b19cc7541bab02c49471a2fdba96f0a9cc02e7da9e8ddf97b1cf923f7c7d"' :
                                        'id="xs-injectables-links-module-PresentationsModule-3b4f1e5933e27a557f7c7881c810bcddabe9d251d0dfe2a0da8c2d9f8eaec00265b3b19cc7541bab02c49471a2fdba96f0a9cc02e7da9e8ddf97b1cf923f7c7d"' }>
                                        <li class="link">
                                            <a href="injectables/CredentialChainValidationService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CredentialChainValidationService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/MdocverifierService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MdocverifierService</a>
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
                                            'data-bs-target="#controllers-links-module-SessionModule-35399a119d2a067dfd57b959dd16473705f68cb77b8044ff6b7c074c907eea17306dc560d194b7fe2a3346e1d25110ae15cba7903b0e243330bb85125fcc0133"' : 'data-bs-target="#xs-controllers-links-module-SessionModule-35399a119d2a067dfd57b959dd16473705f68cb77b8044ff6b7c074c907eea17306dc560d194b7fe2a3346e1d25110ae15cba7903b0e243330bb85125fcc0133"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SessionModule-35399a119d2a067dfd57b959dd16473705f68cb77b8044ff6b7c074c907eea17306dc560d194b7fe2a3346e1d25110ae15cba7903b0e243330bb85125fcc0133"' :
                                            'id="xs-controllers-links-module-SessionModule-35399a119d2a067dfd57b959dd16473705f68cb77b8044ff6b7c074c907eea17306dc560d194b7fe2a3346e1d25110ae15cba7903b0e243330bb85125fcc0133"' }>
                                            <li class="link">
                                                <a href="controllers/SessionConfigController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionConfigController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/SessionController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionController</a>
                                            </li>
                                            <li class="link">
                                                <a href="controllers/SessionEventsController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionEventsController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SessionModule-35399a119d2a067dfd57b959dd16473705f68cb77b8044ff6b7c074c907eea17306dc560d194b7fe2a3346e1d25110ae15cba7903b0e243330bb85125fcc0133"' : 'data-bs-target="#xs-injectables-links-module-SessionModule-35399a119d2a067dfd57b959dd16473705f68cb77b8044ff6b7c074c907eea17306dc560d194b7fe2a3346e1d25110ae15cba7903b0e243330bb85125fcc0133"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SessionModule-35399a119d2a067dfd57b959dd16473705f68cb77b8044ff6b7c074c907eea17306dc560d194b7fe2a3346e1d25110ae15cba7903b0e243330bb85125fcc0133"' :
                                        'id="xs-injectables-links-module-SessionModule-35399a119d2a067dfd57b959dd16473705f68cb77b8044ff6b7c074c907eea17306dc560d194b7fe2a3346e1d25110ae15cba7903b0e243330bb85125fcc0133"' }>
                                        <li class="link">
                                            <a href="injectables/SessionConfigService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionConfigService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SessionEventsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionEventsService</a>
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
                                            'data-bs-target="#controllers-links-module-TrustModule-106232723fc93d3ed613bbd398caf56667a5ef33e3c8e82d74ccb4119eb9c2e4d0ee40dbdfa193ee7f6df2f908597de7e82b2c16cf8a4c9bc7a6d88bc316899a"' : 'data-bs-target="#xs-controllers-links-module-TrustModule-106232723fc93d3ed613bbd398caf56667a5ef33e3c8e82d74ccb4119eb9c2e4d0ee40dbdfa193ee7f6df2f908597de7e82b2c16cf8a4c9bc7a6d88bc316899a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-TrustModule-106232723fc93d3ed613bbd398caf56667a5ef33e3c8e82d74ccb4119eb9c2e4d0ee40dbdfa193ee7f6df2f908597de7e82b2c16cf8a4c9bc7a6d88bc316899a"' :
                                            'id="xs-controllers-links-module-TrustModule-106232723fc93d3ed613bbd398caf56667a5ef33e3c8e82d74ccb4119eb9c2e4d0ee40dbdfa193ee7f6df2f908597de7e82b2c16cf8a4c9bc7a6d88bc316899a"' }>
                                            <li class="link">
                                                <a href="controllers/CacheController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CacheController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-TrustModule-106232723fc93d3ed613bbd398caf56667a5ef33e3c8e82d74ccb4119eb9c2e4d0ee40dbdfa193ee7f6df2f908597de7e82b2c16cf8a4c9bc7a6d88bc316899a"' : 'data-bs-target="#xs-injectables-links-module-TrustModule-106232723fc93d3ed613bbd398caf56667a5ef33e3c8e82d74ccb4119eb9c2e4d0ee40dbdfa193ee7f6df2f908597de7e82b2c16cf8a4c9bc7a6d88bc316899a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-TrustModule-106232723fc93d3ed613bbd398caf56667a5ef33e3c8e82d74ccb4119eb9c2e4d0ee40dbdfa193ee7f6df2f908597de7e82b2c16cf8a4c9bc7a6d88bc316899a"' :
                                        'id="xs-injectables-links-module-TrustModule-106232723fc93d3ed613bbd398caf56667a5ef33e3c8e82d74ccb4119eb9c2e4d0ee40dbdfa193ee7f6df2f908597de7e82b2c16cf8a4c9bc7a6d88bc316899a"' }>
                                        <li class="link">
                                            <a href="injectables/LoteParserService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LoteParserService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/StatusListVerifierService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >StatusListVerifierService</a>
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
                                    <a href="controllers/MetricsController.html" data-type="entity-link" >MetricsController</a>
                                </li>
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
                                    <a href="entities/ChainedAsSessionEntity.html" data-type="entity-link" >ChainedAsSessionEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/ClientEntity.html" data-type="entity-link" >ClientEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/CredentialConfig.html" data-type="entity-link" >CredentialConfig</a>
                                </li>
                                <li class="link">
                                    <a href="entities/DeferredTransactionEntity.html" data-type="entity-link" >DeferredTransactionEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/FileEntity.html" data-type="entity-link" >FileEntity</a>
                                </li>
                                <li class="link">
                                    <a href="entities/InteractiveAuthSessionEntity.html" data-type="entity-link" >InteractiveAuthSessionEntity</a>
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
                                <a href="classes/AuthorizationDetailsDto.html" data-type="entity-link" >AuthorizationDetailsDto</a>
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
                                <a href="classes/AuthResponse.html" data-type="entity-link" >AuthResponse</a>
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
                                <a href="classes/ChainedAsAuthorizeQueryDto.html" data-type="entity-link" >ChainedAsAuthorizeQueryDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ChainedAsConfig.html" data-type="entity-link" >ChainedAsConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/ChainedAsErrorResponseDto.html" data-type="entity-link" >ChainedAsErrorResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ChainedAsParRequestDto.html" data-type="entity-link" >ChainedAsParRequestDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ChainedAsParResponseDto.html" data-type="entity-link" >ChainedAsParResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ChainedAsTokenConfig.html" data-type="entity-link" >ChainedAsTokenConfig</a>
                            </li>
                            <li class="link">
                                <a href="classes/ChainedAsTokenRequestDto.html" data-type="entity-link" >ChainedAsTokenRequestDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/ChainedAsTokenResponseDto.html" data-type="entity-link" >ChainedAsTokenResponseDto</a>
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
                                <a href="classes/CompleteDeferredDto.html" data-type="entity-link" >CompleteDeferredDto</a>
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
                                <a href="classes/CredentialRequestException.html" data-type="entity-link" >CredentialRequestException</a>
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
                                <a href="classes/DeferredCredentialException.html" data-type="entity-link" >DeferredCredentialException</a>
                            </li>
                            <li class="link">
                                <a href="classes/DeferredCredentialRequestDto.html" data-type="entity-link" >DeferredCredentialRequestDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/DeferredOperationResponse.html" data-type="entity-link" >DeferredOperationResponse</a>
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
                                <a href="classes/FailDeferredDto.html" data-type="entity-link" >FailDeferredDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/FileUploadDto.html" data-type="entity-link" >FileUploadDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/IaeActionBase.html" data-type="entity-link" >IaeActionBase</a>
                            </li>
                            <li class="link">
                                <a href="classes/IaeActionOpenid4vpPresentation.html" data-type="entity-link" >IaeActionOpenid4vpPresentation</a>
                            </li>
                            <li class="link">
                                <a href="classes/IaeActionRedirectToWeb.html" data-type="entity-link" >IaeActionRedirectToWeb</a>
                            </li>
                            <li class="link">
                                <a href="classes/IaeActionsWrapper.html" data-type="entity-link" >IaeActionsWrapper</a>
                            </li>
                            <li class="link">
                                <a href="classes/ImportTenantDto.html" data-type="entity-link" >ImportTenantDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InlineClaimsSource.html" data-type="entity-link" >InlineClaimsSource</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteractiveAuthorizationCodeResponseDto.html" data-type="entity-link" >InteractiveAuthorizationCodeResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteractiveAuthorizationErrorResponseDto.html" data-type="entity-link" >InteractiveAuthorizationErrorResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteractiveAuthorizationFollowUpRequestDto.html" data-type="entity-link" >InteractiveAuthorizationFollowUpRequestDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteractiveAuthorizationInitialRequestDto.html" data-type="entity-link" >InteractiveAuthorizationInitialRequestDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteractiveAuthorizationOpenid4vpResponseDto.html" data-type="entity-link" >InteractiveAuthorizationOpenid4vpResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteractiveAuthorizationRedirectToWebResponseDto.html" data-type="entity-link" >InteractiveAuthorizationRedirectToWebResponseDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/InteractiveAuthorizationRequestDto.html" data-type="entity-link" >InteractiveAuthorizationRequestDto</a>
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
                                <a href="classes/Openid4vpRequestDto.html" data-type="entity-link" >Openid4vpRequestDto</a>
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
                                <a href="classes/TokenErrorException.html" data-type="entity-link" >TokenErrorException</a>
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
                                <a href="classes/UpstreamOidcConfig.html" data-type="entity-link" >UpstreamOidcConfig</a>
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
                                    <a href="injectables/AwsSecretsManagerEncryptionKeyProvider.html" data-type="entity-link" >AwsSecretsManagerEncryptionKeyProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AzureKeyVaultEncryptionKeyProvider.html" data-type="entity-link" >AzureKeyVaultEncryptionKeyProvider</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CertService.html" data-type="entity-link" >CertService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CrlValidationService.html" data-type="entity-link" >CrlValidationService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/EnvEncryptionKeyProvider.html" data-type="entity-link" >EnvEncryptionKeyProvider</a>
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
                                <li class="link">
                                    <a href="injectables/VaultEncryptionKeyProvider.html" data-type="entity-link" >VaultEncryptionKeyProvider</a>
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
                                <a href="guards/MetricsAuthGuard.html" data-type="entity-link" >MetricsAuthGuard</a>
                            </li>
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
                                <a href="interfaces/AuthorizationIdentity.html" data-type="entity-link" >AuthorizationIdentity</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/BuildCredentialConfigOptions.html" data-type="entity-link" >BuildCredentialConfigOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CachedCrl.html" data-type="entity-link" >CachedCrl</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CachedJwt.html" data-type="entity-link" >CachedJwt</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CachedStatusList.html" data-type="entity-link" >CachedStatusList</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CachedToken.html" data-type="entity-link" >CachedToken</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CertificateChainInfo.html" data-type="entity-link" >CertificateChainInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CertValidationResult.html" data-type="entity-link" >CertValidationResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ChainValidationPolicy.html" data-type="entity-link" >ChainValidationPolicy</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ChainValidationResult.html" data-type="entity-link" >ChainValidationResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ClaimsWebhookResult.html" data-type="entity-link" >ClaimsWebhookResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CredentialMetadataInput.html" data-type="entity-link" >CredentialMetadataInput</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CrlValidationResult.html" data-type="entity-link" >CrlValidationResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CryptoImplementation.html" data-type="entity-link" >CryptoImplementation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/EncryptionKeyProvider.html" data-type="entity-link" >EncryptionKeyProvider</a>
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
                                <a href="interfaces/InteractiveAuthFollowUpRequest.html" data-type="entity-link" >InteractiveAuthFollowUpRequest</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/InteractiveAuthInitialRequest.html" data-type="entity-link" >InteractiveAuthInitialRequest</a>
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
                                <a href="interfaces/MdocErrorDetails.html" data-type="entity-link" >MdocErrorDetails</a>
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
                                <a href="interfaces/OidcDiscoveryDocument.html" data-type="entity-link" >OidcDiscoveryDocument</a>
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
                                <a href="interfaces/ParsedInteractiveAuthorizationRequest.html" data-type="entity-link" >ParsedInteractiveAuthorizationRequest</a>
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
                                <a href="interfaces/SessionEventMessage.html" data-type="entity-link" >SessionEventMessage</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionLogContext.html" data-type="entity-link" >SessionLogContext</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SessionStatusChangedEvent.html" data-type="entity-link" >SessionStatusChangedEvent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StatusCheckResult.html" data-type="entity-link" >StatusCheckResult</a>
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
                                <a href="interfaces/TlsOptions.html" data-type="entity-link" >TlsOptions</a>
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
                            <li class="link">
                                <a href="interfaces/VaultKVResponse.html" data-type="entity-link" >VaultKVResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WebhookResponse.html" data-type="entity-link" >WebhookResponse</a>
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