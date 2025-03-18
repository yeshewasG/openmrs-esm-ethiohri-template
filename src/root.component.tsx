/**
 * From here, the application is pretty typical React, but with lots of
 * support from `@openmrs/esm-framework`. Check out `Greeter` to see
 * usage of the configuration system, and check out `PatientGetter` to
 * see data fetching using the OpenMRS FHIR API.
 *
 * Check out the Config docs:
 *   https://openmrs.github.io/openmrs-esm-core/#/main/config
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './root.scss';
import { usePatient } from '@openmrs/esm-framework';
import ClientForm from './forms/kpp-follow-up-form';

const Root: React.FC = () => {
  const { t } = useTranslation();
  const patient = usePatient();
  return (
    <div className={styles.container}>
      {/* <h3 className={styles.welcome}>{t('welcomeText', 'Key and Priority Population')}</h3> */}
      <ClientForm />
    </div>
  );
};

export default Root;
