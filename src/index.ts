import { getAsyncLifecycle, defineConfigSchema, getSyncLifecycle } from '@openmrs/esm-framework';
import { configSchema } from './config-schema';
import { createDashboardLink } from '@openmrs/esm-patient-common-lib';
import { dashboardMeta } from './dashboard.meta';
import HivCareAndTreatmentSummary from './components/hiv-care-and-treatment.component';

const moduleName = '@openmrs/esm-ethio-hiv';

const options = {
  featureName: 'hiv-care-and-treatment',
  moduleName,
};

export const importTranslation = require.context('../translations', false, /.json$/, 'lazy');


export function startupApp() {
  defineConfigSchema(moduleName, configSchema);
}


export const root = getAsyncLifecycle(() => import('./root.component'), options);
export const testPage = getAsyncLifecycle(() => import('./page.component'), options);

export const hivCareAndTreatmentDetailedSummary = getSyncLifecycle(HivCareAndTreatmentSummary, options);



//Care & treatment dashboard link
export const hivCareAndTreatmentDashboardLink = getSyncLifecycle(
  createDashboardLink({
    ...dashboardMeta,
    moduleName,
  }),
  options,
);
