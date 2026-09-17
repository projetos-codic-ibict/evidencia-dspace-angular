import { AsyncPipe } from '@angular/common';
import {
  Component,
  OnInit,
} from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import { LangConfig } from '@dspace/config/lang-config.interface';
import { AuthenticateAction } from '@dspace/core/auth/auth.actions';
import { CoreState } from '@dspace/core/core-state.model';
import { RemoteData } from '@dspace/core/data/remote-data';
import {
  END_USER_AGREEMENT_METADATA_FIELD,
  EndUserAgreementService,
} from '@dspace/core/end-user-agreement/end-user-agreement.service';
import { EPersonDataService } from '@dspace/core/eperson/eperson-data.service';
import { EPerson } from '@dspace/core/eperson/models/eperson.model';
import { NotificationsService } from '@dspace/core/notification-system/notifications.service';
import {
  getFirstCompletedRemoteData,
  getFirstSucceededRemoteDataPayload,
  getFirstSucceededRemoteListPayload,
} from '@dspace/core/shared/operators';
import { Registration } from '@dspace/core/shared/registration.model';
import { PageInfo } from '@dspace/core/shared/page-info.model';
import { VocabularyEntry } from '@dspace/core/submission/vocabularies/models/vocabulary-entry.model';
import { VocabularyOptions } from '@dspace/core/submission/vocabularies/models/vocabulary-options.model';
import { VocabularyService } from '@dspace/core/submission/vocabularies/vocabulary.service';
import { isEmpty } from '@dspace/shared/utils/empty.util';
import { Store } from '@ngrx/store';
import {
  TranslateModule,
  TranslateService,
} from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { ProfilePageSecurityFormComponent } from '../../profile-page/profile-page-security-form/profile-page-security-form.component';
import { BtnDisabledDirective } from '../../shared/btn-disabled.directive';

/**
 * Component that renders the create profile page to be used by a user registering through a token
 */
@Component({
  selector: 'ds-base-create-profile',
  styleUrls: ['./create-profile.component.scss'],
  templateUrl: './create-profile.component.html',
  imports: [
    AsyncPipe,
    BtnDisabledDirective,
    ProfilePageSecurityFormComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
})
export class CreateProfileComponent implements OnInit {
  registration$: Observable<Registration>;

  email: string;
  token: string;

  isInValidPassword = true;
  password: string;

  userInfoForm: UntypedFormGroup;
  activeLangs: LangConfig[];

  /**
   * Prefix for the notification messages of this security form
   */
  NOTIFICATIONS_PREFIX = 'register-page.create-profile.submit.';

  institutions: VocabularyEntry[] = [];

  constructor(
    private translateService: TranslateService,
    private ePersonDataService: EPersonDataService,
    private store: Store<CoreState>,
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: UntypedFormBuilder,
    private notificationsService: NotificationsService,
    private endUserAgreementService: EndUserAgreementService,
    private vocabularyService: VocabularyService
  ) {

  }

  ngOnInit(): void {
    this.registration$ = this.route.data.pipe(
      map((data) => data.registration as RemoteData<Registration>),
      getFirstSucceededRemoteDataPayload(),
    );
    this.registration$.subscribe((registration: Registration) => {
      this.email = registration.email;
      this.token = registration.token;
    });
    this.activeLangs = environment.languages.filter((MyLangConfig) => MyLangConfig.active === true);

    this.userInfoForm = this.formBuilder.group({
      firstName: new UntypedFormControl('', {
        validators: [Validators.required],
      }),
      lastName: new UntypedFormControl('', {
        validators: [Validators.required],
      }),
      contactPhone: new UntypedFormControl(''),
      language: new UntypedFormControl(''),
      institution: new UntypedFormControl('', { 
        validators: [Validators.required] 
      })
    });

    this.vocabularyService.getVocabularyEntries(
      new VocabularyOptions('rdapp-instituicoes', 'local.instituicao', null, true),
      new PageInfo(),
    ).pipe(
      getFirstSucceededRemoteListPayload(),
    ).subscribe((entries) => {
      this.institutions = entries;
    });
  }

  /**
   * Sets the validity of the password based on a value emitted from the form
   * @param $event
   */
  setInValid($event: boolean) {
    this.isInValidPassword = $event || isEmpty(this.password);
  }

  /**
   * Sets the value of the password based on a value emitted from the form
   * @param $event
   */
  setPasswordValue($event: string) {
    this.password = $event;
    this.isInValidPassword = this.isInValidPassword || isEmpty(this.password);
  }

  get firstName() {
    return this.userInfoForm.get('firstName');
  }

  get lastName() {
    return this.userInfoForm.get('lastName');
  }

  get contactPhone() {
    return this.userInfoForm.get('contactPhone');
  }

  get language() {
    return this.userInfoForm.get('language');
  }

  get institution() {
    return this.userInfoForm.get('institution');
  }

  /**
   * Submits the eperson to the service to be created.
   * The submission will not be made when the form or the password is not valid.
   */
  submitEperson() {
    if (!(this.userInfoForm.invalid || this.isInValidPassword)) {
      const values = {
        metadata: {
          'eperson.firstname': [
            {
              value: this.firstName.value,
            },
          ],
          'eperson.lastname': [
            {
              value: this.lastName.value,
            },
          ],
          'eperson.phone': [
            {
              value: this.contactPhone.value,
            },
          ],
          'eperson.language': [
            {
              value: this.language.value,
            },
          ],
          'eperson.institution': [
            {
              value: this.institution.value,
            },
          ],
        },
        email: this.email,
        password: this.password,
        canLogIn: true,
        requireCertificate: false,
      };

      // If the End User Agreement cookie is accepted, add end-user agreement metadata to the user
      if (this.endUserAgreementService.isCookieAccepted()) {
        values.metadata[END_USER_AGREEMENT_METADATA_FIELD] = [
          {
            value: String(true),
          },
        ];
        this.endUserAgreementService.removeCookieAccepted();
      }

      const eperson = Object.assign(new EPerson(), values);
      this.ePersonDataService.createEPersonForToken(eperson, this.token).pipe(
        getFirstCompletedRemoteData(),
      ).subscribe((rd: RemoteData<EPerson>) => {
        if (rd.hasSucceeded) {
          this.notificationsService.success(this.translateService.get(this.NOTIFICATIONS_PREFIX + 'success.head'),
            this.translateService.get(this.NOTIFICATIONS_PREFIX + 'success.content'));
          this.store.dispatch(new AuthenticateAction(this.email, this.password));
          this.router.navigate(['/home']);
        } else {
          this.notificationsService.error(this.translateService.get(this.NOTIFICATIONS_PREFIX + 'error.head'), rd.errorMessage);
        }
      });
    }
  }

}