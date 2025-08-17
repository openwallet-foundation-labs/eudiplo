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
                                            'data-bs-target="#controllers-links-module-AppModule-fd78cdf743936f9353cfbe6df657840b460cc459d856b82c86999af026fa6b9612c6755ed02e559baa69c39738694cc1aa5fb5699df48f2c207f3eacf4a36160"' : 'data-bs-target="#xs-controllers-links-module-AppModule-fd78cdf743936f9353cfbe6df657840b460cc459d856b82c86999af026fa6b9612c6755ed02e559baa69c39738694cc1aa5fb5699df48f2c207f3eacf4a36160"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-fd78cdf743936f9353cfbe6df657840b460cc459d856b82c86999af026fa6b9612c6755ed02e559baa69c39738694cc1aa5fb5699df48f2c207f3eacf4a36160"' :
                                            'id="xs-controllers-links-module-AppModule-fd78cdf743936f9353cfbe6df657840b460cc459d856b82c86999af026fa6b9612c6755ed02e559baa69c39738694cc1aa5fb5699df48f2c207f3eacf4a36160"' }>
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
                                        'data-bs-target="#injectables-links-module-AppModule-fd78cdf743936f9353cfbe6df657840b460cc459d856b82c86999af026fa6b9612c6755ed02e559baa69c39738694cc1aa5fb5699df48f2c207f3eacf4a36160"' : 'data-bs-target="#xs-injectables-links-module-AppModule-fd78cdf743936f9353cfbe6df657840b460cc459d856b82c86999af026fa6b9612c6755ed02e559baa69c39738694cc1aa5fb5699df48f2c207f3eacf4a36160"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-fd78cdf743936f9353cfbe6df657840b460cc459d856b82c86999af026fa6b9612c6755ed02e559baa69c39738694cc1aa5fb5699df48f2c207f3eacf4a36160"' :
                                        'id="xs-injectables-links-module-AppModule-fd78cdf743936f9353cfbe6df657840b460cc459d856b82c86999af026fa6b9612c6755ed02e559baa69c39738694cc1aa5fb5699df48f2c207f3eacf4a36160"' }>
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
                                            'data-bs-target="#controllers-links-module-AuthModule-e1177577a60892d0de40adbd609cb2ad6227033137c9002f5bda32daac0246354df9d7ea480e65faf1e68761e3d93b22224a868d33fb4904cef0a111fe143124"' : 'data-bs-target="#xs-controllers-links-module-AuthModule-e1177577a60892d0de40adbd609cb2ad6227033137c9002f5bda32daac0246354df9d7ea480e65faf1e68761e3d93b22224a868d33fb4904cef0a111fe143124"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AuthModule-e1177577a60892d0de40adbd609cb2ad6227033137c9002f5bda32daac0246354df9d7ea480e65faf1e68761e3d93b22224a868d33fb4904cef0a111fe143124"' :
                                            'id="xs-controllers-links-module-AuthModule-e1177577a60892d0de40adbd609cb2ad6227033137c9002f5bda32daac0246354df9d7ea480e65faf1e68761e3d93b22224a868d33fb4904cef0a111fe143124"' }>
                                            <li class="link">
                                                <a href="controllers/AuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-e1177577a60892d0de40adbd609cb2ad6227033137c9002f5bda32daac0246354df9d7ea480e65faf1e68761e3d93b22224a868d33fb4904cef0a111fe143124"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-e1177577a60892d0de40adbd609cb2ad6227033137c9002f5bda32daac0246354df9d7ea480e65faf1e68761e3d93b22224a868d33fb4904cef0a111fe143124"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-e1177577a60892d0de40adbd609cb2ad6227033137c9002f5bda32daac0246354df9d7ea480e65faf1e68761e3d93b22224a868d33fb4904cef0a111fe143124"' :
                                        'id="xs-injectables-links-module-AuthModule-e1177577a60892d0de40adbd609cb2ad6227033137c9002f5bda32daac0246354df9d7ea480e65faf1e68761e3d93b22224a868d33fb4904cef0a111fe143124"' }>
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
                                        'data-bs-target="#injectables-links-module-CryptoImplementatationModule-9ed241bb3c35761c8f38842c323feb774303866e91a222a75e0573a194b0120905c7f92c1000a75c7dcd34c0d73ba20841b2ffd44379d4cf0fb709ccba2622d1"' : 'data-bs-target="#xs-injectables-links-module-CryptoImplementatationModule-9ed241bb3c35761c8f38842c323feb774303866e91a222a75e0573a194b0120905c7f92c1000a75c7dcd34c0d73ba20841b2ffd44379d4cf0fb709ccba2622d1"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoImplementatationModule-9ed241bb3c35761c8f38842c323feb774303866e91a222a75e0573a194b0120905c7f92c1000a75c7dcd34c0d73ba20841b2ffd44379d4cf0fb709ccba2622d1"' :
                                        'id="xs-injectables-links-module-CryptoImplementatationModule-9ed241bb3c35761c8f38842c323feb774303866e91a222a75e0573a194b0120905c7f92c1000a75c7dcd34c0d73ba20841b2ffd44379d4cf0fb709ccba2622d1"' }>
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
                                            'data-bs-target="#controllers-links-module-CryptoModule-2c0c31da7c2402ffdae57f687c91ddc5c9bedad9157420341c7c6cb9bcbcb71eea3033fea9604daeb4d8cbca4d60de787cf57033adbd4fc3e9005f05f7540d5a"' : 'data-bs-target="#xs-controllers-links-module-CryptoModule-2c0c31da7c2402ffdae57f687c91ddc5c9bedad9157420341c7c6cb9bcbcb71eea3033fea9604daeb4d8cbca4d60de787cf57033adbd4fc3e9005f05f7540d5a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-CryptoModule-2c0c31da7c2402ffdae57f687c91ddc5c9bedad9157420341c7c6cb9bcbcb71eea3033fea9604daeb4d8cbca4d60de787cf57033adbd4fc3e9005f05f7540d5a"' :
                                            'id="xs-controllers-links-module-CryptoModule-2c0c31da7c2402ffdae57f687c91ddc5c9bedad9157420341c7c6cb9bcbcb71eea3033fea9604daeb4d8cbca4d60de787cf57033adbd4fc3e9005f05f7540d5a"' }>
                                            <li class="link">
                                                <a href="controllers/KeyController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >KeyController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-CryptoModule-2c0c31da7c2402ffdae57f687c91ddc5c9bedad9157420341c7c6cb9bcbcb71eea3033fea9604daeb4d8cbca4d60de787cf57033adbd4fc3e9005f05f7540d5a"' : 'data-bs-target="#xs-injectables-links-module-CryptoModule-2c0c31da7c2402ffdae57f687c91ddc5c9bedad9157420341c7c6cb9bcbcb71eea3033fea9604daeb4d8cbca4d60de787cf57033adbd4fc3e9005f05f7540d5a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-CryptoModule-2c0c31da7c2402ffdae57f687c91ddc5c9bedad9157420341c7c6cb9bcbcb71eea3033fea9604daeb4d8cbca4d60de787cf57033adbd4fc3e9005f05f7540d5a"' :
                                        'id="xs-injectables-links-module-CryptoModule-2c0c31da7c2402ffdae57f687c91ddc5c9bedad9157420341c7c6cb9bcbcb71eea3033fea9604daeb4d8cbca4d60de787cf57033adbd4fc3e9005f05f7540d5a"' }>
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
                                            'data-bs-target="#controllers-links-module-IssuerModule-eb3ac190011cf3e76b46afa89fa64a831179fdd3d1d824b2f43011cf1bcf26239fc454817517b71af01d6bac8d75e85eec5b5c9e436a20e10264b69bbd196a6a"' : 'data-bs-target="#xs-controllers-links-module-IssuerModule-eb3ac190011cf3e76b46afa89fa64a831179fdd3d1d824b2f43011cf1bcf26239fc454817517b71af01d6bac8d75e85eec5b5c9e436a20e10264b69bbd196a6a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-IssuerModule-eb3ac190011cf3e76b46afa89fa64a831179fdd3d1d824b2f43011cf1bcf26239fc454817517b71af01d6bac8d75e85eec5b5c9e436a20e10264b69bbd196a6a"' :
                                            'id="xs-controllers-links-module-IssuerModule-eb3ac190011cf3e76b46afa89fa64a831179fdd3d1d824b2f43011cf1bcf26239fc454817517b71af01d6bac8d75e85eec5b5c9e436a20e10264b69bbd196a6a"' }>
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
                                        'data-bs-target="#injectables-links-module-IssuerModule-eb3ac190011cf3e76b46afa89fa64a831179fdd3d1d824b2f43011cf1bcf26239fc454817517b71af01d6bac8d75e85eec5b5c9e436a20e10264b69bbd196a6a"' : 'data-bs-target="#xs-injectables-links-module-IssuerModule-eb3ac190011cf3e76b46afa89fa64a831179fdd3d1d824b2f43011cf1bcf26239fc454817517b71af01d6bac8d75e85eec5b5c9e436a20e10264b69bbd196a6a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-IssuerModule-eb3ac190011cf3e76b46afa89fa64a831179fdd3d1d824b2f43011cf1bcf26239fc454817517b71af01d6bac8d75e85eec5b5c9e436a20e10264b69bbd196a6a"' :
                                        'id="xs-injectables-links-module-IssuerModule-eb3ac190011cf3e76b46afa89fa64a831179fdd3d1d824b2f43011cf1bcf26239fc454817517b71af01d6bac8d75e85eec5b5c9e436a20e10264b69bbd196a6a"' }>
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
                                            'data-bs-target="#controllers-links-module-OAuthModule-35f407b240554b7f6f2f583312e5c9bc4637d7e7295aa68e00ac7fba8731ffff95644493df31b3ccd145583eecdf2ef4ae6b7857f1d8a55e15b29d089fbb06eb"' : 'data-bs-target="#xs-controllers-links-module-OAuthModule-35f407b240554b7f6f2f583312e5c9bc4637d7e7295aa68e00ac7fba8731ffff95644493df31b3ccd145583eecdf2ef4ae6b7857f1d8a55e15b29d089fbb06eb"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-OAuthModule-35f407b240554b7f6f2f583312e5c9bc4637d7e7295aa68e00ac7fba8731ffff95644493df31b3ccd145583eecdf2ef4ae6b7857f1d8a55e15b29d089fbb06eb"' :
                                            'id="xs-controllers-links-module-OAuthModule-35f407b240554b7f6f2f583312e5c9bc4637d7e7295aa68e00ac7fba8731ffff95644493df31b3ccd145583eecdf2ef4ae6b7857f1d8a55e15b29d089fbb06eb"' }>
                                            <li class="link">
                                                <a href="controllers/OAuthController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >OAuthController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-OAuthModule-35f407b240554b7f6f2f583312e5c9bc4637d7e7295aa68e00ac7fba8731ffff95644493df31b3ccd145583eecdf2ef4ae6b7857f1d8a55e15b29d089fbb06eb"' : 'data-bs-target="#xs-injectables-links-module-OAuthModule-35f407b240554b7f6f2f583312e5c9bc4637d7e7295aa68e00ac7fba8731ffff95644493df31b3ccd145583eecdf2ef4ae6b7857f1d8a55e15b29d089fbb06eb"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-OAuthModule-35f407b240554b7f6f2f583312e5c9bc4637d7e7295aa68e00ac7fba8731ffff95644493df31b3ccd145583eecdf2ef4ae6b7857f1d8a55e15b29d089fbb06eb"' :
                                        'id="xs-injectables-links-module-OAuthModule-35f407b240554b7f6f2f583312e5c9bc4637d7e7295aa68e00ac7fba8731ffff95644493df31b3ccd145583eecdf2ef4ae6b7857f1d8a55e15b29d089fbb06eb"' }>
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
                                        'data-bs-target="#injectables-links-module-RegistrarModule-95b198c95031e0695d177a8d11e7f5f6fb76ad0e48e1954b9e23caabf871e3de8131f9b0a0114577a27ad6e98cd5134e79bc6222fe33cf0dea2060a0335760d2"' : 'data-bs-target="#xs-injectables-links-module-RegistrarModule-95b198c95031e0695d177a8d11e7f5f6fb76ad0e48e1954b9e23caabf871e3de8131f9b0a0114577a27ad6e98cd5134e79bc6222fe33cf0dea2060a0335760d2"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-RegistrarModule-95b198c95031e0695d177a8d11e7f5f6fb76ad0e48e1954b9e23caabf871e3de8131f9b0a0114577a27ad6e98cd5134e79bc6222fe33cf0dea2060a0335760d2"' :
                                        'id="xs-injectables-links-module-RegistrarModule-95b198c95031e0695d177a8d11e7f5f6fb76ad0e48e1954b9e23caabf871e3de8131f9b0a0114577a27ad6e98cd5134e79bc6222fe33cf0dea2060a0335760d2"' }>
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
                                            'data-bs-target="#controllers-links-module-SessionModule-0950b763035cb38154a7e3b61dab05b691847f61c997c73bc1b96c4b6b8c750f9c225d5baeb8fac4826b20f10b02b8b33e70f95397397a68df61180ef819a90a"' : 'data-bs-target="#xs-controllers-links-module-SessionModule-0950b763035cb38154a7e3b61dab05b691847f61c997c73bc1b96c4b6b8c750f9c225d5baeb8fac4826b20f10b02b8b33e70f95397397a68df61180ef819a90a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-SessionModule-0950b763035cb38154a7e3b61dab05b691847f61c997c73bc1b96c4b6b8c750f9c225d5baeb8fac4826b20f10b02b8b33e70f95397397a68df61180ef819a90a"' :
                                            'id="xs-controllers-links-module-SessionModule-0950b763035cb38154a7e3b61dab05b691847f61c997c73bc1b96c4b6b8c750f9c225d5baeb8fac4826b20f10b02b8b33e70f95397397a68df61180ef819a90a"' }>
                                            <li class="link">
                                                <a href="controllers/SessionController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SessionController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-SessionModule-0950b763035cb38154a7e3b61dab05b691847f61c997c73bc1b96c4b6b8c750f9c225d5baeb8fac4826b20f10b02b8b33e70f95397397a68df61180ef819a90a"' : 'data-bs-target="#xs-injectables-links-module-SessionModule-0950b763035cb38154a7e3b61dab05b691847f61c997c73bc1b96c4b6b8c750f9c225d5baeb8fac4826b20f10b02b8b33e70f95397397a68df61180ef819a90a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-SessionModule-0950b763035cb38154a7e3b61dab05b691847f61c997c73bc1b96c4b6b8c750f9c225d5baeb8fac4826b20f10b02b8b33e70f95397397a68df61180ef819a90a"' :
                                        'id="xs-injectables-links-module-SessionModule-0950b763035cb38154a7e3b61dab05b691847f61c997c73bc1b96c4b6b8c750f9c225d5baeb8fac4826b20f10b02b8b33e70f95397397a68df61180ef819a90a"' }>
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
                                    <a href="entities/DisplayEntity.html" data-type="entity-link" >DisplayEntity</a>
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
                                <a href="classes/DBKeyService.html" data-type="entity-link" >DBKeyService</a>
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
                                <a href="classes/LocalFileStorage.html" data-type="entity-link" >LocalFileStorage</a>
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
                                <a href="classes/RegistrationCertificateRequest.html" data-type="entity-link" >RegistrationCertificateRequest</a>
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
                                    <a href="injectables/FilesService.html" data-type="entity-link" >FilesService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LoggerConfigService.html" data-type="entity-link" >LoggerConfigService</a>
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
                                <a href="interfaces/FileStorage.html" data-type="entity-link" >FileStorage</a>
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